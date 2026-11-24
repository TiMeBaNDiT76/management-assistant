import { and, asc, count, eq, isNotNull, sql } from "drizzle-orm";
import type { AppDatabase } from "@mgmt/shared";
import {
  actionItems,
  conversations,
  employeeRelationships,
  employees,
  ensureDefaultMasterData,
  isMasterDataCategory,
  masterDataEntries,
} from "@mgmt/shared";
import type {
  ListMasterDataEntriesInput,
  MasterDataCategory,
  MasterDataEntry,
  MasterDataEntryWithUsage,
  NewMasterDataEntry,
} from "@mgmt/shared";

/** Aggregated referencing rows for one category, keyed by lowercased value. */
type UsageByLowerValue = Map<string, number>;

/**
 * Master data repository. Every method takes the tenant id (`ownerUserId`)
 * explicitly and scopes all queries to it (strict tenant isolation).
 */
export class MasterDataRepository {
  constructor(private readonly db: AppDatabase) {}

  async create(data: NewMasterDataEntry): Promise<MasterDataEntry> {
    const [row] = await this.db
      .insert(masterDataEntries)
      .values({
        ...data,
        createdAt: data.createdAt ?? new Date().toISOString(),
        updatedAt: data.updatedAt ?? new Date().toISOString(),
      })
      .returning();
    if (!row) throw new Error("Master data insert returned no row");
    return row;
  }

  /** Seeds per-tenant defaults for untouched categories (idempotent, no-op otherwise). */
  async ensureDefaults(ownerUserId: string): Promise<void> {
    await ensureDefaultMasterData(this.db, ownerUserId);
  }

  async list(
    ownerUserId: string,
    options: ListMasterDataEntriesInput,
  ): Promise<MasterDataEntry[]> {
    const conditions = [
      eq(masterDataEntries.ownerUserId, ownerUserId),
      eq(masterDataEntries.category, options.category),
    ];
    if (!options.includeInactive) {
      conditions.push(eq(masterDataEntries.isActive, true));
    }
    return this.db
      .select()
      .from(masterDataEntries)
      .where(and(...conditions))
      .orderBy(asc(masterDataEntries.sortOrder), sql`${masterDataEntries.displayName} COLLATE NOCASE`)
      .limit(1000)
      .offset(0);
  }

  async findById(ownerUserId: string, id: string): Promise<MasterDataEntry | null> {
    const [row] = await this.db
      .select()
      .from(masterDataEntries)
      .where(and(eq(masterDataEntries.id, id), eq(masterDataEntries.ownerUserId, ownerUserId)))
      .limit(1);
    return row ?? null;
  }

  async findByKey(
    ownerUserId: string,
    category: MasterDataCategory,
    key: string,
  ): Promise<MasterDataEntry | null> {
    const [row] = await this.db
      .select()
      .from(masterDataEntries)
      .where(
        and(
          eq(masterDataEntries.ownerUserId, ownerUserId),
          eq(masterDataEntries.category, category),
          eq(masterDataEntries.key, key),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  /** Case-insensitive duplicate check for display names within one tenant+category. */
  async findByDisplayName(
    ownerUserId: string,
    category: MasterDataCategory,
    displayName: string,
  ): Promise<MasterDataEntry | null> {
    const [row] = await this.db
      .select()
      .from(masterDataEntries)
      .where(
        and(
          eq(masterDataEntries.ownerUserId, ownerUserId),
          eq(masterDataEntries.category, category),
          sql`lower(${masterDataEntries.displayName}) = lower(${displayName})`,
        ),
      )
      .limit(1);
    return row ?? null;
  }

  /** Next free `sort_order` for a category (max + 10), used to append entries. */
  async nextSortOrder(ownerUserId: string, category: MasterDataCategory): Promise<number> {
    const [row] = await this.db
      .select({ max: sql<number | null>`max(${masterDataEntries.sortOrder})` })
      .from(masterDataEntries)
      .where(
        and(
          eq(masterDataEntries.ownerUserId, ownerUserId),
          eq(masterDataEntries.category, category),
        ),
      );
    return (row?.max ?? 0) + 10;
  }

  async update(
    ownerUserId: string,
    id: string,
    patch: Partial<NewMasterDataEntry>,
  ): Promise<MasterDataEntry | null> {
    const [row] = await this.db
      .update(masterDataEntries)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(eq(masterDataEntries.id, id), eq(masterDataEntries.ownerUserId, ownerUserId)))
      .returning();
    return row ?? null;
  }

  async remove(ownerUserId: string, id: string): Promise<boolean> {
    const result = await this.db
      .delete(masterDataEntries)
      .where(and(eq(masterDataEntries.id, id), eq(masterDataEntries.ownerUserId, ownerUserId)))
      .run();
    return result.changes > 0;
  }

  // --- Usage counts ("Verwendet von") ---------------------------------------

  /**
   * Cross-table usage counts for a whole category. Rows are grouped by the raw
   * referencing value in SQLite and merged case-insensitively in JS (SQLite's
   * `lower()` only folds ASCII, while display names contain umlauts).
   */
  async usageCounts(
    ownerUserId: string,
    category: MasterDataCategory,
  ): Promise<UsageByLowerValue> {
    const usage: UsageByLowerValue = new Map();
    const accumulate = (rows: Array<{ value: string | null; n: number }>): void => {
      for (const row of rows) {
        if (row.value === null || row.value === "") continue;
        const lower = row.value.toLowerCase();
        usage.set(lower, (usage.get(lower) ?? 0) + row.n);
      }
    };

    switch (category) {
      case "role":
      case "department":
      case "location": {
        const column =
          category === "role"
            ? employees.role
            : category === "department"
              ? employees.department
              : employees.location;
        const rows = await this.db
          .select({ value: column, n: count() })
          .from(employees)
          .where(and(eq(employees.ownerUserId, ownerUserId), isNotNull(column)))
          .groupBy(column);
        accumulate(rows);
        break;
      }
      case "relationship_type": {
        const rows = await this.db
          .select({ value: employeeRelationships.type, n: count() })
          .from(employeeRelationships)
          .where(eq(employeeRelationships.ownerUserId, ownerUserId))
          .groupBy(employeeRelationships.type);
        accumulate(rows);
        break;
      }
      case "appointment_type": {
        const rows = await this.db
          .select({ value: conversations.type, n: count() })
          .from(conversations)
          .where(eq(conversations.ownerUserId, ownerUserId))
          .groupBy(conversations.type);
        accumulate(rows);
        break;
      }
      case "task_status": {
        const rows = await this.db
          .select({ value: actionItems.status, n: count() })
          .from(actionItems)
          .where(eq(actionItems.ownerUserId, ownerUserId))
          .groupBy(actionItems.status);
        accumulate(rows);
        break;
      }
      case "country":
      case "holiday":
        // Nothing references these categories yet.
        break;
    }
    return usage;
  }

  /**
   * Attaches usage counts to the given entries. An entry is "used" when the
   * referencing column equals its machine `key` (enum-backed categories) or
   * its display name case-insensitively (free-text columns like
   * `employees.role` may hold either).
   */
  async withUsageCounts(
    ownerUserId: string,
    entries: MasterDataEntry[],
  ): Promise<MasterDataEntryWithUsage[]> {
    const usageByCategory = new Map<MasterDataCategory, UsageByLowerValue>();
    for (const entry of entries) {
      if (!isMasterDataCategory(entry.category)) continue;
      if (!usageByCategory.has(entry.category)) {
        usageByCategory.set(entry.category, await this.usageCounts(ownerUserId, entry.category));
      }
    }
    return entries.map((entry) => {
      const usage =
        (isMasterDataCategory(entry.category)
          ? usageByCategory.get(entry.category)
          : undefined) ?? new Map<string, number>();
      const lowerName = entry.displayName.toLowerCase();
      // Avoid double counting when key and (lowercased) display name coincide.
      const byName = lowerName === entry.key ? 0 : (usage.get(lowerName) ?? 0);
      return { ...entry, usageCount: (usage.get(entry.key) ?? 0) + byName };
    });
  }
}

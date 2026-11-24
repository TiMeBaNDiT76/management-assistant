import { TRPCError } from "@trpc/server";
import { isMasterDataCategory, slugifyKey } from "@mgmt/shared";
import type {
  ListMasterDataEntriesInput,
  MasterDataEntry,
  MasterDataEntryCreateInput,
  MasterDataEntryUpdateInput,
  MasterDataEntryWithUsage,
} from "@mgmt/shared";
import type { MasterDataRepository } from "./repository";

/**
 * Master data (Stammdaten) domain service: business rules on top of the
 * repository. Throws tRPC errors that the router surfaces to the client as-is.
 */
export class MasterDataService {
  constructor(private readonly repo: MasterDataRepository) {}

  async list(
    ownerUserId: string,
    input: ListMasterDataEntriesInput,
  ): Promise<MasterDataEntryWithUsage[]> {
    await this.repo.ensureDefaults(ownerUserId);
    const entries = await this.repo.list(ownerUserId, input);
    return this.repo.withUsageCounts(ownerUserId, entries);
  }

  async get(ownerUserId: string, id: string): Promise<MasterDataEntryWithUsage> {
    await this.repo.ensureDefaults(ownerUserId);
    const entry = await this.repo.findById(ownerUserId, id);
    if (!entry) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Master data entry ${id} not found` });
    }
    const [withUsage] = await this.repo.withUsageCounts(ownerUserId, [entry]);
    if (!withUsage) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return withUsage;
  }

  async create(ownerUserId: string, input: MasterDataEntryCreateInput): Promise<MasterDataEntry> {
    const key = input.key ?? slugifyKey(input.displayName);

    const sameName = await this.repo.findByDisplayName(
      ownerUserId,
      input.category,
      input.displayName,
    );
    if (sameName) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `An entry with the name "${sameName.displayName}" already exists in this category`,
      });
    }
    const sameKey = await this.repo.findByKey(ownerUserId, input.category, key);
    if (sameKey) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `An entry with the key "${key}" already exists in this category`,
      });
    }

    const sortOrder = input.sortOrder ?? (await this.repo.nextSortOrder(ownerUserId, input.category));
    return this.repo.create({
      ...normalize(input),
      key,
      sortOrder,
      id: crypto.randomUUID(),
      ownerUserId,
    });
  }

  async update(
    ownerUserId: string,
    id: string,
    input: MasterDataEntryUpdateInput,
  ): Promise<MasterDataEntry> {
    const entry = await this.repo.findById(ownerUserId, id);
    if (!entry) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Master data entry ${id} not found` });
    }
    // `key` and `category` are immutable; `displayName` may be renamed but must
    // stay unique (case-insensitive) within the tenant+category.
    if (
      input.displayName &&
      isMasterDataCategory(entry.category) &&
      input.displayName.toLowerCase() !== entry.displayName.toLowerCase()
    ) {
      const sameName = await this.repo.findByDisplayName(
        ownerUserId,
        entry.category,
        input.displayName,
      );
      if (sameName && sameName.id !== id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `An entry with the name "${sameName.displayName}" already exists in this category`,
        });
      }
    }
    const updated = await this.repo.update(ownerUserId, id, normalize(input));
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return updated;
  }

  async deactivate(ownerUserId: string, id: string): Promise<MasterDataEntry> {
    return this.setActive(ownerUserId, id, false);
  }

  async activate(ownerUserId: string, id: string): Promise<MasterDataEntry> {
    return this.setActive(ownerUserId, id, true);
  }

  /**
   * Hard delete — only allowed when nothing references the entry. Entries that
   * are in use must be deactivated instead (reference protection).
   */
  async remove(ownerUserId: string, id: string): Promise<boolean> {
    const entry = await this.repo.findById(ownerUserId, id);
    if (!entry) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Master data entry ${id} not found` });
    }
    const [withUsage] = await this.repo.withUsageCounts(ownerUserId, [entry]);
    if (withUsage && withUsage.usageCount > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message:
          `Entry is used by ${withUsage.usageCount} record(s) and cannot be deleted — ` +
          "deactivate it instead",
      });
    }
    const removed = await this.repo.remove(ownerUserId, id);
    if (!removed) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Master data entry ${id} not found` });
    }
    return removed;
  }

  private async setActive(
    ownerUserId: string,
    id: string,
    isActive: boolean,
  ): Promise<MasterDataEntry> {
    const entry = await this.repo.findById(ownerUserId, id);
    if (!entry) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Master data entry ${id} not found` });
    }
    const updated = await this.repo.update(ownerUserId, id, { isActive });
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return updated;
  }
}

/**
 * Normalizes optional fields: empty strings become explicit `null`s and the
 * country code is stored as uppercase ISO 3166-1 alpha-2. `displayName` is
 * trimmed but never nulled (NOT NULL column).
 */
function normalize<T extends Partial<MasterDataEntryCreateInput> & Record<string, unknown>>(
  input: T,
): T {
  const normalized: Record<string, unknown> = { ...input };
  for (const field of ["pluralLabel", "description", "colorHex", "frequency", "scope", "date"] as const) {
    if (typeof normalized[field] === "string" && (normalized[field] as string).trim() === "") {
      normalized[field] = null;
    }
  }
  if (typeof normalized.displayName === "string") {
    normalized.displayName = normalized.displayName.trim();
  }
  if (typeof normalized.countryIso === "string") {
    normalized.countryIso = normalized.countryIso.toUpperCase();
  }
  return normalized as T;
}

import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabaseHandle, MasterDataCategory } from "@mgmt/shared";
import {
  MASTER_DATA_CATEGORIES,
  MASTER_DATA_SEEDS,
  actionItems,
  conversations,
  employeeRelationships,
  employees,
  initializeDatabase,
} from "@mgmt/shared";
import { MasterDataRepository } from "./repository";

const OWNER_A = "owner-a";
const OWNER_B = "tenant-b";

let handle: AppDatabaseHandle;
let repo: MasterDataRepository;

beforeEach(() => {
  handle = initializeDatabase();
  repo = new MasterDataRepository(handle.db);
});

/** Number of seed rows per category (derived from the seed dataset itself). */
function seedCount(category: MasterDataCategory): number {
  return MASTER_DATA_SEEDS.filter((seed) => seed.category === category).length;
}

async function insertEmployee(
  owner: string,
  fields: { role?: string; department?: string; location?: string } = {},
): Promise<string> {
  const id = crypto.randomUUID();
  await handle.db.insert(employees).values({
    id,
    ownerUserId: owner,
    firstName: "Test",
    lastName: "Person",
    role: fields.role ?? null,
    department: fields.department ?? null,
    location: fields.location ?? null,
  });
  return id;
}

describe("MasterDataRepository – seeding", () => {
  it("seeds all 8 categories for a fresh tenant exactly once", async () => {
    await repo.ensureDefaults(OWNER_A);
    for (const category of MASTER_DATA_CATEGORIES) {
      const entries = await repo.list(OWNER_A, { category, includeInactive: true });
      expect(entries).toHaveLength(seedCount(category));
      expect(entries.every((entry) => entry.ownerUserId === OWNER_A)).toBe(true);
    }
  });

  it("is idempotent — calling ensureDefaults twice does not duplicate rows", async () => {
    await repo.ensureDefaults(OWNER_A);
    await repo.ensureDefaults(OWNER_A);
    const roles = await repo.list(OWNER_A, { category: "role", includeInactive: true });
    expect(roles).toHaveLength(seedCount("role"));
  });

  it("gives each tenant its own seed set in the same database", async () => {
    await repo.ensureDefaults(OWNER_A);
    await repo.ensureDefaults(OWNER_B);
    const forA = await repo.list(OWNER_A, { category: "role", includeInactive: true });
    const forB = await repo.list(OWNER_B, { category: "role", includeInactive: true });
    expect(forA).toHaveLength(seedCount("role"));
    expect(forB).toHaveLength(seedCount("role"));
    expect(forA.map((entry) => entry.id)).not.toEqual(forB.map((entry) => entry.id));
  });

  it("sorts by sortOrder ascending, then display name case-insensitively", async () => {
    await repo.ensureDefaults(OWNER_A);
    const roles = await repo.list(OWNER_A, { category: "role", includeInactive: true });
    expect(roles.map((entry) => entry.displayName)).toEqual([
      "Teamleitung",
      "Teammitglied",
      "Extern",
    ]);
  });
});

describe("MasterDataRepository – tenant isolation", () => {
  let tenantAEntryId: string;

  beforeEach(async () => {
    await repo.ensureDefaults(OWNER_A);
    const entry = await repo.findByKey(OWNER_A, "department", "vertrieb");
    if (!entry) throw new Error("seed entry 'vertrieb' not found");
    tenantAEntryId = entry.id;
  });

  it("findById does not return another tenant's entry", async () => {
    expect(await repo.findById(OWNER_A, tenantAEntryId)).not.toBeNull();
    expect(await repo.findById(OWNER_B, tenantAEntryId)).toBeNull();
  });

  it("update does not touch another tenant's entry", async () => {
    const updated = await repo.update(OWNER_B, tenantAEntryId, { displayName: "Hacked" });
    expect(updated).toBeNull();
    const untouched = await repo.findById(OWNER_A, tenantAEntryId);
    expect(untouched?.displayName).toBe("Vertrieb");
  });

  it("remove does not delete another tenant's entry", async () => {
    await expect(repo.remove(OWNER_B, tenantAEntryId)).resolves.toBe(false);
    expect(await repo.findById(OWNER_A, tenantAEntryId)).not.toBeNull();
  });

  it("findByKey and findByDisplayName are scoped to the tenant", async () => {
    expect(await repo.findByKey(OWNER_B, "department", "vertrieb")).toBeNull();
    expect(await repo.findByDisplayName(OWNER_B, "department", "Vertrieb")).toBeNull();
    expect(await repo.findByKey(OWNER_A, "department", "vertrieb")).not.toBeNull();
    expect(await repo.findByDisplayName(OWNER_A, "department", "vertrieb")).not.toBeNull();
  });

  it("list only returns the requesting tenant's rows", async () => {
    const forB = await repo.list(OWNER_B, { category: "department", includeInactive: true });
    expect(forB.map((entry) => entry.key)).not.toContain("vertrieb");
  });
});

describe("MasterDataRepository – lookups and helpers", () => {
  beforeEach(async () => {
    await repo.ensureDefaults(OWNER_A);
  });

  it("findByDisplayName matches case-insensitively (ASCII folding via SQLite lower)", async () => {
    const found = await repo.findByDisplayName(OWNER_A, "department", "vErTrIeB");
    expect(found?.key).toBe("vertrieb");
  });

  it("nextSortOrder returns max + 10 (10 for an empty category)", async () => {
    expect(await repo.nextSortOrder(OWNER_A, "role")).toBe(40); // seeds 10/20/30
    await repo.create({
      id: crypto.randomUUID(),
      ownerUserId: OWNER_A,
      category: "role",
      key: "beratung",
      displayName: "Beratung",
      sortOrder: 40,
      isDone: false,
      isActive: true,
    });
    expect(await repo.nextSortOrder(OWNER_A, "role")).toBe(50);
  });

  it("update touches updatedAt and returns null for a missing id", async () => {
    const [entry] = await repo.list(OWNER_A, { category: "role", includeInactive: true });
    const updated = await repo.update(OWNER_A, entry.id, { description: "Neu" });
    expect(updated?.description).toBe("Neu");
    expect(updated!.updatedAt >= entry.updatedAt).toBe(true);
    expect(await repo.update(OWNER_A, "does-not-exist", { description: "x" })).toBeNull();
  });

  it("remove deletes only the tenant's own row", async () => {
    const created = await repo.create({
      id: crypto.randomUUID(),
      ownerUserId: OWNER_A,
      category: "role",
      key: "wegdamit",
      displayName: "Weg damit",
      sortOrder: 100,
      isDone: false,
      isActive: true,
    });
    await expect(repo.remove(OWNER_A, created.id)).resolves.toBe(true);
    await expect(repo.remove(OWNER_A, created.id)).resolves.toBe(false);
  });
});

describe("MasterDataRepository – usage counts", () => {
  beforeEach(async () => {
    await repo.ensureDefaults(OWNER_A);
  });

  it("counts employees referencing a role entry by key and by display name", async () => {
    // "teamleitung" matches the machine key, "Teamleitung" the display name.
    await insertEmployee(OWNER_A, { role: "teamleitung" });
    await insertEmployee(OWNER_A, { role: "Teamleitung" });

    const entries = await repo.list(OWNER_A, { category: "role", includeInactive: true });
    const withUsage = await repo.withUsageCounts(OWNER_A, entries);
    const teamleitung = withUsage.find((entry) => entry.key === "teamleitung");
    // Merged in JS — SQLite lower() folds ASCII, so both spellings group as
    // "teamleitung" after JS lowercasing; the double-count guard (key ===
    // lower(displayName)) keeps it at 2, not 4.
    expect(teamleitung?.usageCount).toBe(2);
  });

  it("does not let another tenant's referencing rows inflate the usage count", async () => {
    await insertEmployee(OWNER_A, { role: "Extern" });
    await insertEmployee(OWNER_B, { role: "Extern" });

    const entries = await repo.list(OWNER_A, { category: "role", includeInactive: true });
    const withUsage = await repo.withUsageCounts(OWNER_A, entries);
    expect(withUsage.find((entry) => entry.key === "extern")?.usageCount).toBe(1);
  });

  it("merges umlaut spellings case-insensitively in JS (SQLite lower() folds ASCII only)", async () => {
    // Grouped as two distinct raw values in SQLite, folded to one bucket in JS.
    await insertEmployee(OWNER_A, { location: "Köln" });
    await insertEmployee(OWNER_A, { location: "köln" });

    const entry = await repo.create({
      id: crypto.randomUUID(),
      ownerUserId: OWNER_A,
      category: "location",
      key: "koeln",
      displayName: "Köln",
      sortOrder: 100,
      isDone: false,
      isActive: true,
    });
    const [withUsage] = await repo.withUsageCounts(OWNER_A, [entry]);
    expect(withUsage?.usageCount).toBe(2);
  });

  it("guards against double counting when key === lower(displayName)", async () => {
    const entry = await repo.create({
      id: crypto.randomUUID(),
      ownerUserId: OWNER_A,
      category: "department",
      key: "alpha",
      displayName: "Alpha",
      sortOrder: 100,
      isDone: false,
      isActive: true,
    });
    await insertEmployee(OWNER_A, { department: "alpha" });
    const [withUsage] = await repo.withUsageCounts(OWNER_A, [entry]);
    // Same row matches key and display name — counted once, not twice.
    expect(withUsage?.usageCount).toBe(1);
  });

  it("sums key matches and display-name matches from different rows", async () => {
    const entry = await repo.create({
      id: crypto.randomUUID(),
      ownerUserId: OWNER_A,
      category: "department",
      key: "alpha",
      displayName: "Beta",
      sortOrder: 100,
      isDone: false,
      isActive: true,
    });
    await insertEmployee(OWNER_A, { department: "alpha" }); // matches key
    await insertEmployee(OWNER_A, { department: "BETA" }); // matches name
    const [withUsage] = await repo.withUsageCounts(OWNER_A, [entry]);
    expect(withUsage?.usageCount).toBe(2);
  });

  it("counts relationship types from employee_relationships", async () => {
    const a = await insertEmployee(OWNER_A);
    const b = await insertEmployee(OWNER_A);
    await handle.db.insert(employeeRelationships).values([
      { id: crypto.randomUUID(), ownerUserId: OWNER_A, fromEmployeeId: b, toEmployeeId: a, type: "peer" },
      { id: crypto.randomUUID(), ownerUserId: OWNER_A, fromEmployeeId: a, toEmployeeId: b, type: "Peer" },
      { id: crypto.randomUUID(), ownerUserId: OWNER_A, fromEmployeeId: a, toEmployeeId: b, type: "reports_to" },
    ]);

    const entries = await repo.list(OWNER_A, {
      category: "relationship_type",
      includeInactive: true,
    });
    const withUsage = await repo.withUsageCounts(OWNER_A, entries);
    const byKey = Object.fromEntries(withUsage.map((entry) => [entry.key, entry.usageCount]));
    expect(byKey["peer"]).toBe(2); // "peer" + "Peer" merged case-insensitively
    expect(byKey["reports_to"]).toBe(1);
    expect(byKey["mentor"]).toBe(0);
  });

  it("counts appointment types from conversations", async () => {
    const employeeId = await insertEmployee(OWNER_A);
    await handle.db.insert(conversations).values([
      {
        id: crypto.randomUUID(),
        ownerUserId: OWNER_A,
        employeeId,
        scheduledAt: "2026-04-01T09:00:00Z",
        type: "feedback",
      },
      {
        id: crypto.randomUUID(),
        ownerUserId: OWNER_A,
        employeeId,
        scheduledAt: "2026-04-02T09:00:00Z",
        type: "one_on_one",
      },
    ]);

    const entries = await repo.list(OWNER_A, {
      category: "appointment_type",
      includeInactive: true,
    });
    const withUsage = await repo.withUsageCounts(OWNER_A, entries);
    const byKey = Object.fromEntries(withUsage.map((entry) => [entry.key, entry.usageCount]));
    expect(byKey["feedback"]).toBe(1);
    expect(byKey["one_on_one"]).toBe(1);
    expect(byKey["career"]).toBe(0);
  });

  it("counts task statuses from action_items", async () => {
    await handle.db.insert(actionItems).values([
      { id: crypto.randomUUID(), ownerUserId: OWNER_A, title: "A", status: "in_progress" },
      { id: crypto.randomUUID(), ownerUserId: OWNER_A, title: "B", status: "open" },
      { id: crypto.randomUUID(), ownerUserId: OWNER_A, title: "C", status: "done" },
    ]);

    const entries = await repo.list(OWNER_A, { category: "task_status", includeInactive: true });
    const withUsage = await repo.withUsageCounts(OWNER_A, entries);
    const byKey = Object.fromEntries(withUsage.map((entry) => [entry.key, entry.usageCount]));
    expect(byKey["open"]).toBe(1);
    expect(byKey["in_progress"]).toBe(1);
    expect(byKey["done"]).toBe(1);
    expect(byKey["cancelled"]).toBe(0);
  });

  it("ignores empty referencing values", async () => {
    await insertEmployee(OWNER_A, { role: "" });
    const entries = await repo.list(OWNER_A, { category: "role", includeInactive: true });
    const withUsage = await repo.withUsageCounts(OWNER_A, entries);
    expect(withUsage.every((entry) => entry.usageCount === 0)).toBe(true);
  });

  it("always reports zero usage for country and holiday entries", async () => {
    await insertEmployee(OWNER_A, { role: "de" }); // coincidental same string
    for (const category of ["country", "holiday"] as const) {
      const entries = await repo.list(OWNER_A, { category, includeInactive: true });
      const withUsage = await repo.withUsageCounts(OWNER_A, entries);
      expect(withUsage.length).toBeGreaterThan(0);
      expect(withUsage.every((entry) => entry.usageCount === 0)).toBe(true);
    }
  });

  it("scopes usage counts to the requesting tenant", async () => {
    await insertEmployee(OWNER_B, { role: "Teamleitung" });
    const entriesA = await repo.list(OWNER_A, { category: "role", includeInactive: true });
    const [a] = await repo.withUsageCounts(
      OWNER_A,
      entriesA.filter((entry) => entry.key === "teamleitung"),
    );
    expect(a?.usageCount).toBe(0);
  });
});

describe("MasterDataRepository – includeInactive", () => {
  it("excludes deactivated entries unless includeInactive is set", async () => {
    await repo.ensureDefaults(OWNER_A);
    const entries = await repo.list(OWNER_A, { category: "role", includeInactive: true });
    const extern = entries.find((entry) => entry.key === "extern");
    expect(extern).toBeDefined();
    await repo.update(OWNER_A, extern!.id, { isActive: false });

    const activeOnly = await repo.list(OWNER_A, { category: "role", includeInactive: false });
    expect(activeOnly.map((entry) => entry.key)).not.toContain("extern");

    const all = await repo.list(OWNER_A, { category: "role", includeInactive: true });
    expect(all).toHaveLength(seedCount("role"));
  });
});

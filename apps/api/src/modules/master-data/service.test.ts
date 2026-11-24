import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { AppDatabaseHandle, MasterDataCategory } from "@mgmt/shared";
import {
  MASTER_DATA_CATEGORIES,
  MASTER_DATA_SEEDS,
  employees,
  initializeDatabase,
} from "@mgmt/shared";
import { MasterDataRepository } from "./repository";
import { MasterDataService } from "./service";

const OWNER_A = "owner-a";
const OWNER_B = "tenant-b";

let handle: AppDatabaseHandle;
let repo: MasterDataRepository;
let service: MasterDataService;

beforeEach(() => {
  handle = initializeDatabase();
  repo = new MasterDataRepository(handle.db);
  service = new MasterDataService(repo);
});

function seedCount(category: MasterDataCategory): number {
  return MASTER_DATA_SEEDS.filter((seed) => seed.category === category).length;
}

/** Triggers the per-tenant seeding (which only `list`/`get` do implicitly). */
async function seedTenant(owner: string = OWNER_A): Promise<void> {
  for (const category of MASTER_DATA_CATEGORIES) {
    await service.list(owner, { category, includeInactive: true });
  }
}

async function createRole(displayName: string, input: { key?: string } = {}) {
  return service.create(OWNER_A, { category: "role", displayName, ...input });
}

async function insertEmployee(
  owner: string,
  fields: { role?: string; department?: string } = {},
): Promise<string> {
  const id = crypto.randomUUID();
  await handle.db.insert(employees).values({
    id,
    ownerUserId: owner,
    firstName: "Test",
    lastName: "Person",
    role: fields.role ?? null,
    department: fields.department ?? null,
  });
  return id;
}

describe("MasterDataService – list & seeding", () => {
  it("seeds defaults on first list and reports zero usage for untouched data", async () => {
    for (const category of MASTER_DATA_CATEGORIES) {
      const entries = await service.list(OWNER_A, { category, includeInactive: true });
      expect(entries).toHaveLength(seedCount(category));
      for (const entry of entries) {
        expect(entry.usageCount).toBe(0);
        expect(entry.isActive).toBe(true);
      }
    }
  });

  it("seeds enum-backed keys mirroring the existing constants (isDone only on done)", async () => {
    const relationshipTypes = await service.list(OWNER_A, {
      category: "relationship_type",
      includeInactive: true,
    });
    expect(relationshipTypes.map((entry) => entry.key)).toEqual([
      "reports_to",
      "peer",
      "stakeholder",
      "mentor",
      "informal",
    ]);

    const appointmentTypes = await service.list(OWNER_A, {
      category: "appointment_type",
      includeInactive: true,
    });
    expect(appointmentTypes.map((entry) => entry.key)).toEqual([
      "one_on_one",
      "feedback",
      "career",
      "adhoc",
    ]);

    const taskStatuses = await service.list(OWNER_A, {
      category: "task_status",
      includeInactive: true,
    });
    expect(taskStatuses.map((entry) => entry.key)).toEqual([
      "open",
      "in_progress",
      "done",
      "cancelled",
    ]);
    expect(taskStatuses.filter((entry) => entry.isDone).map((entry) => entry.key)).toEqual([
      "done",
    ]);
  });

  it("does not re-seed on repeated lists (idempotent)", async () => {
    const first = await service.list(OWNER_A, { category: "role", includeInactive: true });
    const second = await service.list(OWNER_A, { category: "role", includeInactive: true });
    expect(second.map((entry) => entry.id)).toEqual(first.map((entry) => entry.id));
    expect(second).toHaveLength(seedCount("role"));
  });

  it("does not re-seed a category the tenant has renamed", async () => {
    await seedTenant();
    const roles = await service.list(OWNER_A, { category: "role", includeInactive: true });
    const teamleitung = roles.find((entry) => entry.key === "teamleitung");
    expect(teamleitung).toBeDefined();
    await service.update(OWNER_A, teamleitung!.id, { displayName: "Leitung" });

    const afterRename = await service.list(OWNER_A, { category: "role", includeInactive: true });
    expect(afterRename).toHaveLength(seedCount("role"));
    expect(afterRename.map((entry) => entry.displayName)).toContain("Leitung");
  });

  it("re-seeds a category only after the tenant removed every entry of it", async () => {
    await seedTenant();
    const roles = await service.list(OWNER_A, { category: "role", includeInactive: true });
    for (const entry of roles) {
      await service.remove(OWNER_A, entry.id);
    }
    // Raw repository query — `list` on the service would re-seed immediately.
    const direct = await repo.list(OWNER_A, { category: "role", includeInactive: true });
    expect(direct).toHaveLength(0);

    const reseeded = await service.list(OWNER_A, { category: "role", includeInactive: true });
    expect(reseeded).toHaveLength(seedCount("role"));
  });

  it("excludes deactivated entries unless includeInactive is set", async () => {
    await seedTenant();
    const roles = await service.list(OWNER_A, { category: "role", includeInactive: true });
    const extern = roles.find((entry) => entry.key === "extern");
    expect(extern).toBeDefined();
    await service.deactivate(OWNER_A, extern!.id);

    const activeOnly = await service.list(OWNER_A, { category: "role", includeInactive: false });
    expect(activeOnly.map((entry) => entry.key)).not.toContain("extern");

    const all = await service.list(OWNER_A, { category: "role", includeInactive: true });
    expect(all).toHaveLength(seedCount("role"));
  });
});

describe("MasterDataService – create", () => {
  it("slugifies the display name with German umlaut transliteration", async () => {
    const created = await createRole("Köln Filiale");
    expect(created.key).toBe("koeln-filiale");
    expect(created.category).toBe("role");
    expect(created.isActive).toBe(true);
    expect(created.isDone).toBe(false);
  });

  it("transliterates ß and umlauts in the same name", async () => {
    const created = await createRole("Außendienst Süd");
    expect(created.key).toBe("aussendienst-sued");
  });

  it("respects an explicit key", async () => {
    const created = await createRole("Consulting", { key: "consulting" });
    expect(created.key).toBe("consulting");
  });

  it("trims the display name and stores empty optional strings as null", async () => {
    const created = await service.create(OWNER_A, {
      category: "department",
      displayName: "  IT  ",
      description: "   ",
      pluralLabel: "",
    });
    expect(created.displayName).toBe("IT");
    expect(created.description).toBeNull();
    expect(created.pluralLabel).toBeNull();
  });

  it("uppercases the country ISO code", async () => {
    const created = await service.create(OWNER_A, {
      category: "country",
      displayName: "Frankreich",
      countryIso: "fr",
    });
    expect(created.countryIso).toBe("FR");
  });

  it("auto-appends sortOrder (max + 10) when omitted", async () => {
    await seedTenant(); // role seeds use sortOrder 10/20/30
    const first = await createRole("Beratung");
    expect(first.sortOrder).toBe(40);
    const second = await createRole("Operations");
    expect(second.sortOrder).toBe(50);
  });

  it("rejects a duplicate key within the same category with CONFLICT", async () => {
    await createRole("Alpha", { key: "alpha" });
    await expect(createRole("Alpha Clone", { key: "alpha" })).rejects.toThrow(TRPCError);
    await expect(createRole("Alpha Clone", { key: "alpha" })).rejects.toThrowError(/alpha/);
  });

  it("rejects a key colliding with a seed entry with CONFLICT", async () => {
    await seedTenant();
    await expect(createRole("Neu", { key: "teamleitung" })).rejects.toThrowError(
      /already exists/i,
    );
  });

  it("rejects a duplicate display name case-insensitively with CONFLICT", async () => {
    await seedTenant();
    // "Vertrieb" is a seeded department name.
    await expect(
      service.create(OWNER_A, { category: "department", displayName: "vertrieb" }),
    ).rejects.toThrowError(/already exists/i);
  });

  it("allows the same key and display name in other categories and tenants", async () => {
    await createRole("Sonderrolle", { key: "sonder" });
    await expect(
      service.create(OWNER_A, { category: "location", displayName: "Sonderrolle", key: "sonder" }),
    ).resolves.toBeDefined();
    await expect(
      service.create(OWNER_B, { category: "role", displayName: "Sonderrolle", key: "sonder" }),
    ).resolves.toBeDefined();
  });
});

describe("MasterDataService – get", () => {
  it("returns a single entry with its usage count", async () => {
    const created = await createRole("Projektleitung");
    await insertEmployee(OWNER_A, { role: "Projektleitung" });

    const fetched = await service.get(OWNER_A, created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.key).toBe("projektleitung");
    expect(fetched.usageCount).toBe(1);
  });

  it("throws NOT_FOUND for missing or foreign ids", async () => {
    const created = await createRole("Einzelgänger");
    await expect(service.get(OWNER_A, crypto.randomUUID())).rejects.toThrow(TRPCError);
    await expect(service.get(OWNER_A, "not-a-uuid")).rejects.toThrow(TRPCError);
    // Tenant B cannot see tenant A's entry.
    await expect(service.get(OWNER_B, created.id)).rejects.toThrow(TRPCError);
  });
});

describe("MasterDataService – update", () => {
  it("renames the display name but keeps the key stable", async () => {
    const created = await createRole("Altname");
    const updated = await service.update(OWNER_A, created.id, { displayName: "Neuname" });
    expect(updated.displayName).toBe("Neuname");
    expect(updated.key).toBe("altname");
  });

  it("keeps the display name when nothing changes (no false conflict)", async () => {
    const created = await createRole("Bleibt");
    await expect(
      service.update(OWNER_A, created.id, { displayName: "Bleibt" }),
    ).resolves.toBeDefined();
    await expect(
      service.update(OWNER_A, created.id, { displayName: "Bleibt", description: "Neue Beschreibung" }),
    ).resolves.toBeDefined();
  });

  it("rejects renaming to an existing name (different case) with CONFLICT", async () => {
    await seedTenant(); // provides the "Teammitglied" seed
    const second = await createRole("Zweite");
    await expect(
      service.update(OWNER_A, second.id, { displayName: "teammitglied" }),
    ).rejects.toThrowError(/already exists/i);
  });

  it("normalizes empty optional strings to null on update", async () => {
    const created = await service.create(OWNER_A, {
      category: "department",
      displayName: "Mit Beschreibung",
      description: "Text",
    });
    const updated = await service.update(OWNER_A, created.id, {
      displayName: "Mit Beschreibung",
      description: "",
    });
    expect(updated.description).toBeNull();
  });

  it("throws NOT_FOUND for missing or foreign ids", async () => {
    const created = await createRole("Fremdtest");
    await expect(
      service.update(OWNER_A, crypto.randomUUID(), { displayName: "Egal" }),
    ).rejects.toThrow(TRPCError);
    await expect(
      service.update(OWNER_B, created.id, { displayName: "Übernommen" }),
    ).rejects.toThrow(TRPCError);
    const untouched = await service.get(OWNER_A, created.id);
    expect(untouched.displayName).toBe("Fremdtest");
  });
});

describe("MasterDataService – activate / deactivate", () => {
  it("round-trips isActive", async () => {
    const created = await createRole("Kurzlebig");
    const deactivated = await service.deactivate(OWNER_A, created.id);
    expect(deactivated.isActive).toBe(false);

    const activated = await service.activate(OWNER_A, created.id);
    expect(activated.isActive).toBe(true);
  });

  it("throws NOT_FOUND for missing or foreign ids", async () => {
    const created = await createRole("Isoliert");
    await expect(service.deactivate(OWNER_A, crypto.randomUUID())).rejects.toThrow(TRPCError);
    await expect(service.activate(OWNER_B, created.id)).rejects.toThrow(TRPCError);
  });
});

describe("MasterDataService – remove", () => {
  it("deletes unreferenced entries", async () => {
    const created = await createRole("Weg");
    await expect(service.remove(OWNER_A, created.id)).resolves.toBe(true);
    await expect(service.get(OWNER_A, created.id)).rejects.toThrow(TRPCError);
  });

  it("rejects referenced entries with CONFLICT including the usage count", async () => {
    await seedTenant();
    const roles = await service.list(OWNER_A, { category: "role", includeInactive: true });
    const teamleitung = roles.find((entry) => entry.key === "teamleitung");
    expect(teamleitung).toBeDefined();
    await insertEmployee(OWNER_A, { role: "teamleitung" });
    await insertEmployee(OWNER_A, { role: "Teamleitung" });

    await expect(service.remove(OWNER_A, teamleitung!.id)).rejects.toThrow(TRPCError);
    await expect(service.remove(OWNER_A, teamleitung!.id)).rejects.toThrowError(/used by 2/);
  });

  it("allows removal once the referencing records are gone", async () => {
    await seedTenant();
    const roles = await service.list(OWNER_A, { category: "role", includeInactive: true });
    const teamleitung = roles.find((entry) => entry.key === "teamleitung")!;
    const employeeId = await insertEmployee(OWNER_A, { role: "Teamleitung" });
    await expect(service.remove(OWNER_A, teamleitung.id)).rejects.toThrow(TRPCError);

    await handle.db.delete(employees).where(eq(employees.id, employeeId));
    await expect(service.remove(OWNER_A, teamleitung.id)).resolves.toBe(true);
  });

  it("throws NOT_FOUND for missing or foreign ids", async () => {
    const created = await createRole("Bleibstark");
    await expect(service.remove(OWNER_A, crypto.randomUUID())).rejects.toThrow(TRPCError);
    await expect(service.remove(OWNER_B, created.id)).rejects.toThrow(TRPCError);
    await expect(service.get(OWNER_A, created.id)).resolves.toBeDefined();
  });
});

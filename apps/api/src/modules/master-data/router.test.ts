import { afterAll, describe, expect, it } from "vitest";
import type { MasterDataCategory } from "@mgmt/shared";
import { MASTER_DATA_CATEGORIES, MASTER_DATA_SEEDS } from "@mgmt/shared";
import type { MasterDataEntryUpdateInput } from "@mgmt/shared";
import { createTestApp, createTestClient } from "../../testing/test-utils";

function seedCount(category: MasterDataCategory): number {
  return MASTER_DATA_SEEDS.filter((seed) => seed.category === category).length;
}

describe("master data router (tRPC over HTTP)", () => {
  const appPromise = createTestApp();
  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it("lists seeded defaults for every category (including usage counts)", async () => {
    const app = await appPromise;
    const client = createTestClient(app);

    for (const category of MASTER_DATA_CATEGORIES) {
      const entries = await client.masterData.list.query({ category });
      expect(entries).toHaveLength(seedCount(category));
      for (const entry of entries) {
        expect(entry.category).toBe(category);
        expect(entry.usageCount).toBe(0);
      }
    }
  });

  it("seeds enum-backed keys mirroring the hard-coded constants", async () => {
    const app = await appPromise;
    const client = createTestClient(app);

    const relationshipTypes = await client.masterData.list.query({
      category: "relationship_type",
    });
    expect(relationshipTypes.map((entry) => entry.key)).toEqual([
      "reports_to",
      "peer",
      "stakeholder",
      "mentor",
      "informal",
    ]);

    const appointmentTypes = await client.masterData.list.query({ category: "appointment_type" });
    expect(appointmentTypes.map((entry) => entry.key)).toEqual([
      "one_on_one",
      "feedback",
      "career",
      "adhoc",
    ]);

    const taskStatuses = await client.masterData.list.query({ category: "task_status" });
    expect(taskStatuses.map((entry) => entry.key)).toEqual([
      "open",
      "in_progress",
      "done",
      "cancelled",
    ]);
    // Only the "done" status terminates tasks.
    expect(taskStatuses.filter((entry) => entry.isDone).map((entry) => entry.key)).toEqual([
      "done",
    ]);
  });

  it("runs the full lifecycle: create → get → update → deactivate → activate → remove", async () => {
    const app = await appPromise;
    const client = createTestClient(app);

    await client.masterData.list.query({ category: "role" }); // seeds first

    const created = await client.masterData.create.mutate({
      category: "role",
      displayName: "Product Owner",
    });
    expect(created.key).toBe("product-owner");
    expect(created.sortOrder).toBe(40); // appended after the seeds (10/20/30)

    const fetched = await client.masterData.get.query(created.id);
    expect(fetched.usageCount).toBe(0);

    const updated = await client.masterData.update.mutate({
      id: created.id,
      data: { displayName: "Product Owner", description: "Produktverantwortung" },
    });
    expect(updated.key).toBe("product-owner");
    expect(updated.description).toBe("Produktverantwortung");

    const deactivated = await client.masterData.deactivate.mutate(created.id);
    expect(deactivated.isActive).toBe(false);

    const activeList = await client.masterData.list.query({ category: "role" });
    expect(activeList.map((entry) => entry.id)).not.toContain(created.id);
    const fullList = await client.masterData.list.query({ category: "role", includeInactive: true });
    expect(fullList.map((entry) => entry.id)).toContain(created.id);

    const activated = await client.masterData.activate.mutate(created.id);
    expect(activated.isActive).toBe(true);

    const removed = await client.masterData.remove.mutate(created.id);
    expect(removed).toBe(true);
    await expect(client.masterData.get.query(created.id)).rejects.toThrowError(/not found/i);
  });

  it("computes cross-table usage counts (employees, conversations, action items)", async () => {
    const app = await appPromise;
    const client = createTestClient(app);

    const employee = await client.employees.create.mutate({
      firstName: "Team",
      lastName: "Mitglied",
      role: "Teamleitung",
    });
    await client.conversations.create.mutate({
      employeeId: employee.id,
      scheduledAt: "2026-04-01T09:00:00Z",
      type: "feedback",
    });
    await client.actionItems.create.mutate({ title: "Follow up", status: "in_progress" });

    const roles = await client.masterData.list.query({ category: "role" });
    // Referenced by display name; key and lower(displayName) coincide for the
    // seed, so the double-count guard must keep this at 1 (not 2).
    expect(roles.find((entry) => entry.key === "teamleitung")?.usageCount).toBe(1);

    const appointmentTypes = await client.masterData.list.query({
      category: "appointment_type",
    });
    expect(appointmentTypes.find((entry) => entry.key === "feedback")?.usageCount).toBe(1);

    const taskStatuses = await client.masterData.list.query({ category: "task_status" });
    expect(taskStatuses.find((entry) => entry.key === "in_progress")?.usageCount).toBe(1);

    const countries = await client.masterData.list.query({ category: "country" });
    expect(countries.every((entry) => entry.usageCount === 0)).toBe(true);
  });

  it("blocks removal while the entry is referenced (CONFLICT with count)", async () => {
    const app = await appPromise;
    const client = createTestClient(app);

    await client.masterData.list.query({ category: "role" });
    const employee = await client.employees.create.mutate({
      firstName: "Extern",
      lastName: "Berater",
      role: "Extern",
    });

    const roles = await client.masterData.list.query({ category: "role" });
    const extern = roles.find((entry) => entry.key === "extern");
    expect(extern).toBeDefined();
    await expect(client.masterData.remove.mutate(extern!.id)).rejects.toThrowError(/used by 1/);

    await client.employees.remove.mutate(employee.id);
    await expect(client.masterData.remove.mutate(extern!.id)).resolves.toBe(true);
  });

  it("strips immutable key and category from update payloads", async () => {
    const app = await appPromise;
    const client = createTestClient(app);

    const created = await client.masterData.create.mutate({
      category: "location",
      displayName: "Werkstatt",
    });

    const updated = await client.masterData.update.mutate({
      id: created.id,
      // Malicious/careless payload — the update schema must strip both fields.
      data: {
        displayName: "Werkstatt Nord",
        key: "hacked",
        category: "holiday",
      } as MasterDataEntryUpdateInput,
    });
    expect(updated.key).toBe("werkstatt");
    expect(updated.category).toBe("location");
    expect(updated.displayName).toBe("Werkstatt Nord");
  });

  it("rejects invalid input with validation errors", async () => {
    const app = await appPromise;
    const client = createTestClient(app);

    // `get` requires a UUID.
    await expect(client.masterData.get.query("not-a-uuid")).rejects.toThrowError();

    // Unknown category on list and create.
    await expect(
      client.masterData.list.query({ category: "nope" as never }),
    ).rejects.toThrowError();
    await expect(
      client.masterData.create.mutate({ category: "nope" as never, displayName: "X" }),
    ).rejects.toThrowError();

    // Bad color and empty display name on create.
    await expect(
      client.masterData.create.mutate({ category: "role", displayName: "X", colorHex: "red" }),
    ).rejects.toThrowError();
    await expect(
      client.masterData.create.mutate({ category: "role", displayName: "" }),
    ).rejects.toThrowError();

    // Uppercase keys are rejected (keys are lowercase slugs).
    await expect(
      client.masterData.create.mutate({ category: "role", displayName: "X", key: "Nope" }),
    ).rejects.toThrowError();
  });

  it("returns NOT_FOUND for a missing (but well-formed) id", async () => {
    const app = await appPromise;
    const client = createTestClient(app);
    await expect(
      client.masterData.get.query("00000000-0000-4000-8000-000000000000"),
    ).rejects.toThrowError(/not found/i);
  });
});

describe("master data authentication gate", () => {
  it("protects masterData procedures when auth is enforced", async () => {
    const app = await createTestApp({ devBypassAuth: false, firebaseProjectId: "test-project" });

    const unauthorized = await app.inject({ method: "GET", url: "/trpc/masterData.list" });
    expect(unauthorized.statusCode).toBe(401);

    await app.close();
  });
});

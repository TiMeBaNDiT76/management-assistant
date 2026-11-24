import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabaseHandle } from "@mgmt/shared";
import { initializeDatabase } from "@mgmt/shared";
import { EmployeeRepository } from "./repository";

let handle: AppDatabaseHandle;
let repo: EmployeeRepository;

beforeEach(() => {
  handle = initializeDatabase();
  repo = new EmployeeRepository(handle.db);
});

function createEmployee(ownerUserId: string, overrides: Record<string, unknown> = {}) {
  return repo.create({
    id: crypto.randomUUID(),
    ownerUserId,
    firstName: "Ada",
    lastName: "Lovelace",
    ...(overrides as object),
  });
}

describe("EmployeeRepository", () => {
  it("creates and reads an employee within the same tenant", async () => {
    const created = await createEmployee("owner-a");
    const found = await repo.findById("owner-a", created.id);
    expect(found?.id).toBe(created.id);
    expect(found?.firstName).toBe("Ada");
  });

  it("returns nothing when reading across tenants", async () => {
    const created = await createEmployee("owner-a");
    expect(await repo.findById("owner-b", created.id)).toBeNull();
  });

  it("searches name and email within the tenant", async () => {
    await createEmployee("owner-a", { firstName: "Grace", lastName: "Hopper" });
    await createEmployee("owner-a", { firstName: "Ada", lastName: "Lovelace", email: "ada@x.io" });
    await createEmployee("owner-b", { firstName: "Other", lastName: "Tenant" });

    const byName = await repo.list("owner-a", { limit: 50, offset: 0, search: "hop" });
    expect(byName).toHaveLength(1);
    expect(byName[0]?.lastName).toBe("Hopper");

    const byEmail = await repo.list("owner-a", { limit: 50, offset: 0, search: "ada@x.io" });
    expect(byEmail).toHaveLength(1);

    const crossTenant = await repo.list("owner-b", { limit: 50, offset: 0, search: "Ada" });
    expect(crossTenant).toHaveLength(0);
  });

  it("paginates results", async () => {
    for (const lastName of ["Alpha", "Beta", "Gamma"]) {
      await createEmployee("owner-a", { lastName });
    }
    const page = await repo.list("owner-a", { limit: 2, offset: 1 });
    expect(page.map((employee) => employee.lastName)).toEqual(["Beta", "Gamma"]);
  });

  it("updates only within the tenant and bumps updatedAt", async () => {
    const created = await createEmployee("owner-a");
    const updated = await repo.update("owner-a", created.id, { role: "Principal Engineer" });
    expect(updated?.role).toBe("Principal Engineer");
    expect(updated && updated.updatedAt >= created.updatedAt).toBe(true);
    expect(await repo.update("owner-b", created.id, { role: "Hacker" })).toBeNull();
  });

  it("removes only within the tenant", async () => {
    const created = await createEmployee("owner-a");
    expect(await repo.remove("owner-b", created.id)).toBe(false);
    expect(await repo.remove("owner-a", created.id)).toBe(true);
    expect(await repo.findById("owner-a", created.id)).toBeNull();
  });

  it("stores relationships and cascades deletes", async () => {
    const manager = await createEmployee("owner-a", { firstName: "Manager", lastName: "One" });
    const report = await createEmployee("owner-a", { firstName: "Report", lastName: "One" });
    const relationship = await repo.createRelationship({
      ownerUserId: "owner-a",
      id: crypto.randomUUID(),
      fromEmployeeId: report.id,
      toEmployeeId: manager.id,
      type: "reports_to",
    });

    const listed = await repo.listRelationships("owner-a", { limit: 50, offset: 0 });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.type).toBe("reports_to");

    const forEmployee = await repo.listRelationships("owner-a", {
      limit: 50,
      offset: 0,
      employeeId: manager.id,
    });
    expect(forEmployee).toHaveLength(1);

    await repo.remove("owner-a", manager.id);
    const afterDelete = await repo.listRelationships("owner-a", { limit: 50, offset: 0 });
    expect(afterDelete).toHaveLength(0);
    void relationship;
  });
});

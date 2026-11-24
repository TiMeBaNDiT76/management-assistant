import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabaseHandle } from "@mgmt/shared";
import { initializeDatabase } from "@mgmt/shared";
import { employees } from "@mgmt/shared";
import { ActionItemRepository } from "./repository";

let handle: AppDatabaseHandle;
let repo: ActionItemRepository;

beforeEach(() => {
  handle = initializeDatabase();
  repo = new ActionItemRepository(handle.db);
});

async function createEmployee(ownerUserId: string): Promise<string> {
  const id = crypto.randomUUID();
  await handle.db
    .insert(employees)
    .values({
      id,
      ownerUserId,
      firstName: "Ada",
      lastName: "Lovelace",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    })
    .run();
  return id;
}

function createItem(overrides: Record<string, unknown> = {}) {
  return repo.create({
    id: crypto.randomUUID(),
    ownerUserId: "owner-a",
    title: "Prepare feedback talk",
    ...(overrides as object),
  });
}

describe("ActionItemRepository", () => {
  it("defaults status to open", async () => {
    const created = await createItem();
    expect(created.status).toBe("open");
  });

  it("filters by status, employee, conversation, and openOnly", async () => {
    const employeeId = await createEmployee("owner-a");
    await createItem({ employeeId, status: "open" });
    await createItem({ employeeId, status: "in_progress" });
    await createItem({ employeeId, status: "done" });
    await createItem({ status: "open" });

    const openOnly = await repo.list("owner-a", { limit: 50, offset: 0, openOnly: true });
    expect(openOnly).toHaveLength(3);

    const forEmployee = await repo.list("owner-a", {
      limit: 50,
      offset: 0,
      employeeId,
      openOnly: true,
    });
    expect(forEmployee).toHaveLength(2);

    const done = await repo.list("owner-a", { limit: 50, offset: 0, status: "done" });
    expect(done).toHaveLength(1);
  });

  it("never leaks rows across tenants", async () => {
    await createItem();
    expect(await repo.list("owner-b", { limit: 50, offset: 0 })).toHaveLength(0);
    const created = await createItem();
    expect(await repo.findById("owner-b", created.id)).toBeNull();
  });

  it("updates and removes within the tenant", async () => {
    const created = await createItem();
    const updated = await repo.update("owner-a", created.id, { status: "done" });
    expect(updated?.status).toBe("done");
    expect(await repo.update("owner-b", created.id, { status: "open" })).toBeNull();
    expect(await repo.remove("owner-a", created.id)).toBe(true);
    expect(await repo.remove("owner-a", created.id)).toBe(false);
  });
});

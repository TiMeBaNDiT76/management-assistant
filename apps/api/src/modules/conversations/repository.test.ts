import { beforeEach, describe, expect, it } from "vitest";
import type { AppDatabaseHandle } from "@mgmt/shared";
import { initializeDatabase } from "@mgmt/shared";
import { employees } from "@mgmt/shared";
import { ConversationRepository } from "./repository";

let handle: AppDatabaseHandle;
let repo: ConversationRepository;

beforeEach(() => {
  handle = initializeDatabase();
  repo = new ConversationRepository(handle.db);
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

function createConversation(employeeId: string, overrides: Record<string, unknown> = {}) {
  return repo.create({
    id: crypto.randomUUID(),
    ownerUserId: "owner-a",
    employeeId,
    scheduledAt: "2026-02-02T09:00:00Z",
    ...(overrides as object),
  });
}

describe("ConversationRepository", () => {
  it("applies type/status defaults from the database schema", async () => {
    const employeeId = await createEmployee("owner-a");
    const created = await createConversation(employeeId);
    expect(created.type).toBe("one_on_one");
    expect(created.status).toBe("planned");
    expect(created.mood).toBeNull();
  });

  it("filters by employee and status within the tenant", async () => {
    const employeeId = await createEmployee("owner-a");
    const otherEmployeeId = await createEmployee("owner-a");
    await createConversation(employeeId, { status: "completed" });
    await createConversation(otherEmployeeId);

    const planned = await repo.list("owner-a", { limit: 50, offset: 0, status: "planned" });
    expect(planned).toHaveLength(1);
    expect(planned[0]?.employeeId).toBe(otherEmployeeId);

    const byEmployee = await repo.list("owner-a", {
      limit: 50,
      offset: 0,
      employeeId,
    });
    expect(byEmployee).toHaveLength(1);
  });

  it("never leaks rows across tenants", async () => {
    const employeeId = await createEmployee("owner-a");
    await createConversation(employeeId);
    expect(await repo.list("owner-b", { limit: 50, offset: 0 })).toHaveLength(0);
    expect(await repo.countByEmployee("owner-b", employeeId)).toBe(0);
  });

  it("lists recent conversations per employee, newest first", async () => {
    const employeeId = await createEmployee("owner-a");
    await createConversation(employeeId, { scheduledAt: "2026-01-01T09:00:00Z" });
    await createConversation(employeeId, { scheduledAt: "2026-03-01T09:00:00Z" });

    const recent = await repo.listRecentByEmployee("owner-a", employeeId, 10);
    expect(recent.map((conversation) => conversation.scheduledAt)).toEqual([
      "2026-03-01T09:00:00Z",
      "2026-01-01T09:00:00Z",
    ]);
  });

  it("updates and removes within the tenant", async () => {
    const employeeId = await createEmployee("owner-a");
    const created = await createConversation(employeeId);

    const updated = await repo.update("owner-a", created.id, { mood: 4, status: "completed" });
    expect(updated?.mood).toBe(4);
    expect(updated?.status).toBe("completed");
    expect(await repo.update("owner-b", created.id, { mood: 1 })).toBeNull();

    expect(await repo.remove("owner-a", created.id)).toBe(true);
    expect(await repo.remove("owner-a", created.id)).toBe(false);
  });
});

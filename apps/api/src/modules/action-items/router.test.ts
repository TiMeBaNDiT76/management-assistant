import { afterAll, describe, expect, it } from "vitest";
import { createTestApp, createTestClient } from "../../testing/test-utils";

describe("action item router (tRPC over HTTP)", () => {
  const appPromise = createTestApp();
  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it("creates, lists, updates and removes action items", async () => {
    const app = await appPromise;
    const client = createTestClient(app);

    const employee = await client.employees.create.mutate({
      firstName: "Ada",
      lastName: "Lovelace",
    });
    const conversation = await client.conversations.create.mutate({
      employeeId: employee.id,
      scheduledAt: "2026-04-01T09:00:00Z",
    });

    const created = await client.actionItems.create.mutate({
      title: "Prepare mid-year review",
      employeeId: employee.id,
      conversationId: conversation.id,
      dueDate: "2026-07-01",
    });
    expect(created.status).toBe("open");

    const list = await client.actionItems.list.query({ employeeId: employee.id });
    expect(list.map((item) => item.id)).toContain(created.id);

    const openList = await client.actionItems.list.query({ openOnly: true });
    expect(openList.map((item) => item.id)).toContain(created.id);

    const updated = await client.actionItems.update.mutate({
      id: created.id,
      data: { status: "done" },
    });
    expect(updated.status).toBe("done");

    const stillOpen = await client.actionItems.list.query({ openOnly: true });
    expect(stillOpen.map((item) => item.id)).not.toContain(created.id);

    const removed = await client.actionItems.remove.mutate(created.id);
    expect(removed).toBe(true);
  });

  it("rejects an empty title with a validation error", async () => {
    const app = await appPromise;
    const client = createTestClient(app);
    await expect(client.actionItems.create.mutate({ title: "" })).rejects.toThrowError();
  });
});

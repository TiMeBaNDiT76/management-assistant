import { afterAll, describe, expect, it } from "vitest";
import { createTestApp, createTestClient } from "../../testing/test-utils";

describe("conversation router (tRPC over HTTP)", () => {
  const appPromise = createTestApp();
  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it("creates a conversation for an existing employee and lists it", async () => {
    const app = await appPromise;
    const client = createTestClient(app);

    const employee = await client.employees.create.mutate({
      firstName: "Ada",
      lastName: "Lovelace",
    });

    const conversation = await client.conversations.create.mutate({
      employeeId: employee.id,
      scheduledAt: "2026-03-03T10:00:00Z",
      mood: 4,
    });
    expect(conversation.status).toBe("planned");

    const list = await client.conversations.list.query({ employeeId: employee.id });
    expect(list.map((item) => item.id)).toContain(conversation.id);

    const updated = await client.conversations.update.mutate({
      id: conversation.id,
      data: { status: "completed", summary: "Good talk" },
    });
    expect(updated.summary).toBe("Good talk");

    const removed = await client.conversations.remove.mutate(conversation.id);
    expect(removed).toBe(true);
  });

  it("fails creating a conversation for a foreign employee with NOT_FOUND", async () => {
    const app = await appPromise;
    const client = createTestClient(app);
    await expect(
      client.conversations.create.mutate({
        employeeId: "00000000-0000-0000-0000-000000000000",
        scheduledAt: "2026-03-03T10:00:00Z",
      }),
    ).rejects.toThrowError(/not found/i);
  });
});

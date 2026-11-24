import { afterAll, describe, expect, it } from "vitest";
import { createTestApp, createTestClient } from "../../testing/test-utils";

describe("employee router (tRPC over HTTP)", () => {
  const appPromise = createTestApp();
  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it("creates, updates, lists and removes employees", async () => {
    const app = await appPromise;
    const client = createTestClient(app);

    const created = await client.employees.create.mutate({
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
    });

    const fetched = await client.employees.getById.query(created.id);
    expect(fetched.lastName).toBe("Hopper");

    const updated = await client.employees.update.mutate({
      id: created.id,
      data: { role: "Rear Admiral" },
    });
    expect(updated.role).toBe("Rear Admiral");

    const list = await client.employees.list.query({ search: "grace" });
    expect(list.map((employee) => employee.id)).toContain(created.id);

    const removed = await client.employees.remove.mutate(created.id);
    expect(removed).toBe(true);
  });

  it("rejects invalid input with a validation error", async () => {
    const app = await appPromise;
    const client = createTestClient(app);
    await expect(
      client.employees.create.mutate({ firstName: "", lastName: "" }),
    ).rejects.toThrowError();
  });

  it("creates relationships through the nested router", async () => {
    const app = await appPromise;
    const client = createTestClient(app);
    const manager = await client.employees.create.mutate({
      firstName: "Manager",
      lastName: "One",
    });
    const report = await client.employees.create.mutate({ firstName: "Report", lastName: "One" });
    const relationship = await client.employees.relationships.create.mutate({
      fromEmployeeId: report.id,
      toEmployeeId: manager.id,
      type: "reports_to",
    });
    expect(relationship.type).toBe("reports_to");

    const list = await client.employees.relationships.list.query({ employeeId: manager.id });
    expect(list).toHaveLength(1);
  });
});

describe("authentication gate", () => {
  it("keeps /health public but protects tRPC when auth is enforced", async () => {
    const app = await createTestApp({ devBypassAuth: false, firebaseProjectId: "test-project" });

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);

    const unauthorized = await app.inject({ method: "GET", url: "/trpc/employees.list" });
    expect(unauthorized.statusCode).toBe(401);

    const badToken = await app.inject({
      method: "GET",
      url: "/trpc/employees.list",
      headers: { authorization: "Bearer not-a-valid-jwt" },
    });
    expect(badToken.statusCode).toBe(401);

    await app.close();
  });
});

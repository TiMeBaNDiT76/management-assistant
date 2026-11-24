import { beforeEach, describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import type { AppDatabaseHandle } from "@mgmt/shared";
import { initializeDatabase } from "@mgmt/shared";
import { EmployeeRepository } from "./repository";
import { EmployeeService } from "./service";

let handle: AppDatabaseHandle;
let service: EmployeeService;

beforeEach(() => {
  handle = initializeDatabase();
  service = new EmployeeService(new EmployeeRepository(handle.db));
});

describe("EmployeeService", () => {
  it("creates an employee", async () => {
    const created = await service.create("owner-a", {
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
    });
    expect(created.ownerUserId).toBe("owner-a");
    expect(created.role).toBeNull();
  });

  it("rejects duplicate emails with CONFLICT", async () => {
    await service.create("owner-a", {
      firstName: "Grace",
      lastName: "Hopper",
      email: "grace@example.com",
    });
    await expect(
      service.create("owner-a", {
        firstName: "Grace",
        lastName: "Clone",
        email: "grace@example.com",
      }),
    ).rejects.toThrowError(/already exists/);
    // Same email in another tenant is fine.
    await expect(
      service.create("owner-b", {
        firstName: "Grace",
        lastName: "Clone",
        email: "grace@example.com",
      }),
    ).resolves.toBeDefined();
  });

  it("throws NOT_FOUND for missing employees", async () => {
    await expect(service.get("owner-a", "missing-id")).rejects.toThrow(TRPCError);
    await expect(service.update("owner-a", "missing-id", { role: "x" })).rejects.toThrow(
      TRPCError,
    );
    await expect(service.remove("owner-a", "missing-id")).rejects.toThrow(TRPCError);
  });

  it("updates an existing employee", async () => {
    const created = await service.create("owner-a", { firstName: "Ada", lastName: "Lovelace" });
    const updated = await service.update("owner-a", created.id, { department: "Engineering" });
    expect(updated.department).toBe("Engineering");
  });

  it("requires both employees to exist for a relationship", async () => {
    const employee = await service.create("owner-a", { firstName: "A", lastName: "B" });
    await expect(
      service.createRelationship("owner-a", {
        fromEmployeeId: employee.id,
        toEmployeeId: "does-not-exist",
        type: "peer",
      }),
    ).rejects.toThrow(TRPCError);

    const other = await service.create("owner-a", { firstName: "C", lastName: "D" });
    const relationship = await service.createRelationship("owner-a", {
      fromEmployeeId: employee.id,
      toEmployeeId: other.id,
      type: "mentor",
    });
    expect(relationship.type).toBe("mentor");
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import type { AppDatabaseHandle } from "@mgmt/shared";
import { initializeDatabase } from "@mgmt/shared";
import { ConversationRepository } from "./repository";
import { EmployeeRepository } from "../employees/repository";
import { ConversationService } from "./service";

let handle: AppDatabaseHandle;
let service: ConversationService;
let employeeRepo: EmployeeRepository;

beforeEach(() => {
  handle = initializeDatabase();
  const employeeRepoLocal = new EmployeeRepository(handle.db);
  employeeRepo = employeeRepoLocal;
  service = new ConversationService(new ConversationRepository(handle.db), employeeRepoLocal);
});

describe("ConversationService", () => {
  it("requires the employee to exist in the tenant", async () => {
    await expect(
      service.create("owner-a", {
        employeeId: "missing",
        scheduledAt: "2026-02-02T09:00:00Z",
      }),
    ).rejects.toThrow(TRPCError);
  });

  it("creates a 1:1 for an existing employee", async () => {
    const employee = await employeeRepo.create({
      id: crypto.randomUUID(),
      ownerUserId: "owner-a",
      firstName: "Ada",
      lastName: "Lovelace",
    });
    const created = await service.create("owner-a", {
      employeeId: employee.id,
      scheduledAt: "2026-02-02T09:00:00Z",
      mood: 3,
    });
    expect(created.type).toBe("one_on_one");
    expect(created.mood).toBe(3);
  });

  it("throws NOT_FOUND for missing conversations", async () => {
    await expect(service.get("owner-a", "missing")).rejects.toThrow(TRPCError);
    await expect(
      service.update("owner-a", "missing", { summary: "x" }),
    ).rejects.toThrow(TRPCError);
    await expect(service.remove("owner-a", "missing")).rejects.toThrow(TRPCError);
  });

  it("completes a conversation with a summary", async () => {
    const employee = await employeeRepo.create({
      id: crypto.randomUUID(),
      ownerUserId: "owner-a",
      firstName: "Ada",
      lastName: "Lovelace",
    });
    const created = await service.create("owner-a", {
      employeeId: employee.id,
      scheduledAt: "2026-02-02T09:00:00Z",
    });
    const updated = await service.update("owner-a", created.id, {
      status: "completed",
      summary: "Agreed on growth path",
    });
    expect(updated.status).toBe("completed");
    expect(updated.summary).toBe("Agreed on growth path");
  });
});

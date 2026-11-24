import { beforeEach, describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import type { AppDatabaseHandle } from "@mgmt/shared";
import { initializeDatabase } from "@mgmt/shared";
import { ActionItemRepository } from "./repository";
import { ConversationRepository } from "../conversations/repository";
import { EmployeeRepository } from "../employees/repository";
import { ActionItemService } from "./service";

let handle: AppDatabaseHandle;
let service: ActionItemService;
let employeeRepo: EmployeeRepository;
let conversationRepo: ConversationRepository;

beforeEach(() => {
  handle = initializeDatabase();
  employeeRepo = new EmployeeRepository(handle.db);
  conversationRepo = new ConversationRepository(handle.db);
  service = new ActionItemService(
    new ActionItemRepository(handle.db),
    employeeRepo,
    conversationRepo,
  );
});

describe("ActionItemService", () => {
  it("creates an action item", async () => {
    const created = await service.create("owner-a", { title: "Prepare feedback talk" });
    expect(created.status).toBe("open");
  });

  it("requires referenced employee/conversation to exist in the tenant", async () => {
    await expect(
      service.create("owner-a", { title: "X", employeeId: "missing" }),
    ).rejects.toThrow(TRPCError);
    await expect(
      service.create("owner-a", { title: "X", conversationId: "missing" }),
    ).rejects.toThrow(TRPCError);

    const employee = await employeeRepo.create({
      id: crypto.randomUUID(),
      ownerUserId: "owner-a",
      firstName: "Ada",
      lastName: "Lovelace",
    });
    const conversation = await conversationRepo.create({
      id: crypto.randomUUID(),
      ownerUserId: "owner-a",
      employeeId: employee.id,
      scheduledAt: "2026-02-02T09:00:00Z",
    });
    const created = await service.create("owner-a", {
      title: "Follow up",
      employeeId: employee.id,
      conversationId: conversation.id,
    });
    expect(created.conversationId).toBe(conversation.id);
  });

  it("throws NOT_FOUND for missing action items", async () => {
    await expect(service.get("owner-a", "missing")).rejects.toThrow(TRPCError);
    await expect(
      service.update("owner-a", "missing", { title: "x" }),
    ).rejects.toThrow(TRPCError);
    await expect(service.remove("owner-a", "missing")).rejects.toThrow(TRPCError);
  });

  it("moves an item through the workflow", async () => {
    const created = await service.create("owner-a", { title: "Prepare 1:1" });
    const inProgress = await service.update("owner-a", created.id, { status: "in_progress" });
    expect(inProgress.status).toBe("in_progress");
    const done = await service.update("owner-a", created.id, { status: "done" });
    expect(done.status).toBe("done");
  });
});

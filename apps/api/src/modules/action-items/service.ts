import { TRPCError } from "@trpc/server";
import type {
  ActionItem,
  ActionItemCreateInput,
  ActionItemUpdateInput,
  ListActionItemsInput,
} from "@mgmt/shared";
import type { ConversationRepository } from "../conversations/repository";
import type { EmployeeRepository } from "../employees/repository";
import type { ActionItemRepository } from "./repository";

/** Action item domain service (recurring tasks from 1:1s, follow-ups, ...). */
export class ActionItemService {
  constructor(
    private readonly repo: ActionItemRepository,
    private readonly employeeRepo: EmployeeRepository,
    private readonly conversationRepo: ConversationRepository,
  ) {}

  async list(ownerUserId: string, input: ListActionItemsInput): Promise<ActionItem[]> {
    return this.repo.list(ownerUserId, input);
  }

  async get(ownerUserId: string, id: string): Promise<ActionItem> {
    const item = await this.repo.findById(ownerUserId, id);
    if (!item) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Action item ${id} not found` });
    }
    return item;
  }

  async create(ownerUserId: string, input: ActionItemCreateInput): Promise<ActionItem> {
    if (input.employeeId) {
      const employee = await this.employeeRepo.findById(ownerUserId, input.employeeId);
      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Employee ${input.employeeId} not found`,
        });
      }
    }
    if (input.conversationId) {
      const conversation = await this.conversationRepo.findById(
        ownerUserId,
        input.conversationId,
      );
      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Conversation ${input.conversationId} not found`,
        });
      }
    }
    return this.repo.create({
      id: crypto.randomUUID(),
      ownerUserId,
      ...input,
    });
  }

  async update(
    ownerUserId: string,
    id: string,
    input: ActionItemUpdateInput,
  ): Promise<ActionItem> {
    const existing = await this.repo.findById(ownerUserId, id);
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Action item ${id} not found` });
    }
    const updated = await this.repo.update(ownerUserId, id, input);
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return updated;
  }

  async remove(ownerUserId: string, id: string): Promise<boolean> {
    const removed = await this.repo.remove(ownerUserId, id);
    if (!removed) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Action item ${id} not found` });
    }
    return removed;
  }
}

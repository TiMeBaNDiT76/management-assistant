import { TRPCError } from "@trpc/server";
import type {
  Conversation,
  ConversationCreateInput,
  ConversationUpdateInput,
  ListConversationsInput,
} from "@mgmt/shared";import type { EmployeeRepository } from "../employees/repository";
import type { ConversationRepository } from "./repository";

/** Conversation domain service (1:1s, feedback talks, career talks, ...). */
export class ConversationService {
  constructor(
    private readonly repo: ConversationRepository,
    private readonly employeeRepo: EmployeeRepository,
  ) {}

  async list(ownerUserId: string, input: ListConversationsInput): Promise<Conversation[]> {
    return this.repo.list(ownerUserId, input);
  }

  async get(ownerUserId: string, id: string): Promise<Conversation> {
    const conversation = await this.repo.findById(ownerUserId, id);
    if (!conversation) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Conversation ${id} not found` });
    }
    return conversation;
  }

  async create(ownerUserId: string, input: ConversationCreateInput): Promise<Conversation> {
    const employee = await this.employeeRepo.findById(ownerUserId, input.employeeId);
    if (!employee) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Employee ${input.employeeId} not found`,
      });
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
    input: ConversationUpdateInput,
  ): Promise<Conversation> {
    const existing = await this.repo.findById(ownerUserId, id);
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Conversation ${id} not found` });
    }
    const updated = await this.repo.update(ownerUserId, id, input);
    if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return updated;
  }

  async remove(ownerUserId: string, id: string): Promise<boolean> {
    const removed = await this.repo.remove(ownerUserId, id);
    if (!removed) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Conversation ${id} not found` });
    }
    return removed;
  }
}

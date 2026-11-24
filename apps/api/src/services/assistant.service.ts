import { TRPCError } from "@trpc/server";
import {
  ensureEmbeddingsTable,
  searchEmbeddings,
  upsertEmbedding,
  type EmbeddingSearchHit,
  type SqliteConnection,
} from "@mgmt/shared";
import type { ActionItemRepository } from "../modules/action-items/repository";
import type { ConversationRepository } from "../modules/conversations/repository";
import type { EmployeeRepository } from "../modules/employees/repository";
import type { AIService } from "./ai.service";

export interface AssistantDeps {
  employeeRepo: EmployeeRepository;
  conversationRepo: ConversationRepository;
  actionItemRepo: ActionItemRepository;
  /** Null when no AI credentials are configured. */
  ai: AIService | null;
  sqlite: SqliteConnection | null;
  vectorAvailable: boolean;
}

export interface BriefingResult {
  employeeId: string;
  briefing: string;
  generatedAt: string;
}

export interface AssistantSearchInput {
  query: string;
  limit?: number;
}

/**
 * AI management co-pilot: 1:1 prep briefings and semantic vector search
 * across past conversation logs (sqlite-vec + Gemini embeddings).
 */
export class AssistantService {
  constructor(private readonly deps: AssistantDeps) {}

  async briefing(ownerUserId: string, employeeId: string): Promise<BriefingResult> {
    const ai = this.requireAI();
    const employee = await this.deps.employeeRepo.findById(ownerUserId, employeeId);
    if (!employee) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Employee ${employeeId} not found` });
    }
    const [recentConversations, openActionItems] = await Promise.all([
      this.deps.conversationRepo.listRecentByEmployee(ownerUserId, employeeId, 10),
      this.deps.actionItemRepo.list(ownerUserId, {
        employeeId,
        openOnly: true,
        limit: 20,
        offset: 0,
      }),
    ]);
    const briefing = await ai.generateBriefing({
      employee,
      conversations: recentConversations,
      openActionItems,
    });
    return { employeeId, briefing, generatedAt: new Date().toISOString() };
  }

  /** Embeds a conversation's notes/summary so it becomes searchable. */
  async indexConversation(
    ownerUserId: string,
    conversationId: string,
  ): Promise<{ indexed: boolean }> {
    const sqlite = this.requireVectorStore();
    const ai = this.requireAI();
    const conversation = await this.deps.conversationRepo.findById(ownerUserId, conversationId);
    if (!conversation) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Conversation ${conversationId} not found`,
      });
    }
    const text = [conversation.summary, conversation.notes]
      .filter((part): part is string => Boolean(part && part.trim().length > 0))
      .join("\n\n");
    if (text.length === 0) return { indexed: false };

    const vector = await ai.embed(text);
    upsertEmbedding(sqlite, { id: conversation.id, ownerUserId, vector });
    return { indexed: true };
  }

  /** Semantic search across the manager's indexed conversations. */
  async search(ownerUserId: string, input: AssistantSearchInput): Promise<EmbeddingSearchHit[]> {
    const sqlite = this.requireVectorStore();
    const ai = this.requireAI();
    const vector = await ai.embed(input.query);
    return searchEmbeddings(sqlite, {
      queryVector: vector,
      ownerUserId,
      limit: input.limit ?? 5,
    });
  }

  private requireAI(): AIService {
    if (!this.deps.ai) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "AI is not configured. Set GEMINI_API_KEY or GOOGLE_CLOUD_PROJECT.",
      });
    }
    return this.deps.ai;
  }

  private requireVectorStore(): SqliteConnection {
    if (!this.deps.vectorAvailable || !this.deps.sqlite) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Vector search is not available (sqlite-vec extension not loaded).",
      });
    }
    ensureEmbeddingsTable(this.deps.sqlite);
    return this.deps.sqlite;
  }
}

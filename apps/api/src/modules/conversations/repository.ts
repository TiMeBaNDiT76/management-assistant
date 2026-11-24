import { and, asc, desc, eq } from "drizzle-orm";
import type { AppDatabase } from "@mgmt/shared";
import { conversations } from "@mgmt/shared";
import type {
  Conversation,
  ConversationUpdateInput,
  ListConversationsInput,
} from "@mgmt/shared";

export interface CreateConversationData {
  id: string;
  ownerUserId: string;
  employeeId: string;
  scheduledAt: string;
  type?: string;
  status?: string;
  mood?: number | null;
  summary?: string;
  notes?: string;
}

/** Conversation repository — every query is scoped by `owner_user_id`. */
export class ConversationRepository {
  constructor(private readonly db: AppDatabase) {}

  async create(data: CreateConversationData): Promise<Conversation> {
    const [row] = await this.db
      .insert(conversations)
      .values({
        id: data.id,
        ownerUserId: data.ownerUserId,
        employeeId: data.employeeId,
        scheduledAt: data.scheduledAt,
        type: data.type,
        status: data.status,
        mood: data.mood ?? null,
        summary: data.summary,
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();
    if (!row) throw new Error("Conversation insert returned no row");
    return row;
  }

  async list(ownerUserId: string, options: ListConversationsInput): Promise<Conversation[]> {
    const conditions = [eq(conversations.ownerUserId, ownerUserId)];
    if (options.employeeId) {
      conditions.push(eq(conversations.employeeId, options.employeeId));
    }
    if (options.status) {
      conditions.push(eq(conversations.status, options.status));
    }
    return this.db
      .select()
      .from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.scheduledAt))
      .limit(options.limit)
      .offset(options.offset);
  }

  /** Most recent conversations of one employee (for AI prep briefings). */
  async listRecentByEmployee(
    ownerUserId: string,
    employeeId: string,
    limit: number,
  ): Promise<Conversation[]> {
    return this.db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.ownerUserId, ownerUserId),
          eq(conversations.employeeId, employeeId),
        ),
      )
      .orderBy(desc(conversations.scheduledAt))
      .limit(limit);
  }

  async findById(ownerUserId: string, id: string): Promise<Conversation | null> {
    const [row] = await this.db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.ownerUserId, ownerUserId)))
      .limit(1);
    return row ?? null;
  }

  async update(
    ownerUserId: string,
    id: string,
    patch: ConversationUpdateInput,
  ): Promise<Conversation | null> {
    const [row] = await this.db
      .update(conversations)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(eq(conversations.id, id), eq(conversations.ownerUserId, ownerUserId)))
      .returning();
    return row ?? null;
  }

  async remove(ownerUserId: string, id: string): Promise<boolean> {
    const result = await this.db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.ownerUserId, ownerUserId)))
      .run();
    return result.changes > 0;
  }

  async countByEmployee(ownerUserId: string, employeeId: string): Promise<number> {
    const rows = await this.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.ownerUserId, ownerUserId),
          eq(conversations.employeeId, employeeId),
        ),
      )
      .orderBy(asc(conversations.id));
    return rows.length;
  }
}

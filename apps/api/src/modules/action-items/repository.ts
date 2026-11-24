import { and, asc, eq, inArray } from "drizzle-orm";
import type { AppDatabase } from "@mgmt/shared";
import {
  ACTION_ITEM_DEFAULT_STATUS,
  ACTION_ITEM_OPEN_STATUSES,
  actionItems,
} from "@mgmt/shared";
import type { ActionItem, ListActionItemsInput } from "@mgmt/shared";

export interface CreateActionItemData {
  id: string;
  ownerUserId: string;
  title: string;
  description?: string;
  employeeId?: string;
  conversationId?: string;
  dueDate?: string;
  status?: string;
}

/** Action item repository — every query is scoped by `owner_user_id`. */
export class ActionItemRepository {
  constructor(private readonly db: AppDatabase) {}

  async create(data: CreateActionItemData): Promise<ActionItem> {
    const [row] = await this.db
      .insert(actionItems)
      .values({
        id: data.id,
        ownerUserId: data.ownerUserId,
        title: data.title,
        description: data.description,
        employeeId: data.employeeId,
        conversationId: data.conversationId,
        dueDate: data.dueDate,
        status: data.status ?? ACTION_ITEM_DEFAULT_STATUS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();
    if (!row) throw new Error("Action item insert returned no row");
    return row;
  }

  async list(ownerUserId: string, options: ListActionItemsInput): Promise<ActionItem[]> {
    const conditions = [eq(actionItems.ownerUserId, ownerUserId)];
    if (options.status) conditions.push(eq(actionItems.status, options.status));
    if (options.employeeId) conditions.push(eq(actionItems.employeeId, options.employeeId));
    if (options.conversationId) {
      conditions.push(eq(actionItems.conversationId, options.conversationId));
    }
    if (options.openOnly) {
      conditions.push(inArray(actionItems.status, [...ACTION_ITEM_OPEN_STATUSES]));
    }
    return this.db
      .select()
      .from(actionItems)
      .where(and(...conditions))
      .orderBy(asc(actionItems.dueDate), asc(actionItems.createdAt))
      .limit(options.limit)
      .offset(options.offset);
  }

  async findById(ownerUserId: string, id: string): Promise<ActionItem | null> {
    const [row] = await this.db
      .select()
      .from(actionItems)
      .where(and(eq(actionItems.id, id), eq(actionItems.ownerUserId, ownerUserId)))
      .limit(1);
    return row ?? null;
  }

  async update(
    ownerUserId: string,
    id: string,
    patch: Partial<CreateActionItemData>,
  ): Promise<ActionItem | null> {
    const [row] = await this.db
      .update(actionItems)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(eq(actionItems.id, id), eq(actionItems.ownerUserId, ownerUserId)))
      .returning();
    return row ?? null;
  }

  async remove(ownerUserId: string, id: string): Promise<boolean> {
    const result = await this.db
      .delete(actionItems)
      .where(and(eq(actionItems.id, id), eq(actionItems.ownerUserId, ownerUserId)))
      .run();
    return result.changes > 0;
  }
}

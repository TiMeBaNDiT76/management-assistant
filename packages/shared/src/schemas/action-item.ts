import { z } from "zod";
import { TASK_STATUS_SEED_KEYS } from "../master-data";
import { paginationSchema } from "./common";

/**
 * Action item status — validated against the machine `key`s of the
 * `task_status` master-data seed category (single source of truth; the seed
 * keys mirror the legacy `ACTION_ITEM_STATUSES` enum, so the accepted wire
 * values are unchanged).
 */
export const actionItemStatusSchema = z.enum(TASK_STATUS_SEED_KEYS);

export const actionItemCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10_000).optional(),
  employeeId: z.uuid().optional(),
  conversationId: z.uuid().optional(),
  dueDate: z.iso.date().optional(), // YYYY-MM-DD
  status: actionItemStatusSchema.optional(), // defaults to 'open' in the repository
});

export const actionItemUpdateSchema = actionItemCreateSchema.partial();

export const listActionItemsSchema = paginationSchema.extend({
  status: actionItemStatusSchema.optional(),
  employeeId: z.uuid().optional(),
  conversationId: z.uuid().optional(),
  /** Convenience filter: only `open` and `in_progress` items. */
  openOnly: z.boolean().optional(),
});

export type ActionItemCreateInput = z.infer<typeof actionItemCreateSchema>;
export type ActionItemUpdateInput = z.infer<typeof actionItemUpdateSchema>;
export type ListActionItemsInput = z.infer<typeof listActionItemsSchema>;

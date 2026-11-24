import { z } from "zod";
import { ACTION_ITEM_STATUSES } from "../constants";
import { paginationSchema } from "./common";

export const actionItemStatusSchema = z.enum(ACTION_ITEM_STATUSES);

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

import { z } from "zod";
import { CONVERSATION_STATUSES, CONVERSATION_TYPES } from "../constants";
import { moodSchema, paginationSchema } from "./common";

export const conversationTypeSchema = z.enum(CONVERSATION_TYPES);
export const conversationStatusSchema = z.enum(CONVERSATION_STATUSES);

export const conversationCreateSchema = z.object({
  employeeId: z.uuid(),
  /** ISO datetime with timezone offset (e.g. `2026-01-31T09:00:00Z`). */
  scheduledAt: z.iso.datetime({ offset: true }),
  type: conversationTypeSchema.default("one_on_one"),
  status: conversationStatusSchema.default("planned"),
  mood: moodSchema,
  summary: z.string().max(10_000).optional(),
  notes: z.string().max(50_000).optional(),
});

export const conversationUpdateSchema = conversationCreateSchema
  .omit({ employeeId: true })
  .partial();

export const listConversationsSchema = paginationSchema.extend({
  employeeId: z.uuid().optional(),
  status: conversationStatusSchema.optional(),
});

export type ConversationCreateInput = z.input<typeof conversationCreateSchema>;
export type ConversationCreateData = z.output<typeof conversationCreateSchema>;
export type ConversationUpdateInput = z.infer<typeof conversationUpdateSchema>;
export type ListConversationsInput = z.infer<typeof listConversationsSchema>;

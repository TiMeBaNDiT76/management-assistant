import { z } from "zod";
import { CONVERSATION_STATUSES } from "../constants";
import { APPOINTMENT_TYPE_SEED_KEYS } from "../master-data";
import { moodSchema, paginationSchema } from "./common";

/**
 * Appointment/conversation type — validated against the machine `key`s of the
 * `appointment_type` master-data seed category (single source of truth; the
 * seed keys mirror the legacy `CONVERSATION_TYPES` enum, so the accepted wire
 * values are unchanged).
 */
export const conversationTypeSchema = z.enum(APPOINTMENT_TYPE_SEED_KEYS);

/** Lifecycle statuses of a conversation — not master-data-seeded (no category), stays a fixed enum. */
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

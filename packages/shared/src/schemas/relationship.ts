import { z } from "zod";
import { RELATIONSHIP_TYPE_SEED_KEYS } from "../master-data";
import { paginationSchema } from "./common";

/**
 * Relationship type — validated against the machine `key`s of the
 * `relationship_type` master-data seed category (single source of truth;
 * the seed keys mirror the legacy `EMPLOYEE_RELATIONSHIP_TYPES` enum, so the
 * accepted wire values are unchanged).
 */
export const relationshipTypeSchema = z.enum(RELATIONSHIP_TYPE_SEED_KEYS);

export const relationshipCreateSchema = z
  .object({
    fromEmployeeId: z.uuid(),
    toEmployeeId: z.uuid(),
    type: relationshipTypeSchema,
    notes: z.string().max(2_000).optional(),
  })
  .refine((data) => data.fromEmployeeId !== data.toEmployeeId, {
    error: "An employee cannot have a relationship to themselves.",
  });

export const listRelationshipsSchema = paginationSchema.extend({
  employeeId: z.uuid().optional(),
});

export type RelationshipCreateInput = z.infer<typeof relationshipCreateSchema>;
export type ListRelationshipsInput = z.infer<typeof listRelationshipsSchema>;

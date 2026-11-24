import { z } from "zod";
import { EMPLOYEE_RELATIONSHIP_TYPES } from "../constants";
import { paginationSchema } from "./common";

export const relationshipTypeSchema = z.enum(EMPLOYEE_RELATIONSHIP_TYPES);

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

import { z } from "zod";
import {
  employeeCreateSchema,
  employeeUpdateSchema,
  idSchema,
  listEmployeesSchema,
  listRelationshipsSchema,
  relationshipCreateSchema,
} from "@mgmt/shared";
import { protectedProcedure, router } from "../../trpc/trpc";

/** tRPC surface for the employee domain (incl. relationships). */
export const employeeRouter = router({
  list: protectedProcedure.input(listEmployeesSchema).query(({ ctx, input }) => {
    return ctx.services.employees.list(ctx.ownerUserId, input);
  }),

  getById: protectedProcedure.input(idSchema).query(({ ctx, input }) => {
    return ctx.services.employees.get(ctx.ownerUserId, input);
  }),

  create: protectedProcedure.input(employeeCreateSchema).mutation(({ ctx, input }) => {
    return ctx.services.employees.create(ctx.ownerUserId, input);
  }),

  update: protectedProcedure
    .input(z.object({ id: idSchema, data: employeeUpdateSchema }))
    .mutation(({ ctx, input }) => {
      return ctx.services.employees.update(ctx.ownerUserId, input.id, input.data);
    }),

  remove: protectedProcedure.input(idSchema).mutation(({ ctx, input }) => {
    return ctx.services.employees.remove(ctx.ownerUserId, input);
  }),

  relationships: router({
    list: protectedProcedure.input(listRelationshipsSchema).query(({ ctx, input }) => {
      return ctx.services.employees.listRelationships(ctx.ownerUserId, input);
    }),

    create: protectedProcedure.input(relationshipCreateSchema).mutation(({ ctx, input }) => {
      return ctx.services.employees.createRelationship(ctx.ownerUserId, input);
    }),
  }),
});

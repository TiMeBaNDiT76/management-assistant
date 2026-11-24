import { z } from "zod";
import {
  actionItemCreateSchema,
  actionItemUpdateSchema,
  idSchema,
  listActionItemsSchema,
} from "@mgmt/shared";
import { protectedProcedure, router } from "../../trpc/trpc";

/** tRPC surface for the action item domain. */
export const actionItemRouter = router({
  list: protectedProcedure.input(listActionItemsSchema).query(({ ctx, input }) => {
    return ctx.services.actionItems.list(ctx.ownerUserId, input);
  }),

  getById: protectedProcedure.input(idSchema).query(({ ctx, input }) => {
    return ctx.services.actionItems.get(ctx.ownerUserId, input);
  }),

  create: protectedProcedure.input(actionItemCreateSchema).mutation(({ ctx, input }) => {
    return ctx.services.actionItems.create(ctx.ownerUserId, input);
  }),

  update: protectedProcedure
    .input(z.object({ id: idSchema, data: actionItemUpdateSchema }))
    .mutation(({ ctx, input }) => {
      return ctx.services.actionItems.update(ctx.ownerUserId, input.id, input.data);
    }),

  remove: protectedProcedure.input(idSchema).mutation(({ ctx, input }) => {
    return ctx.services.actionItems.remove(ctx.ownerUserId, input);
  }),
});

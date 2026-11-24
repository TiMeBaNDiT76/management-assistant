import { z } from "zod";
import {
  conversationCreateSchema,
  conversationUpdateSchema,
  idSchema,
  listConversationsSchema,
} from "@mgmt/shared";
import { protectedProcedure, router } from "../../trpc/trpc";

/** tRPC surface for the conversation domain. */
export const conversationRouter = router({
  list: protectedProcedure.input(listConversationsSchema).query(({ ctx, input }) => {
    return ctx.services.conversations.list(ctx.ownerUserId, input);
  }),

  getById: protectedProcedure.input(idSchema).query(({ ctx, input }) => {
    return ctx.services.conversations.get(ctx.ownerUserId, input);
  }),

  create: protectedProcedure.input(conversationCreateSchema).mutation(({ ctx, input }) => {
    return ctx.services.conversations.create(ctx.ownerUserId, input);
  }),

  update: protectedProcedure
    .input(z.object({ id: idSchema, data: conversationUpdateSchema }))
    .mutation(({ ctx, input }) => {
      return ctx.services.conversations.update(ctx.ownerUserId, input.id, input.data);
    }),

  remove: protectedProcedure.input(idSchema).mutation(({ ctx, input }) => {
    return ctx.services.conversations.remove(ctx.ownerUserId, input);
  }),
});

import { z } from "zod";
import { idSchema } from "@mgmt/shared";
import { protectedProcedure, router } from "../../trpc/trpc";

/** tRPC surface for the AI co-pilot (`assistant.*`). */
export const assistantRouter = router({
  briefing: protectedProcedure
    .input(z.object({ employeeId: idSchema }))
    .query(({ ctx, input }) => {
      return ctx.services.assistant.briefing(ctx.ownerUserId, input.employeeId);
    }),

  indexConversation: protectedProcedure.input(idSchema).mutation(({ ctx, input }) => {
    return ctx.services.assistant.indexConversation(ctx.ownerUserId, input);
  }),

  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
        limit: z.number().int().min(1).max(50).default(5),
      }),
    )
    .query(({ ctx, input }) => {
      return ctx.services.assistant.search(ctx.ownerUserId, input);
    }),
});

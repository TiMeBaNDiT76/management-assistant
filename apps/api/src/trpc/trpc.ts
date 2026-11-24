import { initTRPC, TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Every business procedure must run through this guard: the tenant id comes
 * from the verified JWT and is guaranteed to be non-empty here.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.ownerUserId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required." });
  }
  return next({ ctx: { ...ctx, ownerUserId: ctx.ownerUserId } });
});

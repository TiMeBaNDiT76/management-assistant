import { z } from "zod";
import {
  idSchema,
  listMasterDataEntriesSchema,
  masterDataEntryCreateSchema,
  masterDataEntryUpdateSchema,
} from "@mgmt/shared";
import { protectedProcedure, router } from "../../trpc/trpc";

/** tRPC surface for the master data domain (Stammdaten). */
export const masterDataRouter = router({
  /** List entries of one category (defaults seeded on first call), with usage counts. */
  list: protectedProcedure.input(listMasterDataEntriesSchema).query(({ ctx, input }) => {
    return ctx.services.masterData.list(ctx.ownerUserId, input);
  }),

  /** Single entry incl. usage count. */
  get: protectedProcedure.input(idSchema).query(({ ctx, input }) => {
    return ctx.services.masterData.get(ctx.ownerUserId, input);
  }),

  create: protectedProcedure.input(masterDataEntryCreateSchema).mutation(({ ctx, input }) => {
    return ctx.services.masterData.create(ctx.ownerUserId, input);
  }),

  /** `category` and `key` are immutable; use activate/deactivate for `isActive`. */
  update: protectedProcedure
    .input(z.object({ id: idSchema, data: masterDataEntryUpdateSchema }))
    .mutation(({ ctx, input }) => {
      return ctx.services.masterData.update(ctx.ownerUserId, input.id, input.data);
    }),

  deactivate: protectedProcedure.input(idSchema).mutation(({ ctx, input }) => {
    return ctx.services.masterData.deactivate(ctx.ownerUserId, input);
  }),

  activate: protectedProcedure.input(idSchema).mutation(({ ctx, input }) => {
    return ctx.services.masterData.activate(ctx.ownerUserId, input);
  }),

  /** Hard delete — only succeeds when the entry is unreferenced (usageCount = 0). */
  remove: protectedProcedure.input(idSchema).mutation(({ ctx, input }) => {
    return ctx.services.masterData.remove(ctx.ownerUserId, input);
  }),
});

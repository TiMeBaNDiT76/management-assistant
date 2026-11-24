import type { MasterDataCategory } from "../constants";
import { MASTER_DATA_SEEDS, type MasterDataSeedEntry } from "./defaults";
import { slugifyKey } from "./slug";

/**
 * Seed-system accessors for the machine `key`s of the enum-backed categories.
 *
 * The categories `relationship_type`, `appointment_type` and `task_status`
 * were historically hard-coded enums (`EMPLOYEE_RELATIONSHIP_TYPES`,
 * `CONVERSATION_TYPES`, `ACTION_ITEM_STATUSES` in `constants.ts`). Their seed
 * keys intentionally mirror those enum values, so schemas validated against
 * the seeds accept exactly the same wire values as before (backward
 * compatible tRPC contract). Since stage 2c, consumers resolve against the
 * seeds (the single source of truth) instead of the legacy arrays.
 *
 * Every seed of an enum-backed category MUST declare an explicit `key`
 * (no slug fallback) so the derived literal unions stay exact.
 */

type SeedRow<C extends MasterDataCategory> = Extract<
  (typeof MASTER_DATA_SEEDS)[number],
  { category: C }
>;

/** Literal union of the machine `key`s seeded for category `C`. */
export type MasterDataSeedKey<C extends MasterDataCategory> =
  SeedRow<C> extends { key: infer K extends string } ? K : never;

/** Runtime lookup: machine keys seeded for `category`, in seed order. */
export function masterDataSeedKeys(category: MasterDataCategory): string[] {
  const seeds: readonly MasterDataSeedEntry[] = MASTER_DATA_SEEDS;
  return seeds
    .filter((seed) => seed.category === category)
    .map((seed) => seed.key ?? slugifyKey(seed.displayName));
}

/**
 * Non-empty, type-safe key tuple for `z.enum(...)`. Derives the accepted
 * values directly from `MASTER_DATA_SEEDS`, so schema and seeds cannot drift.
 * Throws when a category has no seeds (cannot happen for the built-in set).
 */
export function masterDataSeedKeyTuple<C extends MasterDataCategory>(
  category: C,
): [MasterDataSeedKey<C>, ...MasterDataSeedKey<C>[]] {
  const keys = masterDataSeedKeys(category);
  if (keys.length === 0) {
    throw new Error(`No master-data seeds for category "${category}"`);
  }
  return keys as [MasterDataSeedKey<C>, ...MasterDataSeedKey<C>[]];
}

/** Machine keys of the `relationship_type` seeds (was `EMPLOYEE_RELATIONSHIP_TYPES`). */
export const RELATIONSHIP_TYPE_SEED_KEYS = masterDataSeedKeyTuple("relationship_type");

/** Machine keys of the `appointment_type` seeds (was `CONVERSATION_TYPES`). */
export const APPOINTMENT_TYPE_SEED_KEYS = masterDataSeedKeyTuple("appointment_type");

/** Machine keys of the `task_status` seeds (was `ACTION_ITEM_STATUSES`). */
export const TASK_STATUS_SEED_KEYS = masterDataSeedKeyTuple("task_status");

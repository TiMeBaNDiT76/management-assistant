import { z } from "zod";
import { MASTER_DATA_CATEGORIES } from "../constants";

/**
 * Zod schemas for the generic master data (Stammdaten) module.
 *
 * `key` is the stable machine identifier (immutable after creation, generated
 * from a slug of `displayName` when omitted), `displayName` is the German
 * user-visible label. No i18n in this phase: keys stay language-neutral so a
 * later i18n layer can map them to translations.
 */

export const masterDataCategorySchema = z.enum(MASTER_DATA_CATEGORIES);

/** Stable machine key: lowercase slug with `-` or `_` separators (e.g. `one_on_one`). */
export const masterDataKeySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, "Key must be a lowercase slug (a-z, 0-9, - or _)");

const colorHexSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color must be a hex value like #22C55E");

const countryIsoSchema = z
  .string()
  .length(2)
  .regex(/^[A-Za-z]{2}$/, "Country code must be a 2-letter ISO 3166-1 alpha-2 code");

export const masterDataEntryCreateSchema = z.object({
  category: masterDataCategorySchema,
  displayName: z.string().min(1).max(200),
  /** Optional; slugified from `displayName` when omitted. Immutable after creation. */
  key: masterDataKeySchema.optional(),
  pluralLabel: z.string().max(200).nullable().optional(),
  description: z.string().max(2_000).nullable().optional(),
  colorHex: colorHexSchema.nullable().optional(),
  frequency: z.string().max(100).nullable().optional(),
  /** Only "done"-type statuses (e.g. task statuses) should set this. */
  isDone: z.boolean().optional(),
  /** Display / kanban order (asc). Appended at the end of the category when omitted. */
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  countryIso: countryIsoSchema.nullable().optional(),
  scope: z.string().max(50).nullable().optional(),
  /** ISO date (YYYY-MM-DD), e.g. holiday date. */
  date: z.iso.date().nullable().optional(),
});

/**
 * Update shape: `category` and `key` are immutable and must not be sent
 * (Zod strips unknown properties). Use the dedicated `deactivate`/`activate`
 * procedures instead of patching `isActive`.
 */
export const masterDataEntryUpdateSchema = masterDataEntryCreateSchema.omit({
  category: true,
  key: true,
});

export const listMasterDataEntriesSchema = z.object({
  category: masterDataCategorySchema,
  /** Include deactivated entries (default: only active ones). */
  includeInactive: z.boolean().default(false),
});

export type MasterDataEntryCreateInput = z.infer<typeof masterDataEntryCreateSchema>;
export type MasterDataEntryUpdateInput = z.infer<typeof masterDataEntryUpdateSchema>;
export type ListMasterDataEntriesInput = z.infer<typeof listMasterDataEntriesSchema>;

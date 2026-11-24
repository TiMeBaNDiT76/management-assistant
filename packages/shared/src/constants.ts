/** Domain constants shared between API and mobile app. */

/**
 * Types of relationships between employees (reporting lines, peers, ...).
 *
 * Typed mirror of the `relationship_type` master-data seed keys — validation
 * resolves against the seeds (`RELATIONSHIP_TYPE_SEED_KEYS`), keep this list
 * in sync with `MASTER_DATA_SEEDS` (regression-guarded by tests).
 */
export const EMPLOYEE_RELATIONSHIP_TYPES = [
  "reports_to",
  "peer",
  "stakeholder",
  "mentor",
  "informal",
] as const;
export type EmployeeRelationshipType = (typeof EMPLOYEE_RELATIONSHIP_TYPES)[number];

/**
 * Types of tracked conversations (1:1s, feedback, career, ...).
 *
 * Typed mirror of the `appointment_type` master-data seed keys — validation
 * resolves against the seeds (`APPOINTMENT_TYPE_SEED_KEYS`), keep this list
 * in sync with `MASTER_DATA_SEEDS` (regression-guarded by tests).
 */
export const CONVERSATION_TYPES = ["one_on_one", "feedback", "career", "adhoc"] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

/** Lifecycle statuses of a conversation. Not master-data-seeded (no category). */
export const CONVERSATION_STATUSES = ["planned", "completed", "cancelled"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

/**
 * Lifecycle statuses of an action item.
 *
 * Typed mirror of the `task_status` master-data seed keys — validation
 * resolves against the seeds (`TASK_STATUS_SEED_KEYS`), keep this list
 * in sync with `MASTER_DATA_SEEDS` (regression-guarded by tests).
 */
export const ACTION_ITEM_STATUSES = ["open", "in_progress", "done", "cancelled"] as const;
export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number];

/** Statuses matched by the `openOnly` list filter — everything not yet terminal. */
export const ACTION_ITEM_OPEN_STATUSES = ["open", "in_progress"] as const;

/** Default status for new action items (mirrors the `action_items.status` DB default / `task_status` seed key `open`). */
export const ACTION_ITEM_DEFAULT_STATUS = "open";

/**
 * Fixed categories of user-editable master data (Stammdaten).
 *
 * All categories live in the single `master_data_entries` table and are
 * discriminated by `category`. Existing hard-coded enums
 * (`EMPLOYEE_RELATIONSHIP_TYPES`, `CONVERSATION_TYPES`, `ACTION_ITEM_STATUSES`)
 * are seeded as entries of the categories `relationship_type`,
 * `appointment_type` and `task_status` using the enum values as stable `key`s —
 * migrating referencing tables to master data keys is therefore a no-op rename.
 */
export const MASTER_DATA_CATEGORIES = [
  "role",
  "department",
  "relationship_type",
  "appointment_type",
  "task_status",
  "location",
  "country",
  "holiday",
] as const;
export type MasterDataCategory = (typeof MASTER_DATA_CATEGORIES)[number];

/** Type guard for values read back from the `category` text column. */
export function isMasterDataCategory(value: string): value is MasterDataCategory {
  return (MASTER_DATA_CATEGORIES as readonly string[]).includes(value);
}

/** Default scope value for seeded holiday entries. */
export const MASTER_DATA_HOLIDAY_SCOPE_NATIONAL = "national";

/** Mood / sentiment scale for conversations (1 = poor, 5 = excellent). */
export const MOOD_MIN = 1;
export const MOOD_MAX = 5;

/** Dimensions of the text embedding model used for semantic search (`text-embedding-004`). */
export const EMBEDDING_DIMENSIONS = 768;

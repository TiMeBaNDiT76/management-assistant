/** Domain constants shared between API and mobile app. */

/** Types of relationships between employees (reporting lines, peers, ...). */
export const EMPLOYEE_RELATIONSHIP_TYPES = [
  "reports_to",
  "peer",
  "stakeholder",
  "mentor",
  "informal",
] as const;
export type EmployeeRelationshipType = (typeof EMPLOYEE_RELATIONSHIP_TYPES)[number];

/** Types of tracked conversations (1:1s, feedback, career, ...). */
export const CONVERSATION_TYPES = ["one_on_one", "feedback", "career", "adhoc"] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

/** Lifecycle statuses of a conversation. */
export const CONVERSATION_STATUSES = ["planned", "completed", "cancelled"] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

/** Lifecycle statuses of an action item. */
export const ACTION_ITEM_STATUSES = ["open", "in_progress", "done", "cancelled"] as const;
export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number];

/** Mood / sentiment scale for conversations (1 = poor, 5 = excellent). */
export const MOOD_MIN = 1;
export const MOOD_MAX = 5;

/** Dimensions of the text embedding model used for semantic search (`text-embedding-004`). */
export const EMBEDDING_DIMENSIONS = 768;

import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Drizzle schema for the manager's private workspace.
 *
 * IMPORTANT: every row is owned by exactly one manager account (`owner_user_id`)
 * which is extracted from the verified Firebase Auth JWT. Every query in the API
 * layer MUST filter by this column (strict tenant isolation).
 */

export const employees = sqliteTable(
  "employees",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    role: text("role"),
    department: text("department"),
    location: text("location"),
    hireDate: text("hire_date"), // ISO date (YYYY-MM-DD)
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("employees_owner_user_id_idx").on(table.ownerUserId),
    index("employees_last_first_name_idx").on(table.lastName, table.firstName),
  ],
);

export const employeeRelationships = sqliteTable(
  "employee_relationships",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    fromEmployeeId: text("from_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    toEmployeeId: text("to_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    // One of the `relationship_type` master-data seed keys (== EMPLOYEE_RELATIONSHIP_TYPES)
    type: text("type").notNull(),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("employee_relationships_owner_user_id_idx").on(table.ownerUserId),
    index("employee_relationships_from_employee_id_idx").on(table.fromEmployeeId),
    index("employee_relationships_to_employee_id_idx").on(table.toEmployeeId),
  ],
);

export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    scheduledAt: text("scheduled_at").notNull(), // ISO datetime
    // One of the `appointment_type` master-data seed keys (== CONVERSATION_TYPES)
    type: text("type").notNull().default("one_on_one"),
    // One of CONVERSATION_STATUSES
    status: text("status").notNull().default("planned"),
    mood: integer("mood"), // 1..5, see MOOD_MIN / MOOD_MAX
    summary: text("summary"),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("conversations_owner_user_id_idx").on(table.ownerUserId),
    index("conversations_employee_id_idx").on(table.employeeId),
    index("conversations_status_idx").on(table.status),
  ],
);

export const actionItems = sqliteTable(
  "action_items",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    conversationId: text("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    employeeId: text("employee_id").references(() => employees.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    // One of the `task_status` master-data seed keys (== ACTION_ITEM_STATUSES)
    status: text("status").notNull().default("open"),
    dueDate: text("due_date"), // ISO date (YYYY-MM-DD)
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("action_items_owner_user_id_idx").on(table.ownerUserId),
    index("action_items_status_idx").on(table.status),
    index("action_items_conversation_id_idx").on(table.conversationId),
    index("action_items_employee_id_idx").on(table.employeeId),
  ],
);

/**
 * Generic master data (Stammdaten): roles, departments, relationship types,
 * appointment types, task statuses, locations, countries and holidays.
 *
 * A single table with a `category` discriminator. `key` is the stable machine
 * identifier (immutable, unique per tenant+category), `display_name` is the
 * user-visible label (unique per tenant+category, case-insensitive — enforced
 * via an expression index on `lower(display_name)`). Entries that are referenced
 * by other tables must be deactivated instead of deleted (reference protection
 * is enforced in the API layer via cross-table usage counts).
 */
export const masterDataEntries = sqliteTable(
  "master_data_entries",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    // One of MASTER_DATA_CATEGORIES
    category: text("category").notNull(),
    /** Stable machine key (slug), immutable after creation. */
    key: text("key").notNull(),
    displayName: text("display_name").notNull(),
    pluralLabel: text("plural_label"),
    description: text("description"),
    /** Optional kanban/badge color, `#rgb` or `#rrggbb`. */
    colorHex: text("color_hex"),
    /** Optional recurrence label, mainly for appointment types. */
    frequency: text("frequency"),
    /** Task-status semantics: only "done"-type statuses end a task. */
    isDone: integer("is_done", { mode: "boolean" }).notNull().default(false),
    /** Deactivate instead of delete when the entry is still referenced. */
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    /** Stable display/kanban column order (asc). */
    sortOrder: integer("sort_order").notNull().default(0),
    /** ISO 3166-1 alpha-2 country code (countries + holidays). */
    countryIso: text("country_iso"),
    /** Holiday scope, e.g. "national" / "regional". */
    scope: text("scope"),
    /** Holiday date (ISO date YYYY-MM-DD). */
    date: text("date"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("master_data_entries_owner_user_id_idx").on(table.ownerUserId),
    index("master_data_entries_owner_category_idx").on(table.ownerUserId, table.category),
    uniqueIndex("master_data_entries_owner_category_key_uq").on(
      table.ownerUserId,
      table.category,
      table.key,
    ),
    uniqueIndex("master_data_entries_owner_category_display_name_uq").on(
      table.ownerUserId,
      table.category,
      sql`lower(${table.displayName})`,
    ),
  ],
);

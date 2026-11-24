import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
    // One of EMPLOYEE_RELATIONSHIP_TYPES
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
    // One of CONVERSATION_TYPES
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
    // One of ACTION_ITEM_STATUSES
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

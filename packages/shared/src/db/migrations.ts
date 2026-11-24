import { sql } from "drizzle-orm";
import type { AppDatabase } from "./types";

/**
 * Idempotent DDL migrations for the management-assistant SQLite database.
 *
 * The embeddings virtual table (sqlite-vec `vec0`) is created separately in
 * `vector.ts` because it depends on the sqlite-vec extension being loaded.
 */

const STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  role TEXT,
  department TEXT,
  location TEXT,
  hire_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS employees_owner_user_id_idx ON employees (owner_user_id)`,
  `CREATE INDEX IF NOT EXISTS employees_last_first_name_idx ON employees (last_name, first_name)`,

  `CREATE TABLE IF NOT EXISTS employee_relationships (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL,
  from_employee_id TEXT NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  to_employee_id TEXT NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS employee_relationships_owner_user_id_idx ON employee_relationships (owner_user_id)`,
  `CREATE INDEX IF NOT EXISTS employee_relationships_from_employee_id_idx ON employee_relationships (from_employee_id)`,
  `CREATE INDEX IF NOT EXISTS employee_relationships_to_employee_id_idx ON employee_relationships (to_employee_id)`,

  `CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL,
  employee_id TEXT NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  scheduled_at TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'one_on_one',
  status TEXT NOT NULL DEFAULT 'planned',
  mood INTEGER,
  summary TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS conversations_owner_user_id_idx ON conversations (owner_user_id)`,
  `CREATE INDEX IF NOT EXISTS conversations_employee_id_idx ON conversations (employee_id)`,
  `CREATE INDEX IF NOT EXISTS conversations_status_idx ON conversations (status)`,

  `CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL,
  conversation_id TEXT REFERENCES conversations (id) ON DELETE CASCADE,
  employee_id TEXT REFERENCES employees (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS action_items_owner_user_id_idx ON action_items (owner_user_id)`,
  `CREATE INDEX IF NOT EXISTS action_items_status_idx ON action_items (status)`,
  `CREATE INDEX IF NOT EXISTS action_items_conversation_id_idx ON action_items (conversation_id)`,
  `CREATE INDEX IF NOT EXISTS action_items_employee_id_idx ON action_items (employee_id)`,
];

/**
 * Applies all DDL statements. Safe to run repeatedly (idempotent).
 * Runs synchronously because better-sqlite3 is synchronous.
 */
export function applyMigrations(db: AppDatabase): void {
  db.run(sql.raw("PRAGMA foreign_keys = ON"));
  for (const statement of STATEMENTS) {
    db.run(sql.raw(statement));
  }
}

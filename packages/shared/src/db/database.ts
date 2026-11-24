import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { applyMigrations } from "./migrations";
import * as schema from "./schema";
import type { AppDatabase, SqliteConnection } from "./types";

export interface InitializeDatabaseOptions {
  /**
   * SQLite file path. Use `":memory:"` (default) for fast isolated tests.
   * Cloud Run uses a Litestream-restored file under `/data`.
   */
  filename?: string;
  /** Try to load the sqlite-vec extension for vector embeddings (default: true). */
  withVectorExtension?: boolean;
}

export interface AppDatabaseHandle {
  db: AppDatabase;
  /** Raw connection — keep for pragmas, sqlite-vec, and explicit cleanup. */
  sqlite: SqliteConnection;
  /** True when the sqlite-vec extension loaded successfully. */
  vectorAvailable: boolean;
}

/**
 * Opens a SQLite connection with the mandatory pragmas for SQLite + Litestream:
 * `journal_mode = WAL`, `synchronous = NORMAL`, `busy_timeout = 5000`.
 * WAL is meaningless for `:memory:` databases and therefore skipped there.
 */
export function createSqliteDatabase(filename: string = ":memory:"): SqliteConnection {
  if (filename !== ":memory:") {
    mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  }
  const sqlite = new Database(filename);
  if (filename !== ":memory:") {
    sqlite.pragma("journal_mode = WAL");
  }
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

/**
 * Loads the sqlite-vec extension. Returns false (instead of throwing) when the
 * native extension is unavailable for the current platform, so the rest of the
 * application keeps working without semantic search.
 */
export function loadVectorExtension(sqlite: SqliteConnection): boolean {
  try {
    sqliteVec.load(sqlite);
    return true;
  } catch {
    return false;
  }
}

export function createDrizzleDatabase(sqlite: SqliteConnection): AppDatabase {
  return drizzle(sqlite, { schema });
}

/**
 * Bootstraps a fully migrated database (and loads sqlite-vec when available).
 * Synchronous — better-sqlite3 has no async API.
 */
export function initializeDatabase(
  options: InitializeDatabaseOptions = {},
): AppDatabaseHandle {
  const { filename = ":memory:", withVectorExtension = true } = options;
  const sqlite = createSqliteDatabase(filename);
  const vectorAvailable = withVectorExtension ? loadVectorExtension(sqlite) : false;
  const db = createDrizzleDatabase(sqlite);
  applyMigrations(db);
  return { db, sqlite, vectorAvailable };
}

export { schema };

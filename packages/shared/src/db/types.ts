import type BetterSqlite3 from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "./schema";

/** Drizzle database handle bound to the shared SQLite schema. */
export type AppDatabase = BetterSQLite3Database<typeof schema>;

/** Raw better-sqlite3 connection (used for pragmas and sqlite-vec). */
export type SqliteConnection = BetterSqlite3.Database;

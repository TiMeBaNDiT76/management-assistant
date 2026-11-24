import type { SqliteConnection } from "./types";
import { EMBEDDING_DIMENSIONS } from "../constants";

/**
 * sqlite-vec (`vec0`) support for semantic search across past conversations.
 *
 * The virtual table is created with raw DDL because Drizzle has no first-class
 * vec0 support. `owner_user_id` is stored as a METADATA column when the
 * installed sqlite-vec version supports it, and as an AUXILIARY (`+`) column
 * as a fallback. Tenant filtering is additionally applied in JS so both modes
 * behave identically.
 */

export type EmbeddingsTableMode = "metadata" | "auxiliary";

export interface EmbeddingRecordInput {
  id: string;
  ownerUserId: string;
  vector: readonly number[];
}

export interface EmbeddingSearchInput {
  queryVector: readonly number[];
  /** Optional tenant filter; applied in JS for both table modes. */
  ownerUserId?: string;
  limit?: number;
}

export interface EmbeddingSearchHit {
  id: string;
  ownerUserId: string;
  distance: number;
}

export function ensureEmbeddingsTable(
  sqlite: SqliteConnection,
  dimensions: number = EMBEDDING_DIMENSIONS,
): EmbeddingsTableMode | null {
  const candidates: ReadonlyArray<{ mode: EmbeddingsTableMode; ddl: string }> = [
    {
      mode: "metadata",
      ddl: `CREATE VIRTUAL TABLE IF NOT EXISTS embeddings USING vec0(
  id TEXT PRIMARY KEY,
  owner_user_id TEXT METADATA,
  embedding float[${dimensions}]
)`,
    },
    {
      mode: "auxiliary",
      ddl: `CREATE VIRTUAL TABLE IF NOT EXISTS embeddings USING vec0(
  id TEXT PRIMARY KEY,
  +owner_user_id TEXT,
  embedding float[${dimensions}]
)`,
    },
  ];
  for (const candidate of candidates) {
    try {
      sqlite.exec(candidate.ddl);
      return candidate.mode;
    } catch {
      // try the next column mode (older sqlite-vec releases)
    }
  }
  return null;
}

/** Inserts or replaces a vector for `id`. */
export function upsertEmbedding(sqlite: SqliteConnection, record: EmbeddingRecordInput): void {
  const insert = sqlite.prepare(
    "INSERT INTO embeddings (id, owner_user_id, embedding) VALUES (?, ?, ?)",
  );
  const remove = sqlite.prepare("DELETE FROM embeddings WHERE id = ?");
  sqlite.transaction(() => {
    remove.run(record.id);
    insert.run(record.id, record.ownerUserId, JSON.stringify(record.vector));
  })();
}

export function deleteEmbedding(sqlite: SqliteConnection, id: string): void {
  sqlite.prepare("DELETE FROM embeddings WHERE id = ?").run(id);
}

/**
 * K-nearest-neighbour search via `MATCH`. Tenant isolation is enforced in JS
 * (both METADATA and AUXILIARY column modes behave the same way).
 */
export function searchEmbeddings(
  sqlite: SqliteConnection,
  input: EmbeddingSearchInput,
): EmbeddingSearchHit[] {
  const { queryVector, ownerUserId, limit = 10 } = input;
  const rows = sqlite
    .prepare(
      "SELECT id, owner_user_id AS ownerUserId, distance FROM embeddings WHERE embedding MATCH ? AND k = ?",
    )
    .all(JSON.stringify(queryVector), limit) as Array<{
    id: string;
    ownerUserId: string | null;
    distance: number;
  }>;

  return rows
    .filter((row) => (ownerUserId ? row.ownerUserId === ownerUserId : true))
    .map((row) => ({
      id: row.id,
      ownerUserId: row.ownerUserId ?? "",
      distance: Number(row.distance),
    }));
}

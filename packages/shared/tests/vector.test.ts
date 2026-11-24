import { beforeAll, describe, expect, it } from "vitest";
import { initializeDatabase } from "../src";
import {
  deleteEmbedding,
  ensureEmbeddingsTable,
  searchEmbeddings,
  upsertEmbedding,
} from "../src/db/vector";
import type { SqliteConnection } from "../src/db/types";

const handle = initializeDatabase();
const { vectorAvailable } = handle;
let sqlite: SqliteConnection;
let mode: ReturnType<typeof ensureEmbeddingsTable>;

beforeAll(() => {
  sqlite = handle.sqlite;
  mode = ensureEmbeddingsTable(sqlite);
});

describe.skipIf(!vectorAvailable)("sqlite-vec vector search", () => {
  it("creates the embeddings virtual table", () => {
    expect(mode).not.toBeNull();
  });

  it("returns nearest neighbours ordered by distance", () => {
    if (!mode) throw new Error("embeddings table missing");
    // Base vector, near query, and far query (768 dims, sparse for brevity).
    const dims = 768;
    const base = new Array<number>(dims).fill(0);
    base[0] = 1;
    const near = new Array<number>(dims).fill(0);
    near[0] = 0.9;
    const far = new Array<number>(dims).fill(0);
    far[5] = 1;

    upsertEmbedding(sqlite, { id: "conv-near", ownerUserId: "owner-a", vector: near });
    upsertEmbedding(sqlite, { id: "conv-far", ownerUserId: "owner-a", vector: far });

    const hits = searchEmbeddings(sqlite, {
      queryVector: base,
      ownerUserId: "owner-a",
      limit: 2,
    });
    expect(hits[0]?.id).toBe("conv-near");
    expect(hits.map((hit) => hit.id)).toContain("conv-far");
  });

  it("filters other tenants out of results", () => {
    if (!mode) throw new Error("embeddings table missing");
    const dims = 768;
    const query = new Array<number>(dims).fill(0);
    query[0] = 1;
    const other = new Array<number>(dims).fill(0);
    other[0] = 1;

    upsertEmbedding(sqlite, { id: "conv-other", ownerUserId: "owner-b", vector: other });

    const hits = searchEmbeddings(sqlite, {
      queryVector: query,
      ownerUserId: "owner-a",
      limit: 10,
    });
    expect(hits.find((hit) => hit.id === "conv-other")).toBeUndefined();
  });

  it("removes embeddings by id", () => {
    if (!mode) throw new Error("embeddings table missing");
    const vector = new Array<number>(768).fill(0);
    upsertEmbedding(sqlite, { id: "conv-to-delete", ownerUserId: "owner-a", vector });
    deleteEmbedding(sqlite, "conv-to-delete");

    const hits = searchEmbeddings(sqlite, { queryVector: vector, limit: 100 });
    expect(hits.find((hit) => hit.id === "conv-to-delete")).toBeUndefined();
  });
});

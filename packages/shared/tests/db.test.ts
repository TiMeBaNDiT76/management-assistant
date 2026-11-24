import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createSqliteDatabase, initializeDatabase } from "../src";
import { employees } from "../src/db/schema";

describe("initializeDatabase", () => {
  it("applies migrations to an in-memory database", () => {
    const { sqlite, vectorAvailable } = initializeDatabase();

    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;

    for (const table of ["employees", "employee_relationships", "conversations", "action_items"]) {
      expect(tables.map((t) => t.name)).toContain(table);
    }
    expect(typeof vectorAvailable).toBe("boolean");
  });

  it("keeps WAL pragmas intact for file databases", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "mgmt-shared-"));
    try {
      const filename = path.join(dir, "pragma-test.db");
      const sqlite = createSqliteDatabase(filename);
      expect(sqlite.pragma("journal_mode", { simple: true })).toBe("wal");
      expect(sqlite.pragma("busy_timeout", { simple: true })).toBe(5000);
      expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
      sqlite.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("supports basic inserts and tenant-scoped reads via drizzle", () => {
    const { db } = initializeDatabase();
    db.insert(employees)
      .values({
        id: crypto.randomUUID(),
        ownerUserId: "owner-a",
        firstName: "Alex",
        lastName: "Muster",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      })
      .run();

    const ownerARows = db
      .select()
      .from(employees)
      .where(eq(employees.ownerUserId, "owner-a"))
      .all();
    const ownerBRows = db
      .select()
      .from(employees)
      .where(eq(employees.ownerUserId, "owner-b"))
      .all();

    expect(ownerARows).toHaveLength(1);
    expect(ownerARows[0]?.firstName).toBe("Alex");
    expect(ownerBRows).toHaveLength(0);
  });
});

afterAll(() => {
  // nothing to clean up for in-memory databases
});

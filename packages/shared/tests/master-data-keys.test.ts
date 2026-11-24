import { describe, expect, it, vi } from "vitest";
import {
  ACTION_ITEM_DEFAULT_STATUS,
  ACTION_ITEM_OPEN_STATUSES,
  ACTION_ITEM_STATUSES,
  CONVERSATION_TYPES,
  EMPLOYEE_RELATIONSHIP_TYPES,
  MASTER_DATA_CATEGORIES,
} from "../src/constants";
import type { MasterDataCategory } from "../src/constants";
import type * as MasterDataDefaults from "../src/master-data/defaults";
import {
  APPOINTMENT_TYPE_SEED_KEYS,
  MASTER_DATA_SEEDS,
  RELATIONSHIP_TYPE_SEED_KEYS,
  TASK_STATUS_SEED_KEYS,
  masterDataSeedKeyTuple,
  masterDataSeedKeys,
  slugifyKey,
} from "../src/master-data";
import {
  actionItemStatusSchema,
  conversationTypeSchema,
  relationshipTypeSchema,
} from "../src/schemas";

/** Expected keys of one category, computed independently from the seed rows. */
function expectedSeedKeys(category: MasterDataCategory): string[] {
  const keys: string[] = [];
  for (const seed of MASTER_DATA_SEEDS) {
    if (seed.category !== category) continue;
    // Destructure before `??` — in its right operand TS back-narrows `seed`
    // to `never` (`seed.key` is never nullish on the `as const` seeds).
    const { key, displayName } = seed;
    keys.push(key ?? slugifyKey(displayName));
  }
  return keys;
}

describe("seed keys vs legacy enums (regression guard)", () => {
  it("RELATIONSHIP_TYPE_SEED_KEYS mirrors EMPLOYEE_RELATIONSHIP_TYPES exactly", () => {
    expect([...RELATIONSHIP_TYPE_SEED_KEYS]).toEqual([...EMPLOYEE_RELATIONSHIP_TYPES]);
  });

  it("APPOINTMENT_TYPE_SEED_KEYS mirrors CONVERSATION_TYPES exactly", () => {
    expect([...APPOINTMENT_TYPE_SEED_KEYS]).toEqual([...CONVERSATION_TYPES]);
  });

  it("TASK_STATUS_SEED_KEYS mirrors ACTION_ITEM_STATUSES exactly", () => {
    expect([...TASK_STATUS_SEED_KEYS]).toEqual([...ACTION_ITEM_STATUSES]);
  });
});

describe("masterDataSeedKeys", () => {
  it("covers all 8 master-data categories with at least one seed", () => {
    expect(MASTER_DATA_CATEGORIES).toHaveLength(8);
    for (const category of MASTER_DATA_CATEGORIES) {
      expect(masterDataSeedKeys(category).length).toBeGreaterThan(0);
    }
  });

  it.each(MASTER_DATA_CATEGORIES)(
    "returns exactly the seed keys of %s, in seed order",
    (category) => {
      expect(masterDataSeedKeys(category)).toEqual(expectedSeedKeys(category));
    },
  );

  it("returns no keys for an unknown category", () => {
    expect(masterDataSeedKeys("no_such_category" as MasterDataCategory)).toEqual([]);
  });
});

describe("masterDataSeedKeyTuple", () => {
  it("returns a non-empty tuple matching masterDataSeedKeys for every category", () => {
    for (const category of MASTER_DATA_CATEGORIES) {
      const tuple = masterDataSeedKeyTuple(category);
      expect(tuple.length).toBeGreaterThan(0);
      expect(tuple).toEqual(masterDataSeedKeys(category));
    }
  });

  it("throws for a category without seeds", () => {
    expect(() => masterDataSeedKeyTuple("no_such_category" as MasterDataCategory)).toThrow(
      'No master-data seeds for category "no_such_category"',
    );
  });

  it("fails at module load when an enum-backed category has no seeds", async () => {
    vi.resetModules();
    vi.doMock("../src/master-data/defaults", async () => {
      const actual = await vi.importActual<typeof MasterDataDefaults>(
        "../src/master-data/defaults",
      );
      return {
        ...actual,
        MASTER_DATA_SEEDS: actual.MASTER_DATA_SEEDS.filter(
          (seed) => seed.category !== "relationship_type",
        ),
      };
    });
    try {
      await expect(import("../src/master-data/keys")).rejects.toThrow(
        'No master-data seeds for category "relationship_type"',
      );
    } finally {
      vi.doUnmock("../src/master-data/defaults");
      vi.resetModules();
    }
  });
});

describe("enum-backed seed categories", () => {
  const enumCategories = ["relationship_type", "appointment_type", "task_status"] as const;

  it.each(enumCategories)(
    "every %s seed declares an explicit key (no slug fallback)",
    (category) => {
      const seeds = MASTER_DATA_SEEDS.filter((seed) => seed.category === category);
      expect(seeds.length).toBeGreaterThan(0);
      for (const seed of seeds) {
        expect(seed.key).toBeDefined();
        expect(typeof seed.key).toBe("string");
      }
    },
  );
});

describe("wire contract: schemas accept exactly the seed keys", () => {
  it("relationshipTypeSchema accepts every relationship_type seed key", () => {
    for (const key of RELATIONSHIP_TYPE_SEED_KEYS) {
      expect(relationshipTypeSchema.safeParse(key).success).toBe(true);
    }
  });

  it("relationshipTypeSchema rejects a value outside the seed set", () => {
    expect(relationshipTypeSchema.safeParse("manager").success).toBe(false);
  });

  it("relationshipTypeSchema options match the seed keys in order", () => {
    expect([...relationshipTypeSchema.options]).toEqual([...RELATIONSHIP_TYPE_SEED_KEYS]);
  });

  it("conversationTypeSchema accepts every appointment_type seed key", () => {
    for (const key of APPOINTMENT_TYPE_SEED_KEYS) {
      expect(conversationTypeSchema.safeParse(key).success).toBe(true);
    }
  });

  it("conversationTypeSchema rejects a value outside the seed set", () => {
    expect(conversationTypeSchema.safeParse("weekly").success).toBe(false);
  });

  it("conversationTypeSchema options match the seed keys in order", () => {
    expect([...conversationTypeSchema.options]).toEqual([...APPOINTMENT_TYPE_SEED_KEYS]);
  });

  it("actionItemStatusSchema accepts every task_status seed key", () => {
    for (const key of TASK_STATUS_SEED_KEYS) {
      expect(actionItemStatusSchema.safeParse(key).success).toBe(true);
    }
  });

  it("actionItemStatusSchema rejects a value outside the seed set", () => {
    expect(actionItemStatusSchema.safeParse("archived").success).toBe(false);
  });

  it("actionItemStatusSchema options match the seed keys in order", () => {
    expect([...actionItemStatusSchema.options]).toEqual([...TASK_STATUS_SEED_KEYS]);
  });
});

describe("action-item status constants", () => {
  it("ACTION_ITEM_DEFAULT_STATUS is a seeded task status", () => {
    expect(TASK_STATUS_SEED_KEYS).toContain(ACTION_ITEM_DEFAULT_STATUS);
  });

  it("ACTION_ITEM_OPEN_STATUSES are all seeded task statuses", () => {
    for (const status of ACTION_ITEM_OPEN_STATUSES) {
      expect(TASK_STATUS_SEED_KEYS).toContain(status);
    }
  });

  it("ACTION_ITEM_DEFAULT_STATUS counts as an open status", () => {
    expect(ACTION_ITEM_OPEN_STATUSES).toContain(ACTION_ITEM_DEFAULT_STATUS);
  });

  it("ACTION_ITEM_OPEN_STATUSES excludes terminal statuses", () => {
    expect(ACTION_ITEM_OPEN_STATUSES).not.toContain("done");
    expect(ACTION_ITEM_OPEN_STATUSES).not.toContain("cancelled");
  });
});

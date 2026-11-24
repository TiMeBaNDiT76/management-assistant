import { describe, expect, it } from "@jest/globals";
import {
  MASTER_DATA_CATEGORY_META,
  MASTER_DATA_CATEGORY_ORDER,
  formatIsoDate,
  formatUsageCount,
  getMasterDataErrorMessage,
  isHexColor,
} from "../../src/lib/master-data-ui";

describe("formatUsageCount", () => {
  const unit = { singular: "Person", plural: "Personen" };

  it("uses the plural for zero", () => {
    expect(formatUsageCount(0, unit)).toBe("0 Personen");
  });

  it("uses the singular for exactly one", () => {
    expect(formatUsageCount(1, unit)).toBe("1 Person");
  });

  it("uses the plural for larger counts", () => {
    expect(formatUsageCount(2, unit)).toBe("2 Personen");
    expect(formatUsageCount(42, unit)).toBe("42 Personen");
  });

  it("formats relationship units", () => {
    expect(
      formatUsageCount(1, { singular: "Beziehung", plural: "Beziehungen" }),
    ).toBe("1 Beziehung");
    expect(
      formatUsageCount(3, { singular: "Beziehung", plural: "Beziehungen" }),
    ).toBe("3 Beziehungen");
  });
});

describe("formatIsoDate", () => {
  it("converts ISO dates to the German display format", () => {
    expect(formatIsoDate("2026-01-01")).toBe("01.01.2026");
    expect(formatIsoDate("2026-12-24")).toBe("24.12.2026");
  });

  it("returns an empty string for empty input", () => {
    expect(formatIsoDate(null)).toBe("");
    expect(formatIsoDate(undefined)).toBe("");
    expect(formatIsoDate("")).toBe("");
  });

  it("falls back to the raw value for non-ISO input", () => {
    expect(formatIsoDate("01.02.2026")).toBe("01.02.2026");
    expect(formatIsoDate("coming soon")).toBe("coming soon");
  });
});

describe("isHexColor", () => {
  it.each([
    ["#22C55E", true],
    ["#3B82F6", true],
    ["#F59", true],
    ["#fff", true],
    ["#ABCDEF", true],
    ["  #94A3B8  ", true],
    ["", false],
    ["#", false],
    ["22C55E", false],
    ["#GGHHII", false],
    ["#12345", false],
    ["#1234567", false],
    ["blue", false],
  ])('isHexColor("%s") → %s', (value, expected) => {
    expect(isHexColor(value)).toBe(expected);
  });
});

describe("getMasterDataErrorMessage", () => {
  it("maps a name CONFLICT to the short duplicate-name message", () => {
    const error = trpcError(
      "CONFLICT",
      'An entry with the name "Rolle A" already exists in this category',
    );
    expect(getMasterDataErrorMessage(error)).toBe("Name bereits vorhanden");
  });

  it("maps a key CONFLICT to the duplicate-key message", () => {
    const error = trpcError(
      "CONFLICT",
      'An entry with the key "rolle-a" already exists in this category',
    );
    expect(getMasterDataErrorMessage(error)).toContain(
      "Schlüssel bereits vorhanden",
    );
  });

  it("maps the delete-protection CONFLICT to the deactivate-instead message", () => {
    const error = trpcError(
      "CONFLICT",
      "Entry is used by 2 record(s) and cannot be deleted — deactivate it instead",
    );
    expect(getMasterDataErrorMessage(error)).toContain(
      "kann nicht gelöscht werden",
    );
    expect(getMasterDataErrorMessage(error)).toContain("deaktiviere ihn stattdessen");
  });

  it("maps NOT_FOUND to the disappeared-entry message", () => {
    expect(getMasterDataErrorMessage(trpcError("NOT_FOUND", "not found"))).toContain(
      "Eintrag nicht gefunden",
    );
  });

  it("maps authorization errors to the permission message", () => {
    expect(
      getMasterDataErrorMessage(trpcError("UNAUTHORIZED", "Authentication required.")),
    ).toBe("Keine Berechtigung für diese Aktion.");
    expect(
      getMasterDataErrorMessage(trpcError("FORBIDDEN", "Forbidden")),
    ).toBe("Keine Berechtigung für diese Aktion.");
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(getMasterDataErrorMessage(new Error("boom"))).toBe(
      "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.",
    );
    expect(getMasterDataErrorMessage(undefined)).toBe(
      "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.",
    );
  });
});

/** Builds an error shaped like a client-side tRPC error. */
function trpcError(code: string, message: string): Error & { data: { code: string } } {
  return Object.assign(new Error(message), { data: { code } });
}

describe("category metadata", () => {
  it("lists exactly the 8 mockup categories in overview order", () => {
    expect(MASTER_DATA_CATEGORY_ORDER).toEqual([
      "location",
      "role",
      "department",
      "relationship_type",
      "appointment_type",
      "task_status",
      "holiday",
      "country",
    ]);
  });

  it("provides unique editor routes and German titles for every category", () => {
    const routes = MASTER_DATA_CATEGORY_ORDER.map(
      (category) => MASTER_DATA_CATEGORY_META[category].editorRoute,
    );
    expect(new Set(routes).size).toBe(MASTER_DATA_CATEGORY_ORDER.length);
    for (const category of MASTER_DATA_CATEGORY_ORDER) {
      const meta = MASTER_DATA_CATEGORY_META[category];
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.editorRoute.startsWith("/stammdaten/")).toBe(true);
      expect(meta.manageLabel.length).toBeGreaterThan(0);
    }
  });
});

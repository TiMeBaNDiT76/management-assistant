import { describe, expect, it } from "@jest/globals";
import {
  cardGridColumns,
  isWideLayout,
  showColorLabel,
  showUsageColumn,
} from "./responsive";

describe("cardGridColumns (stammdaten-app.html: 4 → 2 → 1)", () => {
  it.each([
    [320, 1],
    [560, 1], // max-width: 560 → single column
    [561, 2],
    [750, 2],
    [1050, 2], // max-width: 1050 → two columns
    [1051, 4],
    [1440, 4],
  ] as const)("uses %i columns at %ipx", (width, expected) => {
    expect(cardGridColumns(width)).toBe(expected);
  });
});

describe("isWideLayout", () => {
  it("switches to the two-column split at 1050px", () => {
    expect(isWideLayout(1049)).toBe(false);
    expect(isWideLayout(1050)).toBe(true);
  });
});

describe("task-status row columns (stammdaten-taskstatus.html)", () => {
  it("hides the usage column at ≤900px", () => {
    expect(showUsageColumn(900)).toBe(false);
    expect(showUsageColumn(901)).toBe(true);
  });

  it("hides the color label at ≤620px", () => {
    expect(showColorLabel(620)).toBe(false);
    expect(showColorLabel(621)).toBe(true);
  });
});

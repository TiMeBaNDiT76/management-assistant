import { describe, expect, it } from "@jest/globals";
import { initialsForName } from "./initials";

describe("initialsForName", () => {
  it("returns the first letters uppercased", () => {
    expect(initialsForName("Ada", "Lovelace")).toBe("AL");
  });

  it("trims whitespace", () => {
    expect(initialsForName("  Ada ", " Lovelace ")).toBe("AL");
  });

  it("handles single-character names", () => {
    expect(initialsForName("A", "B")).toBe("AB");
  });
});

import { describe, expect, it } from "@jest/globals";
import { greetingForHour } from "./useGreeting";

describe("greetingForHour", () => {
  it.each([
    [4, "Gute Nacht"],
    [5, "Guten Morgen"],
    [10, "Guten Morgen"],
    [11, "Hallo"],
    [17, "Hallo"],
    [18, "Guten Abend"],
    [23, "Guten Abend"],
  ])("greets with %i o'clock as '%s'", (hour, expected) => {
    expect(greetingForHour(hour)).toBe(expected);
  });
});

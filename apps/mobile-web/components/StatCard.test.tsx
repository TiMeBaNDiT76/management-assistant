import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders value and label", async () => {
    await render(<StatCard value="12" label="Offene Aufgaben" />);
    expect(screen.getByText("12")).toBeOnTheScreen();
    expect(screen.getByText("Offene Aufgaben")).toBeOnTheScreen();
  });
});

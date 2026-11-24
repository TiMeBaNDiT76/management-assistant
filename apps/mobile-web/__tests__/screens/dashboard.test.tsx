import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import DashboardScreen from "../../app/(tabs)/index";

describe("DashboardScreen", () => {
  it("renders greeting, KPI cards and briefing teaser", async () => {
    await render(<DashboardScreen />);

    expect(screen.getByText(/Deine Woche im Überblick/)).toBeOnTheScreen();
    expect(screen.getByText("Teammitglieder")).toBeOnTheScreen();
    expect(screen.getByText("Offene Aufgaben")).toBeOnTheScreen();
    expect(screen.getByText("1:1s diese Woche")).toBeOnTheScreen();
    expect(screen.getByText("KI-Briefing")).toBeOnTheScreen();
  });

  it("counts only unfinished tasks as open", async () => {
    await render(<DashboardScreen />);
    // 3 fixture items, one is done → 2 open
    expect(screen.getAllByText("2")).not.toHaveLength(0);
  });
});

import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import TasksScreen from "./tasks";

describe("TasksScreen", () => {
  it("renders the header and sample action items", async () => {
    await render(<TasksScreen />);

    expect(screen.getByText("Aufgaben")).toBeOnTheScreen();
    expect(screen.getByText("Vorbereitung Jahresgespräch Lena")).toBeOnTheScreen();
    expect(screen.getByText("Feedback zu Onboarding-Plan senden")).toBeOnTheScreen();
    expect(screen.getByText("In Arbeit")).toBeOnTheScreen();
    expect(screen.getByText("Erledigt")).toBeOnTheScreen();
  });
});

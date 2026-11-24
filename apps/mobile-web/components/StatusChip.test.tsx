import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import { StatusChip } from "./StatusChip";

describe("StatusChip", () => {
  it("renders its label", async () => {
    await render(<StatusChip label="Offen" tone="warning" />);
    expect(screen.getByText("Offen")).toBeOnTheScreen();
  });

  it("renders with default tone", async () => {
    await render(<StatusChip label="Berlin" />);
    expect(screen.getByText("Berlin")).toBeOnTheScreen();
  });
});

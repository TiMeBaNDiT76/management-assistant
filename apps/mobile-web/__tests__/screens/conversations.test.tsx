import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import ConversationsScreen from "../../app/(tabs)/conversations";

describe("ConversationsScreen", () => {
  it("renders the header and sample conversations", async () => {
    await render(<ConversationsScreen />);

    expect(screen.getByText("Gespräche")).toBeOnTheScreen();
    expect(screen.getByText("Lena Fischer")).toBeOnTheScreen();
    expect(screen.getByText("Tom Weber")).toBeOnTheScreen();
    expect(screen.getByText("Stimmung 4/5")).toBeOnTheScreen();
    expect(screen.getByText("1:1")).toBeOnTheScreen();
  });
});

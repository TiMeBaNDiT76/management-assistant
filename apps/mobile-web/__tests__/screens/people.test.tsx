import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import PeopleScreen from "../../app/(tabs)/people";

describe("PeopleScreen", () => {
  it("renders the header and all sample employees", async () => {
    await render(<PeopleScreen />);

    expect(screen.getByText("Menschen")).toBeOnTheScreen();
    expect(screen.getByText("Lena Fischer")).toBeOnTheScreen();
    expect(screen.getByText("Tom Weber")).toBeOnTheScreen();
    expect(screen.getByText("Mara Santos")).toBeOnTheScreen();
    expect(screen.getByText("Senior Consultant")).toBeOnTheScreen();
  });
});

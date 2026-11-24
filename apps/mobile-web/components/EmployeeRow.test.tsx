import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import { EmployeeRow } from "./EmployeeRow";

describe("EmployeeRow", () => {
  const employee = {
    id: "1",
    firstName: "Lena",
    lastName: "Fischer",
    role: "Senior Consultant",
    location: "Berlin",
  };

  it("renders full name, role, initials and location chip", async () => {
    await render(<EmployeeRow employee={employee} />);
    expect(screen.getByText("Lena Fischer")).toBeOnTheScreen();
    expect(screen.getByText("Senior Consultant")).toBeOnTheScreen();
    expect(screen.getByText("LF")).toBeOnTheScreen();
    expect(screen.getByText("Berlin")).toBeOnTheScreen();
  });

  it("omits the location chip when no location is given", async () => {
    await render(<EmployeeRow employee={{ ...employee, location: undefined }} />);
    expect(screen.queryByText("Berlin")).toBeNull();
  });
});

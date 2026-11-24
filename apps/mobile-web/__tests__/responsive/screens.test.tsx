/**
 * Breakpoint behavior of the screens — the window width is driven through
 * `Dimensions.set` (the same mechanism `useWindowDimensions` listens to).
 * The layout itself is class/style-driven; tests assert on measurable output
 * (grid row chunks / hidden columns) instead of pixel measurements.
 */
import { screen, waitFor } from "@testing-library/react-native";
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { Dimensions } from "react-native";
import { useRouter } from "expo-router";
import StammdatenScreen from "../../app/(tabs)/stammdaten/index";
import TaskStatusScreen from "../../app/(tabs)/stammdaten/task-status";
import {
  makeTrpcStub,
  makeEntry,
  renderWithClient,
} from "../stammdaten/helpers";

jest.mock("../../src/lib/trpc", () => ({
  useTRPC: () => mockTrpcStub,
}));

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

const mockTrpcStub = makeTrpcStub();
const mockedUseRouter = jest.mocked(useRouter);

function setWindowWidth(width: number): void {
  (Dimensions as unknown as {
    set: (dims: { window: { width: number; height: number } }) => void;
  }).set({ window: { width, height: 800 } });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTrpcStub.listCalls.length = 0;
  mockTrpcStub.setListData({});
  mockTrpcStub.setListError(null);
  mockedUseRouter.mockReturnValue({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  } as never);
});

describe("StammdatenScreen card grid (4 → 2 → 1)", () => {
  it("chunks the 8 type cards into two rows of 4 at ≥1051px", async () => {
    setWindowWidth(1200);

    await renderWithClient(<StammdatenScreen />);

    await screen.findByTestId("stammdaten-grid-row-0");
    expect(screen.getByTestId("stammdaten-grid-row-1")).toBeOnTheScreen();
    expect(screen.queryByTestId("stammdaten-grid-row-2")).toBeNull();
    // All 8 cards remain rendered.
    expect(screen.getAllByTestId(/^stammdaten-card-/).length).toBe(8);
  });

  it("uses two rows-chunks of 2 columns at ≤1050px", async () => {
    setWindowWidth(750);

    await renderWithClient(<StammdatenScreen />);

    await screen.findByTestId("stammdaten-grid-row-3");
    expect(screen.queryByTestId("stammdaten-grid-row-4")).toBeNull();
  });

  it("stacks cards in a single column at ≤560px (no row chunks)", async () => {
    setWindowWidth(500);

    await renderWithClient(<StammdatenScreen />);

    await screen.findByTestId("stammdaten-card-role");
    expect(screen.queryByTestId(/stammdaten-grid-row-/)).toBeNull();
    expect(screen.getAllByTestId(/^stammdaten-card-/).length).toBe(8);
  });
});

describe("TaskStatusScreen responsive status row", () => {
  function statusEntry(key: string, displayName: string) {
    return makeEntry({
      category: "task_status",
      key,
      displayName,
      colorHex: "#94A3B8",
      usageCount: 3,
    });
  }

  beforeEach(() => {
    mockTrpcStub.setListData({
      task_status: [statusEntry("offen", "Offen")],
    });
  });

  it("shows usage and color label above 900px", async () => {
    setWindowWidth(901);

    await renderWithClient(<TaskStatusScreen />);

    const meta = await screen.findByTestId("entry-meta-offen");
    await waitFor(() => {
      expect(meta.props.children.join("")).toBe("Position 1 · #94A3B8 · 3 Tasks");
    });
  });

  it("hides the usage column at ≤900px but keeps the color label", async () => {
    setWindowWidth(750);

    await renderWithClient(<TaskStatusScreen />);

    const meta = await screen.findByTestId("entry-meta-offen");
    await waitFor(() => {
      expect(meta.props.children.join("")).toBe("Position 1 · #94A3B8");
    });
  });

  it("hides the color label at ≤620px (position only)", async () => {
    setWindowWidth(610);

    await renderWithClient(<TaskStatusScreen />);

    const meta = await screen.findByTestId("entry-meta-offen");
    await waitFor(() => {
      expect(meta.props.children.join("")).toBe("Position 1");
    });
  });
});

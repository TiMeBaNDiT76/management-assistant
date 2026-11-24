import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { useRouter } from "expo-router";
import StammdatenScreen from "../../app/(tabs)/stammdaten/index";
import {
  makeTrpcStub,
  makeEntry,
  renderWithClient,
} from "./helpers";

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

beforeEach(() => {
  // clearAllMocks keeps the stub implementations (resetAllMocks would
  // wipe the list handler), but clears call history.
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

describe("StammdatenScreen overview", () => {
  it("renders all 8 master data type cards", async () => {
    await renderWithClient(<StammdatenScreen />);

    await waitFor(() => {
      expect(mockTrpcStub.listCalls.length).toBe(8);
    });

    for (const category of [
      "location",
      "role",
      "department",
      "relationship_type",
      "appointment_type",
      "task_status",
      "holiday",
      "country",
    ]) {
      expect(screen.getByTestId(`stammdaten-card-${category}`)).toBeOnTheScreen();
    }

    expect(screen.getByText("Stammdaten")).toBeOnTheScreen();
    expect(screen.getByText("8 Datentypen")).toBeOnTheScreen();
  });

  it("shows active/inactive counters and the manage link", async () => {
    mockTrpcStub.setListData({
      role: [
        makeEntry({ key: "rolle-a", displayName: "Rolle A", isActive: true }),
        makeEntry({ key: "rolle-b", displayName: "Rolle B", isActive: true }),
        makeEntry({ key: "rolle-c", displayName: "Rolle C", isActive: false }),
      ],
      location: [],
    });

    await renderWithClient(<StammdatenScreen />);

    await screen.findByText("2 aktiv · 1 inaktiv");
    expect(screen.getByText("Rollen verwalten")).toBeOnTheScreen();
    // Empty categories show the "Noch leer" chip and the first-entry CTA.
    await screen.findAllByText("Noch leer");
    expect(screen.getAllByText("Ersten Eintrag anlegen")).not.toHaveLength(0);
  });

  it("counts only holidays of the current year", async () => {
    mockTrpcStub.setListData({
      holiday: [
        makeEntry({ key: "neujahr", date: "2026-01-01", countryIso: "DE", scope: "national" }),
        makeEntry({ key: "tag-der-arbeit", date: "2026-05-01", countryIso: "DE", scope: "national" }),
        makeEntry({ key: "weihnachten", date: "2025-12-25", countryIso: "DE", scope: "national" }),
      ],
    });

    await renderWithClient(<StammdatenScreen />);

    await screen.findByText("2 in 2026");
  });

  it("navigates to the editor when a card is pressed", async () => {
    const push = jest.fn();
    mockedUseRouter.mockReturnValue({ push, back: jest.fn(), replace: jest.fn() } as never);

    await renderWithClient(<StammdatenScreen />);
    await screen.findByText("Rollen");

    await fireEvent.press(screen.getByTestId("stammdaten-card-role"));
    expect(push).toHaveBeenCalledWith("/stammdaten/rollen");

    await fireEvent.press(screen.getByTestId("stammdaten-card-task_status"));
    expect(push).toHaveBeenCalledWith("/stammdaten/task-status");
  });

  it("shows an error chip with retry instead of a silent zero counter", async () => {
    mockTrpcStub.setListError(new Error("list failed"));

    await renderWithClient(<StammdatenScreen />);

    await screen.findAllByText("Fehler");
    // Wait until all 8 cards reached the error state with their retry affordance.
    const retries = await screen.findAllByTestId(/^stammdaten-card-retry-/);
    expect(retries).toHaveLength(8);
    const retry = screen.getByTestId("stammdaten-card-retry-role");
    expect(screen.getAllByText(/Erneut versuchen/)).not.toHaveLength(0);

    const callsBefore = mockTrpcStub.listCalls.length;
    mockTrpcStub.setListError(null);
    await fireEvent.press(retry);

    await waitFor(() => {
      expect(mockTrpcStub.listCalls.length).toBeGreaterThan(callsBefore);
    });
  });
});

import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { useRouter } from "expo-router";
import TaskStatusScreen from "../../app/(tabs)/stammdaten/task-status";
import {
  makeTrpcStub,
  makeEntry,
  renderWithClient,
  type MasterDataEntryOverrides,
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

function statusEntry(overrides: MasterDataEntryOverrides) {
  return makeEntry({ category: "task_status", ...overrides });
}

beforeEach(() => {
  // clearAllMocks keeps the stub implementations (resetAllMocks would
  // wipe the list handler), but clears call history.
  jest.clearAllMocks();
  mockTrpcStub.listCalls.length = 0;
  mockTrpcStub.setListError(null);
  mockedUseRouter.mockReturnValue({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  } as never);
});

async function renderEditor() {
  return await renderWithClient(<TaskStatusScreen />);
}

describe("TaskStatusScreen", () => {
  it("renders the German header, rows and the Kanban preview columns", async () => {
    mockTrpcStub.setListData({
      task_status: [
        statusEntry({ key: "offen", displayName: "Offen", sortOrder: 10 }),
        statusEntry({ key: "in-arbeit", displayName: "In Bearbeitung", sortOrder: 20 }),
        statusEntry({
          key: "erledigt",
          displayName: "Erledigt",
          sortOrder: 30,
          isDone: true,
          colorHex: "#22C55E",
        }),
        statusEntry({
          key: "abgebrochen",
          displayName: "Abgebrochen",
          sortOrder: 40,
          isActive: false,
        }),
      ],
    });

    await renderEditor();

    await screen.findByTestId("kanban-preview");
    expect(screen.getByText("Task-Status")).toBeOnTheScreen();
    expect(screen.getByText("Kanban-Vorschau")).toBeOnTheScreen();
    // Columns follow the active entries in order; the inactive one is excluded.
    expect(screen.getByTestId("kanban-column-offen")).toBeOnTheScreen();
    expect(screen.getByTestId("kanban-column-in-arbeit")).toBeOnTheScreen();
    expect(screen.getByTestId("kanban-column-erledigt")).toBeOnTheScreen();
    expect(screen.queryByTestId("kanban-column-abgebrochen")).toBeNull();
    expect(screen.getByText("1 Erledigt-Status")).toBeOnTheScreen();
    expect(screen.getByText("Erledigt-Status")).toBeOnTheScreen();
    // Status chip count in the header counts active entries only.
    expect(screen.getByText("3 Status")).toBeOnTheScreen();
  });

  it("blocks turning off the only isDone status and shows the German guard banner without a mutation", async () => {
    mockTrpcStub.setListData({
      task_status: [
        statusEntry({ key: "offen", displayName: "Offen", sortOrder: 10, isDone: false }),
        statusEntry({ key: "erledigt", displayName: "Erledigt", sortOrder: 20, isDone: true }),
      ],
    });

    await renderEditor();
    await screen.findByTestId("entry-row-erledigt");

    await fireEvent(
      screen.getByTestId("switch-is-done-erledigt"),
      "valueChange",
      false,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "Mindestens ein Status muss als Erledigt (isDone) markiert bleiben.",
        ),
      ).toBeOnTheScreen();
    });
    expect(mockTrpcStub.update).not.toHaveBeenCalled();
  });

  it("persists isDone=true when a second status is marked as done", async () => {
    mockTrpcStub.setListData({
      task_status: [
        statusEntry({ key: "offen", displayName: "Offen", sortOrder: 10 }),
        statusEntry({ key: "erledigt", displayName: "Erledigt", sortOrder: 20, isDone: true }),
      ],
    });

    await renderEditor();
    await screen.findByTestId("entry-row-offen");

    await fireEvent(screen.getByTestId("switch-is-done-offen"), "valueChange", true);

    await waitFor(() => {
      expect(mockTrpcStub.update).toHaveBeenCalledTimes(1);
    });
    expect(mockTrpcStub.update.mock.calls[0][0]).toMatchObject({
      id: "offen-id",
      data: { displayName: "Offen", isDone: true },
    });
  });

  it("reorders locally with the arrows and persists only after 'Änderungen speichern'", async () => {
    mockTrpcStub.setListData({
      task_status: [
        statusEntry({ key: "offen", displayName: "Offen", sortOrder: 10 }),
        statusEntry({ key: "in-arbeit", displayName: "In Bearbeitung", sortOrder: 20 }),
        statusEntry({ key: "erledigt", displayName: "Erledigt", sortOrder: 30, isDone: true }),
      ],
    });

    await renderEditor();
    await screen.findByTestId("entry-row-offen");

    // Not dirty yet — saving is disabled: the press is a no-op.
    expect(screen.getByText("Reihenfolge ist gespeichert.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Änderungen speichern"));
    await waitFor(() => {
      expect(mockTrpcStub.update).not.toHaveBeenCalled();
    });

    // Move "Offen" one row down.
    await fireEvent.press(screen.getByTestId("move-down-offen"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Ungespeicherte Reihenfolge — Änderungen wirken erst nach dem Speichern.",
        ),
      ).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByText("Änderungen speichern"));

    await waitFor(() => {
      expect(mockTrpcStub.update).toHaveBeenCalledTimes(2);
    });
    // New order: In Bearbeitung (10), Offen (20); Erledigt keeps sortOrder 30.
    expect(mockTrpcStub.update.mock.calls[0][0]).toMatchObject({
      id: "in-arbeit-id",
      data: { displayName: "In Bearbeitung", sortOrder: 10 },
    });
    expect(mockTrpcStub.update.mock.calls[1][0]).toMatchObject({
      id: "offen-id",
      data: { displayName: "Offen", sortOrder: 20 },
    });
  });

  it("disables Deaktivieren and Löschen with a usage hint while Tasks reference the status", async () => {
    mockTrpcStub.setListData({
      task_status: [
        statusEntry({ key: "erledigt", displayName: "Erledigt", sortOrder: 10, usageCount: 3 }),
      ],
    });

    await renderEditor();
    await screen.findByTestId("entry-row-erledigt");

    const row = screen.getByTestId("entry-row-erledigt");
    await fireEvent.press(within(row).getByTestId("row-actions"));

    const deactivate = screen.getByTestId("row-actions-deactivate");
    const remove = screen.getByTestId("row-actions-remove");
    expect(within(deactivate).getByText("Deaktivieren ist gesperrt, solange Tasks auf diesen Status verweisen.")).toBeOnTheScreen();
    expect(within(remove).getByText("Wird von 3 Tasks verwendet — bitte stattdessen deaktivieren.")).toBeOnTheScreen();

    // Disabled items must not open the confirm dialog or fire a mutation.
    await fireEvent.press(deactivate);
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
    await fireEvent.press(remove);
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
    expect(mockTrpcStub.deactivate).not.toHaveBeenCalled();
    expect(mockTrpcStub.remove).not.toHaveBeenCalled();
  });

  it("shows the load error state with retry when the list query fails", async () => {
    mockTrpcStub.setListError(new Error("list failed"));

    await renderEditor();

    await screen.findByTestId("error-state");
    expect(screen.getByText("Erneut versuchen")).toBeOnTheScreen();
  });

  it("applies a preset color from the palette and navigates back via the header", async () => {
    mockTrpcStub.setListData({ task_status: [] });
    const back = jest.fn();
    mockedUseRouter.mockReturnValue({ push: jest.fn(), back, replace: jest.fn() } as never);

    await renderEditor();
    await screen.findByTestId("editor-create");

    await fireEvent.press(screen.getByTestId("editor-back"));
    expect(back).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId("editor-create"));
    await fireEvent.changeText(screen.getByTestId("field-display-name"), "Review");
    await fireEvent.press(screen.getByTestId("field-color-preset-#22C55E"));
    await fireEvent.press(screen.getByText("Änderungen speichern"));

    await waitFor(() => {
      expect(mockTrpcStub.create).toHaveBeenCalledTimes(1);
    });
    expect(mockTrpcStub.create.mock.calls[0][0]).toMatchObject({
      category: "task_status",
      displayName: "Review",
      colorHex: "#22C55E",
    });
  });
});

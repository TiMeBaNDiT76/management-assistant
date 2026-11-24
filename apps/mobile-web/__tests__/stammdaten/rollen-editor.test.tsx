import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import RollenScreen from "../../app/(tabs)/stammdaten/rollen";
import {
  makeTrpcStub,
  makeEntry,
  renderWithClient,
  trpcClientError,
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

beforeEach(() => {
  // clearAllMocks keeps the stub implementations (resetAllMocks would
  // wipe the list handler), but clears call history.
  jest.clearAllMocks();
  mockTrpcStub.listCalls.length = 0;
  mockTrpcStub.setListError(null);
});

async function renderEditor() {
  return await renderWithClient(<RollenScreen />);
}

function getRow() {
  return screen.getByTestId("entry-row-rolle-a");
}

function getConfirmDialog() {
  return screen.getByTestId("confirm-dialog");
}

describe("RollenScreen (SimpleTextEditor)", () => {
  it("renders rows with the singular/plural usage counter and the German footer", async () => {
    mockTrpcStub.setListData({
      role: [
        makeEntry({ key: "rolle-a", displayName: "Rolle A", usageCount: 2 }),
        makeEntry({ key: "rolle-b", displayName: "Rolle B", usageCount: 1 }),
        makeEntry({
          key: "rolle-c",
          displayName: "Rolle C",
          usageCount: 1,
          isActive: false,
        }),
      ],
    });

    await renderEditor();

    await screen.findByText("Verwendet von 2 Personen");
    expect(screen.getByText("Rollen")).toBeOnTheScreen();
    expect(screen.getByText("Verwendet von 1 Person")).toBeOnTheScreen();
    // Inactive entries show the plain assignment counter ("Zuordnung(en)").
    const inactiveRow = screen.getByTestId("entry-row-rolle-c");
    expect(within(inactiveRow).getByText("1 bestehende Zuordnung")).toBeOnTheScreen();
    expect(screen.getByText("3 Einträge · 2 aktiv · Mehrfachauswahl an der Person")).toBeOnTheScreen();
  });

  it("creates a role and closes the dialog", async () => {
    mockTrpcStub.setListData({ role: [] });

    await renderEditor();
    await screen.findByTestId("empty-state");

    await fireEvent.press(screen.getByText("＋ Rolle anlegen"));
    await fireEvent.changeText(screen.getByTestId("field-display-name"), "Neue Rolle");
    await fireEvent.changeText(screen.getByTestId("field-description"), "Testbeschreibung");
    await fireEvent.press(screen.getByText("Änderungen speichern"));

    await waitFor(() => {
      expect(mockTrpcStub.create).toHaveBeenCalledTimes(1);
    });
    expect(mockTrpcStub.create.mock.calls[0][0]).toMatchObject({
      category: "role",
      displayName: "Neue Rolle",
      description: "Testbeschreibung",
    });
    // Invalidation refetches the list under the masterData path filter.
    expect(mockTrpcStub.listCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("validates the required display name without firing a mutation", async () => {
    mockTrpcStub.setListData({ role: [] });

    await renderEditor();
    await fireEvent.press(screen.getByText("＋ Rolle anlegen"));
    await fireEvent.press(screen.getByText("Änderungen speichern"));

    await screen.findByTestId("form-dialog-error");
    expect(screen.getByText("Bitte einen Anzeigenamen angeben.")).toBeOnTheScreen();
    expect(mockTrpcStub.create).not.toHaveBeenCalled();
  });

  it("keeps the dialog open with preserved input and an inline error on CONFLICT", async () => {
    mockTrpcStub.setListData({ role: [] });
    mockTrpcStub.create.mockRejectedValueOnce(
      trpcClientError(
        "CONFLICT",
        'An entry with the name "Neue Rolle" already exists in this category',
      ),
    );

    await renderEditor();
    await fireEvent.press(screen.getByText("＋ Rolle anlegen"));
    await fireEvent.changeText(screen.getByTestId("field-display-name"), "Neue Rolle");
    await fireEvent.press(screen.getByText("Änderungen speichern"));

    await waitFor(() => {
      expect(screen.getByTestId("form-dialog-error")).toBeOnTheScreen();
    });
    expect(screen.getByText("Name bereits vorhanden")).toBeOnTheScreen();
    // The entered values survive the failed save.
    expect(screen.getByTestId("field-display-name").props.value).toBe("Neue Rolle");
    expect(mockTrpcStub.create).toHaveBeenCalledTimes(1);
  });

  it("deactivates after confirmation and maps a delete-protection CONFLICT to the banner", async () => {
    mockTrpcStub.setListData({
      role: [makeEntry({ key: "rolle-a", displayName: "Rolle A", usageCount: 0 })],
    });

    await renderEditor();
    await screen.findByTestId("entry-row-rolle-a");

    // 1) Deactivate with confirmation dialog.
    await fireEvent.press(within(getRow()).getByTestId("row-actions"));
    await fireEvent.press(screen.getByTestId("row-actions-deactivate"));

    await screen.findByTestId("confirm-dialog");
    expect(screen.getByText("Rolle A deaktivieren?")).toBeOnTheScreen();
    await fireEvent.press(within(getConfirmDialog()).getByText("Deaktivieren"));

    await waitFor(() => {
      expect(mockTrpcStub.deactivate).toHaveBeenCalledWith("rolle-a-id");
    });

    // 2) Remove succeeds while unused…
    await waitFor(() => {
      expect(screen.queryByTestId("confirm-dialog")).toBeNull();
    });
    await fireEvent.press(within(getRow()).getByTestId("row-actions"));
    await fireEvent.press(screen.getByTestId("row-actions-remove"));
    await screen.findByTestId("confirm-dialog");
    expect(screen.getByText("Rolle A endgültig löschen?")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Endgültig löschen"));

    await waitFor(() => {
      expect(mockTrpcStub.remove).toHaveBeenCalledWith("rolle-a-id");
    });

    // 3) …and a CONFLICT from remove surfaces the German banner.
    mockTrpcStub.remove.mockRejectedValueOnce(
      trpcClientError(
        "CONFLICT",
        "Entry is used by 1 record(s) and cannot be deleted — deactivate it instead",
      ),
    );
    await fireEvent.press(within(getRow()).getByTestId("row-actions"));
    await fireEvent.press(screen.getByTestId("row-actions-remove"));
    await fireEvent.press(screen.getByText("Endgültig löschen"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Der Eintrag wird verwendet und kann nicht gelöscht werden — bitte deaktiviere ihn stattdessen.",
        ),
      ).toBeOnTheScreen();
    });
  });

  it("disables Löschen with a usage hint while entries are in use", async () => {
    mockTrpcStub.setListData({
      role: [makeEntry({ key: "rolle-a", displayName: "Rolle A", usageCount: 2 })],
    });

    await renderEditor();
    await screen.findByTestId("entry-row-rolle-a");

    const row = screen.getByTestId("entry-row-rolle-a");
    await fireEvent.press(within(row).getByTestId("row-actions"));

    const remove = screen.getByTestId("row-actions-remove");
    expect(
      within(remove).getByText(
        "Wird von 2 Einträgen verwendet — bitte stattdessen deaktivieren.",
      ),
    ).toBeOnTheScreen();

    await fireEvent.press(remove);
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
    expect(mockTrpcStub.remove).not.toHaveBeenCalled();
  });
});

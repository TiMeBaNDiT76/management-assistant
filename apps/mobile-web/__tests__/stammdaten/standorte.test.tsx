import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import StandorteScreen from "../../app/(tabs)/stammdaten/standorte";
import {
  makeTrpcStub,
  makeEntry,
  renderWithClient,
  selectOption,
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
  mockTrpcStub.setListData({
    country: [
      makeEntry({
        key: "land-de",
        category: "country",
        displayName: "Musterland",
        countryIso: "DE",
      }),
    ],
  });
});

async function renderEditor() {
  return await renderWithClient(<StandorteScreen />);
}

describe("StandorteScreen", () => {
  it("renders rows with the locked key, resolved country and usage counter", async () => {
    mockTrpcStub.setListData({
      location: [
        makeEntry({
          key: "standort-nord",
          category: "location",
          displayName: "Standort Nord",
          countryIso: "DE",
          usageCount: 4,
        }),
        makeEntry({
          key: "standort-sued",
          category: "location",
          displayName: "Standort Süd",
          countryIso: null,
          usageCount: 1,
          isActive: false,
        }),
      ],
    });

    await renderEditor();

    await screen.findByTestId("entry-row-standort-nord");
    expect(screen.getByText("Standorte")).toBeOnTheScreen();
    expect(screen.getByText("standort-nord")).toBeOnTheScreen();
    expect(screen.getByText("Land: Musterland · DE · Verwendet von 4 Personen")).toBeOnTheScreen();
    expect(screen.getByText("Land: — nicht zugeordnet — · 1 bestehende Zuordnung")).toBeOnTheScreen();
    expect(screen.getByText("1 aktiv · 1 inaktiv")).toBeOnTheScreen();
    expect(
      screen.getByText("2 Einträge · Schlüssel unveränderlich · Inaktive bleiben im Editor sichtbar"),
    ).toBeOnTheScreen();
  });

  it("offers an editable key and the country master data in the create dialog", async () => {
    mockTrpcStub.setListData({ location: [] });

    await renderEditor();
    await fireEvent.press(screen.getByTestId("editor-create"));

    const keyField = screen.getByTestId("field-key");
    expect(keyField.props.editable).toBe(true);
    expect(keyField.props.value).toBe("");

    await selectOption("field-country", "Musterland · DE");
    await fireEvent.changeText(screen.getByTestId("field-display-name"), "Standort West");
    await fireEvent.press(screen.getByText("Änderungen speichern"));

    await waitFor(() => {
      expect(mockTrpcStub.create).toHaveBeenCalledTimes(1);
    });
    expect(mockTrpcStub.create.mock.calls[0][0]).toMatchObject({
      category: "location",
      displayName: "Standort West",
      countryIso: "DE",
    });
  });

  it("shows the key as read-only when editing an existing location", async () => {
    mockTrpcStub.setListData({
      location: [
        makeEntry({
          key: "standort-nord",
          category: "location",
          displayName: "Standort Nord",
          countryIso: "DE",
        }),
      ],
    });

    await renderEditor();
    await screen.findByTestId("entry-row-standort-nord");

    const row = screen.getByTestId("entry-row-standort-nord");
    await fireEvent.press(within(row).getByTestId("row-actions"));
    await fireEvent.press(screen.getByTestId("row-actions-edit"));

    await screen.findByTestId("form-dialog");
    const keyField = screen.getByTestId("field-key");
    expect(keyField.props.editable).toBe(false);
    expect(keyField.props.value).toBe("standort-nord");
    expect(screen.getByText("Nach dem Anlegen unveränderlich.")).toBeOnTheScreen();
    expect(screen.getByTestId("field-display-name").props.value).toBe("Standort Nord");
  });

  it("rejects invalid keys on create without firing a mutation", async () => {
    mockTrpcStub.setListData({ location: [] });

    await renderEditor();
    await fireEvent.press(screen.getByTestId("editor-create"));
    await fireEvent.changeText(screen.getByTestId("field-key"), "Berlin HQ!");
    await fireEvent.changeText(screen.getByTestId("field-display-name"), "Standort West");
    await fireEvent.press(screen.getByText("Änderungen speichern"));

    await screen.findByTestId("field-key-error");
    expect(
      screen.getByText("Der Schlüssel darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten."),
    ).toBeOnTheScreen();
    expect(mockTrpcStub.create).not.toHaveBeenCalled();
  });

  it("shows the person usage hint on the disabled delete action", async () => {
    mockTrpcStub.setListData({
      location: [
        makeEntry({
          key: "standort-nord",
          category: "location",
          displayName: "Standort Nord",
          usageCount: 4,
        }),
      ],
    });

    await renderEditor();
    await screen.findByTestId("entry-row-standort-nord");

    const row = screen.getByTestId("entry-row-standort-nord");
    await fireEvent.press(within(row).getByTestId("row-actions"));

    const remove = screen.getByTestId("row-actions-remove");
    expect(
      screen.getByText("Wird von 4 Personen verwendet — bitte stattdessen deaktivieren."),
    ).toBeOnTheScreen();

    await fireEvent.press(remove);
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
    expect(mockTrpcStub.remove).not.toHaveBeenCalled();
  });
});

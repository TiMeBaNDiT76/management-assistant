import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import AbteilungenScreen from "../../app/(tabs)/stammdaten/abteilungen";
import BeziehungstypenScreen from "../../app/(tabs)/stammdaten/beziehungstypen";
import LaenderScreen from "../../app/(tabs)/stammdaten/laender";
import TerminartenScreen from "../../app/(tabs)/stammdaten/terminarten";
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

beforeEach(() => {
  // clearAllMocks keeps the stub implementations (resetAllMocks would
  // wipe the list handler), but clears call history.
  jest.clearAllMocks();
  mockTrpcStub.listCalls.length = 0;
  mockTrpcStub.setListError(null);
  mockTrpcStub.setListData({});
});

describe("Stammdaten editor smoke renders", () => {
  it("renders Abteilungen with sample data", async () => {
    mockTrpcStub.setListData({
      department: [
        makeEntry({
          category: "department",
          key: "abteilung-vertrieb",
          displayName: "Vertrieb",
          usageCount: 2,
        }),
      ],
    });

    await renderWithClient(<AbteilungenScreen />);

    await screen.findByTestId("entry-row-abteilung-vertrieb");
    expect(screen.getByText("Abteilungen")).toBeOnTheScreen();
    expect(screen.getByText("Verwendet von 2 Personen")).toBeOnTheScreen();
    expect(screen.getByText("1 Einträge · 1 aktiv · Einfachauswahl an der Person")).toBeOnTheScreen();
  });

  it("renders Terminarten with frequency and conversation counter", async () => {
    mockTrpcStub.setListData({
      appointment_type: [
        makeEntry({
          category: "appointment_type",
          key: "jahresgespraech",
          displayName: "Jahresgespräch",
          frequency: "jährlich",
          colorHex: "#3B82F6",
          usageCount: 1,
        }),
      ],
    });

    await renderWithClient(<TerminartenScreen />);

    await screen.findByTestId("entry-row-jahresgespraech");
    expect(screen.getByText("Terminarten")).toBeOnTheScreen();
    expect(
      screen.getByText("Frequenz: jährlich · Verwendet von 1 Gespräch"),
    ).toBeOnTheScreen();
  });

  it("renders Länder with location usage", async () => {
    mockTrpcStub.setListData({
      country: [
        makeEntry({
          category: "country",
          key: "land-de",
          displayName: "Musterland",
          countryIso: "DE",
        }),
      ],
      location: [
        makeEntry({
          category: "location",
          key: "standort-hq",
          displayName: "Hauptstandort",
          countryIso: "DE",
        }),
      ],
    });

    await renderWithClient(<LaenderScreen />);

    await screen.findByTestId("entry-row-land-de");
    expect(screen.getByText("Musterland")).toBeOnTheScreen();
    expect(screen.getByText("Hauptstandort")).toBeOnTheScreen();
  });
});

describe("editor field validation", () => {
  it("Beziehungstypen requires the plural form", async () => {
    mockTrpcStub.setListData({ relationship_type: [] });

    await renderWithClient(<BeziehungstypenScreen />);
    await fireEvent.press(screen.getByTestId("editor-create"));
    await fireEvent.changeText(screen.getByTestId("field-display-name"), "Duzt");
    await fireEvent.press(screen.getByText("Änderungen speichern"));

    await screen.findByTestId("field-plural-label-error");
    expect(screen.getByText("Bitte eine Plural-Form angeben.")).toBeOnTheScreen();
    expect(mockTrpcStub.create).not.toHaveBeenCalled();
  });

  it("Terminarten requires the frequency hint", async () => {
    mockTrpcStub.setListData({ appointment_type: [] });

    await renderWithClient(<TerminartenScreen />);
    await fireEvent.press(screen.getByTestId("editor-create"));
    await fireEvent.changeText(screen.getByTestId("field-display-name"), "Feedback-Gespräch");
    await fireEvent.press(screen.getByText("Änderungen speichern"));

    await screen.findByTestId("field-frequency-custom-error");
    expect(screen.getByText("Bitte einen Frequenz-Hinweis angeben.")).toBeOnTheScreen();
    expect(mockTrpcStub.create).not.toHaveBeenCalled();

    // A custom frequency unblocks the save and is sent verbatim.
    await fireEvent.changeText(screen.getByTestId("field-frequency-custom"), "alle 6 Wochen");
    await fireEvent.press(screen.getByText("Änderungen speichern"));

    await waitFor(() => {
      expect(mockTrpcStub.create).toHaveBeenCalledTimes(1);
    });
    expect(mockTrpcStub.create.mock.calls[0][0]).toMatchObject({
      category: "appointment_type",
      displayName: "Feedback-Gespräch",
      frequency: "alle 6 Wochen",
    });
  });

  it("Länder validates the ISO 3166-1 Alpha-2 code", async () => {
    mockTrpcStub.setListData({ country: [] });

    await renderWithClient(<LaenderScreen />);
    await fireEvent.press(screen.getByTestId("editor-create"));
    await fireEvent.changeText(screen.getByTestId("field-display-name"), "Musterland");
    await fireEvent.changeText(screen.getByTestId("field-country-iso"), "d");
    await fireEvent.press(screen.getByText("Änderungen speichern"));

    await screen.findByTestId("field-country-iso-error");
    expect(
      screen.getByText(
        "Bitte einen zweistelligen ISO 3166-1 Alpha-2 Code angeben (z. B. DE).",
      ),
    ).toBeOnTheScreen();
    expect(mockTrpcStub.create).not.toHaveBeenCalled();

    // Lowercase input is normalized to upper case.
    await fireEvent.changeText(screen.getByTestId("field-country-iso"), "de");
    await fireEvent.press(screen.getByText("Änderungen speichern"));

    await waitFor(() => {
      expect(mockTrpcStub.create).toHaveBeenCalledTimes(1);
    });
    expect(mockTrpcStub.create.mock.calls[0][0]).toMatchObject({
      category: "country",
      displayName: "Musterland",
      countryIso: "DE",
    });
  });
});

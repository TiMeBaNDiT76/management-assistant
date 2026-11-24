import { fireEvent, screen, waitFor, within } from "@testing-library/react-native";
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import FeiertageScreen from "../../app/(tabs)/stammdaten/feiertage";
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
    holiday: [],
    country: [
      makeEntry({
        key: "land-de",
        category: "country",
        displayName: "Musterland",
        countryIso: "DE",
      }),
    ],
    location: [
      makeEntry({
        key: "standort-hq",
        category: "location",
        displayName: "Hauptstandort",
        countryIso: "DE",
      }),
    ],
  });
});

async function renderEditor() {
  return await renderWithClient(<FeiertageScreen />);
}

describe("FeiertageScreen", () => {
  it("renders sorted holidays with formatted dates and scope labels", async () => {
    mockTrpcStub.setListData({
      holiday: [
        makeEntry({
          key: "tag-der-arbeit",
          category: "holiday",
          displayName: "Tag der Arbeit",
          date: "2026-05-01",
          countryIso: "DE",
          scope: "national",
        }),
        makeEntry({
          key: "standort-feiertag",
          category: "holiday",
          displayName: "Standortfeiertag",
          date: "2026-01-02",
          countryIso: "DE",
          scope: "site:standort-hq",
        }),
      ],
    });

    await renderEditor();

    // Sorted by date ascending.
    const firstRow = await screen.findByTestId("entry-row-standort-feiertag");
    expect(within(firstRow).getByText("02.01.2026 · Musterland")).toBeOnTheScreen();
    expect(within(firstRow).getByText("Hauptstandort")).toBeOnTheScreen();
    const secondRow = screen.getByTestId("entry-row-tag-der-arbeit");
    expect(within(secondRow).getByText("01.05.2026 · Musterland")).toBeOnTheScreen();
    expect(within(secondRow).getByText("Landesweit DE")).toBeOnTheScreen();
    expect(screen.getByText("2 Einträge")).toBeOnTheScreen();
  });

  it("filters by year, country and scope", async () => {
    mockTrpcStub.setListData({
      holiday: [
        makeEntry({
          key: "neujahr-2026",
          category: "holiday",
          displayName: "Neujahr",
          date: "2026-01-01",
          countryIso: "DE",
          scope: "national",
        }),
        makeEntry({
          key: "altjahrestag-2025",
          category: "holiday",
          displayName: "Alter Feiertag",
          date: "2025-01-01",
          countryIso: "DE",
          scope: "national",
        }),
      ],
    });

    await renderEditor();
    // The year filter defaults to the current year — only 2026 is shown.
    await screen.findByTestId("entry-row-neujahr-2026");
    expect(screen.queryByTestId("entry-row-altjahrestag-2025")).toBeNull();

    // Year filter: switching to 2025 shows only the older entry.
    await selectOption("filter-year", "2025");
    expect(screen.queryByTestId("entry-row-neujahr-2026")).toBeNull();
    await screen.findByTestId("entry-row-altjahrestag-2025");

    // Scope filter: no site-scope entry exists → empty state for the year.
    await selectOption("filter-scope", "Einzelner Standort");
    await screen.findByTestId("empty-state");
    expect(screen.getByText("Keine Feiertage für 2025.")).toBeOnTheScreen();
  });

  it("rejects an invalid date with the German validation and without a mutation", async () => {
    await renderEditor();
    await fireEvent.press(screen.getByTestId("editor-create"));

    await fireEvent.changeText(screen.getByTestId("field-date"), "01.01.2026");
    await fireEvent.changeText(screen.getByTestId("field-display-name"), "Neujahr");
    await fireEvent.press(screen.getByText("Feiertag speichern"));

    await screen.findByTestId("field-date-error");
    expect(
      screen.getByText("Bitte ein Datum im Format JJJJ-MM-TT angeben."),
    ).toBeOnTheScreen();
    expect(mockTrpcStub.create).not.toHaveBeenCalled();
  });

  it("creates a national holiday with the selected country", async () => {
    await renderEditor();
    await fireEvent.press(screen.getByTestId("editor-create"));

    await fireEvent.changeText(screen.getByTestId("field-date"), "2026-12-25");
    await fireEvent.changeText(screen.getByTestId("field-display-name"), "Weihnachten");
    await selectOption("field-country", "Musterland");
    await fireEvent.press(screen.getByText("Feiertag speichern"));

    await waitFor(() => {
      expect(mockTrpcStub.create).toHaveBeenCalledTimes(1);
    });
    expect(mockTrpcStub.create.mock.calls[0][0]).toMatchObject({
      category: "holiday",
      displayName: "Weihnachten",
      date: "2026-12-25",
      countryIso: "DE",
      scope: "national",
    });
  });

  it("requires a location when the site scope is selected", async () => {
    await renderEditor();
    await fireEvent.press(screen.getByTestId("editor-create"));

    await fireEvent.changeText(screen.getByTestId("field-date"), "2026-06-05");
    await fireEvent.changeText(screen.getByTestId("field-display-name"), "Standortfest");
    await fireEvent.press(screen.getByTestId("scope-site"));

    // Site scope swaps the country select for the location select.
    expect(screen.getByTestId("field-location")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Feiertag speichern"));

    await waitFor(() => {
      expect(screen.getByText("Bitte einen Standort wählen.")).toBeOnTheScreen();
    });
    expect(mockTrpcStub.create).not.toHaveBeenCalled();

    // Picking a location encodes it as `site:<locationKey>`.
    await selectOption("field-location", "Hauptstandort");
    await fireEvent.press(screen.getByText("Feiertag speichern"));

    await waitFor(() => {
      expect(mockTrpcStub.create).toHaveBeenCalledTimes(1);
    });
    expect(mockTrpcStub.create.mock.calls[0][0]).toMatchObject({
      scope: "site:standort-hq",
    });
  });
});

import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import type { Employee } from "@mgmt/shared";
import { screen } from "@testing-library/react-native";
import PeopleScreen from "../../app/(tabs)/people/index";
import { makeEntry, makeTrpcStub, renderWithClient } from "../stammdaten/helpers";

jest.mock("../../src/lib/trpc", () => ({
  useTRPC: () => mockTrpcStub,
}));

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() })),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

/** Fictional directory rows as returned by `trpc.employees.list`. */
const mockEmployees: Employee[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    ownerUserId: "test-owner",
    firstName: "Lena",
    lastName: "Fischer",
    email: "lena.fischer@beispiel.de",
    role: "senior-consultant",
    department: "beratung",
    location: "berlin",
    hireDate: "2024-03-01",
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    ownerUserId: "test-owner",
    firstName: "Tom",
    lastName: "Weber",
    email: "tom.weber@beispiel.de",
    role: "junior-analyst",
    department: "engineering",
    location: "remote",
    hireDate: null,
    notes: null,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];

const mockTrpcStub = {
  ...makeTrpcStub(),
  employees: {
    list: {
      queryOptions: (input: { search?: string; limit?: number }) => ({
        queryKey: ["employees", "list", input.search ?? "", input.limit ?? 50],
        queryFn: async () => mockEmployees,
      }),
    },
    getById: {
      queryOptions: (employeeId: string) => ({
        queryKey: ["employees", "getById", employeeId],
        queryFn: async () => mockEmployees[0],
      }),
    },
    create: {
      mutationOptions: (options: object = {}) => ({
        ...options,
        mutationFn: async () => mockEmployees[0],
      }),
    },
    update: {
      mutationOptions: (options: object = {}) => ({
        ...options,
        mutationFn: async () => mockEmployees[0],
      }),
    },
    remove: {
      mutationOptions: (options: object = {}) => ({ ...options, mutationFn: async () => true }),
    },
    relationships: {
      list: {
        queryOptions: (input: { employeeId?: string }) => ({
          queryKey: ["employees", "relationships", "list", input.employeeId ?? ""],
          queryFn: async () => [],
        }),
      },
      create: {
        mutationOptions: (options: object = {}) => ({ ...options, mutationFn: async () => null }),
      },
    },
    pathFilter: () => ({ queryKey: ["employees"] }),
  },
};

async function renderPeople() {
  return await renderWithClient(<PeopleScreen />);
}

describe("PeopleScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrpcStub.setListError(null);
    mockTrpcStub.setListData({
      role: [
        makeEntry({
          category: "role",
          key: "senior-consultant",
          displayName: "Senior Consultant",
        }),
        makeEntry({ category: "role", key: "junior-analyst", displayName: "Junior Analyst" }),
      ],
      department: [
        makeEntry({ category: "department", key: "beratung", displayName: "Beratung" }),
        makeEntry({ category: "department", key: "engineering", displayName: "Engineering" }),
      ],
      location: [
        makeEntry({ category: "location", key: "berlin", displayName: "Berlin" }),
        makeEntry({ category: "location", key: "remote", displayName: "Remote" }),
      ],
    });
  });

  it("renders the mockup header, filters and the API-backed directory", async () => {
    await renderPeople();

    expect(screen.getByText("People · Mitarbeiter")).toBeOnTheScreen();
    expect(screen.getByText("Mitarbeiter")).toBeOnTheScreen();
    expect(await screen.findByText("Lena Fischer")).toBeOnTheScreen();
    expect(screen.getByText("Tom Weber")).toBeOnTheScreen();
    // Stored master-data keys are resolved to their display names.
    expect(screen.getByText("Senior Consultant")).toBeOnTheScreen();
    expect(screen.getByText("Beratung")).toBeOnTheScreen();
    expect(screen.getByText("Berlin")).toBeOnTheScreen();
    expect(screen.getByText("Sortiert nach Name ↑")).toBeOnTheScreen();
    expect(screen.getByText("1–2 von 2 Mitarbeitern")).toBeOnTheScreen();
    expect(screen.getByText("＋ Mitarbeiter anlegen")).toBeOnTheScreen();
    expect(screen.getByText("Filter zurücksetzen")).toBeOnTheScreen();
  });
});

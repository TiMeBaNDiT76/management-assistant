import { render, screen, waitFor } from "@testing-library/react-native";
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { onAuthStateChanged } from "firebase/auth";
import DashboardScreen, { displayNameForGreeting } from "../../app/(tabs)/index";
import { AuthProvider } from "../../src/auth/auth-context";
import { getFirebaseAuth } from "../../src/lib/firebase";

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("../../src/lib/firebase", () => ({
  getFirebaseAuth: jest.fn(),
  getAuthToken: jest.fn(async () => null),
}));

const mockedGetFirebaseAuth = jest.mocked(getFirebaseAuth);
const mockedOnAuthStateChanged = jest.mocked(onAuthStateChanged);

beforeEach(() => {
  jest.resetAllMocks();
  process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = "false";
  mockedGetFirebaseAuth.mockReturnValue({ currentUser: null } as never);
  // Firebase invokes the listener immediately with the current user.
  mockedOnAuthStateChanged.mockImplementation((_auth, callback) => {
    (callback as (user: unknown) => void)(null);
    return () => undefined;
  });
});

describe("displayNameForGreeting", () => {
  it("uses the email local-part", () => {
    expect(displayNameForGreeting("manager@example.com")).toBe("manager");
  });

  it("trims whitespace around the local part", () => {
    expect(displayNameForGreeting(" chefin@example.com ")).toBe("chefin");
  });

  it("falls back to the neutral Admin when there is no email", () => {
    expect(displayNameForGreeting(null)).toBe("Admin");
    expect(displayNameForGreeting(undefined)).toBe("Admin");
    expect(displayNameForGreeting("")).toBe("Admin");
    expect(displayNameForGreeting("   ")).toBe("Admin");
  });
});

describe("DashboardScreen greeting", () => {
  it("shows the neutral fallback when signed out (no real name in source)", async () => {
    render(
      <AuthProvider>
        <DashboardScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Admin/)).toBeOnTheScreen();
    });
    // Regression guard: no hardcoded personal name may follow the greeting
    // (previously "{greeting}, <hardcoded first name>").
    expect(screen.queryAllByText(/^,\s*\S/)).toHaveLength(0);
  });

  it("uses the signed-in email local-part as the display name", async () => {
    mockedOnAuthStateChanged.mockImplementation((_auth, callback) => {
      (callback as (user: unknown) => void)({
        email: "leitung@example.com",
        uid: "uid-1",
      });
      return () => undefined;
    });

    render(
      <AuthProvider>
        <DashboardScreen />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/leitung/)).toBeOnTheScreen();
    });
  });
});

import { render, screen, waitFor } from "@testing-library/react-native";
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { createElement, type ReactNode } from "react";
import { View } from "react-native";
import { AuthProvider } from "../../src/auth/auth-context";
import { getFirebaseAuth } from "../../src/lib/firebase";
import TabsLayout from "../../app/(tabs)/_layout";

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

// The jest.mock factory may only reference `mock`-prefixed bindings
// (babel-plugin-jest-hoist restriction), so alias the real primitives here.
const mockCreateElement = createElement;
const mockView = View;

jest.mock("expo-router", () => {
  const Tabs = ({ children }: { children: ReactNode }) =>
    mockCreateElement(mockView, { testID: "tabs" }, children);
  Tabs.Screen = ({ children }: { children: ReactNode }) =>
    mockCreateElement(mockView, null, children);
  return { Tabs, useRouter: jest.fn() };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

const mockedUseRouter = jest.mocked(useRouter);
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
  mockedUseRouter.mockReturnValue({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  } as never);
});

async function renderTabs() {
  return render(
    <AuthProvider>
      <TabsLayout />
    </AuthProvider>,
  );
}

describe("TabsLayout route guard", () => {
  it("redirects signed-out visitors to the login screen", async () => {
    const replace = jest.fn();
    mockedUseRouter.mockReturnValue({ replace, push: jest.fn(), back: jest.fn() } as never);

    await renderTabs();

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/(auth)/login");
    });
    expect(screen.getByTestId("tabs-guard")).toBeOnTheScreen();
  });

  it("renders the tabs once signed in (dev bypass)", async () => {
    process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = "true";
    const replace = jest.fn();
    mockedUseRouter.mockReturnValue({ replace, push: jest.fn(), back: jest.fn() } as never);

    await renderTabs();

    await waitFor(() => {
      expect(screen.getByTestId("tabs")).toBeOnTheScreen();
    });
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByTestId("tabs-guard")).toBeNull();
  });
});

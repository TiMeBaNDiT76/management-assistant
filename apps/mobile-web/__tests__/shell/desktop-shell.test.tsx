import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { useRouter, usePathname } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
  return {
    Tabs,
    useRouter: jest.fn(),
    usePathname: jest.fn(() => "/"),
  };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

/**
 * Breakpoint control: the layout reads `useIsDesktop`; tests flip the window
 * width by overriding the hook module.
 */
const mockIsDesktop = jest.fn(() => false);

jest.mock("../../src/hooks/useIsDesktop", () => ({
  useIsDesktop: () => mockIsDesktop(),
  DESKTOP_BREAKPOINT: 760,
}));

const mockedUseRouter = jest.mocked(useRouter);
const mockedUsePathname = jest.mocked(usePathname);
const mockedGetFirebaseAuth = jest.mocked(getFirebaseAuth);
const mockedOnAuthStateChanged = jest.mocked(onAuthStateChanged);
const mockedSignOut = jest.mocked(signOut);

beforeEach(() => {
  jest.resetAllMocks();
  mockIsDesktop.mockImplementation(() => false);
  process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = "true";
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
  mockedUsePathname.mockReturnValue("/");
});

async function renderShell() {
  return await render(
    <AuthProvider>
      <TabsLayout />
    </AuthProvider>,
  );
}

describe("TabsLayout responsive shell", () => {
  it("shows the bottom tab bar and no desktop chrome on a narrow window", async () => {
    mockIsDesktop.mockImplementation(() => false);

    await renderShell();

    await waitFor(() => {
      expect(screen.getByTestId("tabs")).toBeOnTheScreen();
    });
    expect(screen.queryByTestId("desktop-appbar")).toBeNull();
    expect(screen.queryByTestId("desktop-drawer")).toBeNull();
  });

  it("shows AppBar and 240px sidebar with all 5 entries on a wide window", async () => {
    mockIsDesktop.mockImplementation(() => true);

    await renderShell();

    await waitFor(() => {
      expect(screen.getByTestId("desktop-drawer")).toBeOnTheScreen();
    });
    expect(screen.getByTestId("desktop-appbar")).toBeOnTheScreen();
    expect(screen.getByTestId("desktop-signout")).toBeOnTheScreen();

    // Mockup drawer: 4 main entries + Administration/Stammdaten.
    for (const route of ["/", "/people", "/conversations", "/tasks", "/stammdaten"]) {
      expect(screen.getByTestId(`drawer-item-${route}`)).toBeOnTheScreen();
    }
  });

  it("marks the parent entry active for detail routes (e.g. Stammdaten-Editoren)", async () => {
    mockIsDesktop.mockImplementation(() => true);
    mockedUsePathname.mockReturnValue("/stammdaten/rollen");

    await renderShell();

    const stammdatenItem = await screen.findByTestId("drawer-item-/stammdaten");
    expect(stammdatenItem.props.accessibilityState).toMatchObject({ selected: true });
    // Active entries use the primary-soft background (mockup .nav-item.active).
    expect(stammdatenItem.props.style).toMatchObject({ backgroundColor: "#E8F0FB" });

    const peopleItem = screen.getByTestId("drawer-item-/people");
    expect(peopleItem.props.accessibilityState).toMatchObject({ selected: false });

    // The AppBar shows the mockup breadcrumb for the active administration entry.
    expect(screen.getByText("Administration / Stammdaten")).toBeOnTheScreen();
  });

  it("highlights the overview entry at the root route", async () => {
    mockIsDesktop.mockImplementation(() => true);
    mockedUsePathname.mockReturnValue("/");

    await renderShell();

    const overviewItem = await screen.findByTestId("drawer-item-/");
    expect(overviewItem.props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId("drawer-item-/stammdaten").props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it("signs out from the AppBar and returns to the login screen", async () => {
    mockIsDesktop.mockImplementation(() => true);
    const authStub = { currentUser: null } as never;
    mockedGetFirebaseAuth.mockReturnValue(authStub);
    const replace = jest.fn();
    mockedUseRouter.mockReturnValue({
      replace,
      push: jest.fn(),
      back: jest.fn(),
    } as never);

    await renderShell();

    await waitFor(() => {
      expect(screen.getByTestId("desktop-signout")).toBeOnTheScreen();
    });

    await fireEvent.press(screen.getByTestId("desktop-signout"));

    await waitFor(() => {
      expect(mockedSignOut).toHaveBeenCalledWith(authStub);
    });
    // Signed-out state redirects back to the login screen.
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/(auth)/login");
    });
  });
});

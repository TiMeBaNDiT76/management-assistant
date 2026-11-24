import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { useRouter } from "expo-router";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type UserCredential,
} from "firebase/auth";
import { AuthProvider } from "../../src/auth/auth-context";
import { getFirebaseAuth } from "../../src/lib/firebase";
import LoginScreen from "../../app/(auth)/login";

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

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
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

async function renderLogin() {
  return render(
    <AuthProvider>
      <LoginScreen />
    </AuthProvider>,
  );
}

async function fillCredentials(emailValue: string, passwordValue: string) {
  await fireEvent.changeText(screen.getByPlaceholderText("E-Mail"), emailValue);
  await fireEvent.changeText(
    screen.getByPlaceholderText("Passwort"),
    passwordValue,
  );
}

describe("LoginScreen", () => {
  it("renders email/password inputs and sign-in button", async () => {
    await renderLogin();

    expect(screen.getByPlaceholderText("E-Mail")).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("Passwort")).toBeOnTheScreen();
    expect(screen.getByText("Anmelden")).toBeOnTheScreen();
    expect(screen.getByText(/Noch kein Konto\? Registrieren/)).toBeOnTheScreen();
  });

  it("signs in successfully and redirects to the tabs area", async () => {
    jest
      .mocked(signInWithEmailAndPassword)
      .mockResolvedValue({} as UserCredential);
    const replace = jest.fn();
    mockedUseRouter.mockReturnValue({ replace, push: jest.fn(), back: jest.fn() } as never);

    await renderLogin();
    await fillCredentials("chef@example.com", "secret123");
    await fireEvent.press(screen.getByText("Anmelden"));

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        "chef@example.com",
        "secret123",
      );
      expect(replace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("shows a friendly error for invalid credentials", async () => {
    jest
      .mocked(signInWithEmailAndPassword)
      .mockRejectedValue(
        Object.assign(new Error("bad credentials"), {
          code: "auth/invalid-credential",
        }),
      );

    await renderLogin();
    await fillCredentials("chef@example.com", "wrong");
    await fireEvent.press(screen.getByText("Anmelden"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error").props.children).toBe(
        "E-Mail oder Passwort ist falsch.",
      );
    });
  });

  it("shows a config hint when Firebase is not set up", async () => {
    mockedGetFirebaseAuth.mockReturnValue(null);

    await renderLogin();
    await fillCredentials("chef@example.com", "secret123");
    await fireEvent.press(screen.getByText("Anmelden"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error").props.children).toContain(
        "Firebase ist nicht konfiguriert",
      );
    });
  });

  it("switches to registration mode and calls signUp", async () => {
    jest
      .mocked(createUserWithEmailAndPassword)
      .mockResolvedValue({} as UserCredential);
    const replace = jest.fn();
    mockedUseRouter.mockReturnValue({ replace, push: jest.fn(), back: jest.fn() } as never);

    await renderLogin();
    await fireEvent.press(screen.getByText(/Noch kein Konto\? Registrieren/));
    await waitFor(() => {
      expect(screen.getByText("Registrieren")).toBeOnTheScreen();
    });

    await fillCredentials("new@example.com", "secret123");
    await fireEvent.press(screen.getByText("Registrieren"));

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        "new@example.com",
        "secret123",
      );
      expect(replace).toHaveBeenCalledWith("/(tabs)");
    });
  });
});

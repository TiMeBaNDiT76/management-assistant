import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import {
  jest,
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
} from "@jest/globals";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  type UserCredential,
} from "firebase/auth";
import { AuthProvider } from "../../src/auth/auth-context";
import { getFirebaseAuth } from "../../src/lib/firebase";
import LoginScreen from "../../app/(auth)/login";

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(),
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

/** Shared GoogleAuthProvider instance captured by the mocked constructor. */
const mockGoogleProvider = { addScope: jest.fn() };
const defaultOS = Platform.OS;

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
  jest
    .mocked(GoogleAuthProvider as unknown as jest.Mock)
    .mockImplementation(() => mockGoogleProvider);
});

afterEach(() => {
  Platform.OS = defaultOS;
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

describe("LoginScreen (Google sign-in)", () => {
  it("renders the Google button, an 'oder' divider and the email form", async () => {
    await renderLogin();

    expect(screen.getByTestId("google-sign-in")).toBeOnTheScreen();
    expect(screen.getByTestId("google-logo")).toBeOnTheScreen();
    expect(screen.getByText("Mit Google anmelden")).toBeOnTheScreen();
    expect(screen.getByText("oder")).toBeOnTheScreen();
    // The email/password form stays fully present below the divider.
    expect(screen.getByPlaceholderText("E-Mail")).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("Passwort")).toBeOnTheScreen();
    expect(screen.getByText("Anmelden")).toBeOnTheScreen();
  });

  it("signs in with Google via popup and redirects to the tabs area", async () => {
    Platform.OS = "web";
    jest
      .mocked(signInWithPopup)
      .mockResolvedValue({} as unknown as UserCredential);
    const replace = jest.fn();
    mockedUseRouter.mockReturnValue({ replace, push: jest.fn(), back: jest.fn() } as never);

    await renderLogin();
    await fireEvent.press(screen.getByTestId("google-sign-in"));

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalledWith(
        expect.anything(),
        mockGoogleProvider as unknown as GoogleAuthProvider,
      );
      expect(mockGoogleProvider.addScope).toHaveBeenCalledWith("email");
      expect(mockGoogleProvider.addScope).toHaveBeenCalledWith("profile");
      expect(replace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("explains an unauthorized domain in German", async () => {
    Platform.OS = "web";
    jest.mocked(signInWithPopup).mockRejectedValue(
      Object.assign(new Error("unauthorized"), {
        code: "auth/unauthorized-domain",
      }),
    );

    await renderLogin();
    await fireEvent.press(screen.getByTestId("google-sign-in"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error").props.children).toContain(
        "Diese Domain ist in Firebase nicht freigeschaltet",
      );
    });
  });

  it("reports a cancelled popup as aborted", async () => {
    Platform.OS = "web";
    jest.mocked(signInWithPopup).mockRejectedValue(
      Object.assign(new Error("cancelled"), {
        code: "auth/popup-closed-by-user",
      }),
    );

    await renderLogin();
    await fireEvent.press(screen.getByTestId("google-sign-in"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error").props.children).toBe(
        "Anmeldung abgebrochen.",
      );
    });
  });

  it("reports a blocked popup with a permission hint", async () => {
    Platform.OS = "web";
    jest.mocked(signInWithPopup).mockRejectedValue(
      Object.assign(new Error("blocked"), {
        code: "auth/popup-blocked",
      }),
    );

    await renderLogin();
    await fireEvent.press(screen.getByTestId("google-sign-in"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error").props.children).toBe(
        "Popup blockiert — bitte Popups erlauben.",
      );
    });
  });

  it("shows a hint when Google sign-in is unavailable (native)", async () => {
    Platform.OS = "ios";

    await renderLogin();
    await fireEvent.press(screen.getByTestId("google-sign-in"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error").props.children).toBe(
        "Google-Anmeldung ist auf Web verfügbar.",
      );
    });
  });
});

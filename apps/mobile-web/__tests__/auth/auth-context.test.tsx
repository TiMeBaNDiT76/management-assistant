import { render, screen, waitFor, act, fireEvent } from "@testing-library/react-native";
import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import { Text } from "react-native";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type UserCredential,
} from "firebase/auth";
import { AuthProvider, useAuth, DEV_USER_ID } from "../../src/auth/auth-context";
import { getFirebaseAuth } from "../../src/lib/firebase";

/**
 * Firebase's `NextOrObserver<User>` is a union and not directly callable —
 * cast listener callbacks captured from the mocked `onAuthStateChanged`.
 */
type AuthStateCallback = (user: unknown) => void;

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

const mockedOnAuthStateChanged = jest.mocked(onAuthStateChanged);
const mockedGetFirebaseAuth = jest.mocked(getFirebaseAuth);

/** Renders the current auth state as text for assertions. */
function AuthProbe() {
  const { status, user } = useAuth();
  return (
    <Text testID="probe">
      {`${status}:${user?.id ?? "none"}:${user?.email ?? "-"}`}
    </Text>
  );
}

async function renderProbe() {
  await render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  );
}

const probeText = () => screen.getByTestId("probe").props.children as string;

beforeEach(() => {
  jest.resetAllMocks();
  process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = "false";
  mockedGetFirebaseAuth.mockReturnValue({ currentUser: null } as never);
});

describe("AuthProvider (dev bypass)", () => {
  it("signs in the fixed dev-local-user immediately", async () => {
    process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = "true";

    await renderProbe();

    await waitFor(() => {
      expect(probeText()).toBe(`signedIn:${DEV_USER_ID}:-`);
    });
  });

  it("resolves signIn instantly with the dev identity without touching Firebase", async () => {
    process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS = "true";
    mockedOnAuthStateChanged.mockImplementation(() => () => undefined);

    let resolved = false;
    function SignInProbe() {
      const { signIn } = useAuth();
      return (
        <Text
          testID="action"
          onPress={() => {
            void signIn("chef@example.com", "secret123").then(() => {
              resolved = true;
            });
          }}
        />
      );
    }
    await render(
      <AuthProvider>
        <AuthProbe />
        <SignInProbe />
      </AuthProvider>,
    );

    await fireEvent.press(screen.getByTestId("action"));
    await waitFor(() => {
      expect(resolved).toBe(true);
    });
    expect(probeText()).toBe(`signedIn:${DEV_USER_ID}:-`);
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });
});

describe("AuthProvider (Firebase, no config)", () => {
  it("ends up signedOut when no Firebase config is present", async () => {
    mockedGetFirebaseAuth.mockReturnValue(null);

    await renderProbe();

    await waitFor(() => {
      expect(probeText()).toBe("signedOut:none:-");
    });
  });
});

describe("AuthProvider (Firebase session)", () => {
  it("maps onAuthStateChanged user updates to the auth state", async () => {
    // Firebase invokes the listener immediately with the current user and
    // then on every session change.
    let stateCallback: AuthStateCallback | undefined;
    mockedOnAuthStateChanged.mockImplementation((_auth, callback) => {
      stateCallback = callback as unknown as AuthStateCallback;
      (callback as AuthStateCallback)(null);
      return () => undefined;
    });

    await renderProbe();

    // Signed out first.
    await waitFor(() => {
      expect(probeText()).toBe("signedOut:none:-");
    });

    // Session appears.
    await act(async () => {
      stateCallback!({
        uid: "firebase-uid-1",
        email: "chef@example.com",
      });
    });
    await waitFor(() => {
      expect(probeText()).toBe("signedIn:firebase-uid-1:chef@example.com");
    });

    // Session disappears.
    await act(async () => {
      stateCallback!(null);
    });
    await waitFor(() => {
      expect(probeText()).toBe("signedOut:none:-");
    });
  });
});

describe("AuthProvider actions (Firebase mode)", () => {
  it("propagates signIn failures to the caller", async () => {
    mockedOnAuthStateChanged.mockImplementation(() => () => undefined);
    jest
      .mocked(signInWithEmailAndPassword)
      .mockRejectedValue(
        Object.assign(new Error("bad credentials"), {
          code: "auth/invalid-credential",
        }),
      );

    let caught: unknown = "nothing";
    function SignInProbe() {
      const { signIn } = useAuth();
      return (
        <Text
          testID="action"
          onPress={() => {
            void signIn("chef@example.com", "wrong").catch((err) => {
              caught = err;
            });
          }}
        />
      );
    }
    await render(
      <AuthProvider>
        <SignInProbe />
      </AuthProvider>,
    );

    await fireEvent.press(screen.getByTestId("action"));
    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        "chef@example.com",
        "wrong",
      );
      expect(caught).toBeInstanceOf(Error);
    });
  });

  it("registers via createUserWithEmailAndPassword", async () => {
    mockedOnAuthStateChanged.mockImplementation(() => () => undefined);
    jest
      .mocked(createUserWithEmailAndPassword)
      .mockResolvedValue({} as UserCredential);

    function SignUpProbe() {
      const { signUp } = useAuth();
      return (
        <Text
          testID="action"
          onPress={() => {
            void signUp("new@example.com", "secret123");
          }}
        />
      );
    }
    await render(
      <AuthProvider>
        <SignUpProbe />
      </AuthProvider>,
    );

    await fireEvent.press(screen.getByTestId("action"));
    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        "new@example.com",
        "secret123",
      );
    });
  });

  it("signs out via firebase signOut", async () => {
    let stateCallback: AuthStateCallback | undefined;
    mockedOnAuthStateChanged.mockImplementation((_auth, callback) => {
      stateCallback = callback as unknown as AuthStateCallback;
      return () => undefined;
    });
    jest.mocked(firebaseSignOut).mockResolvedValue(undefined);

    function SignOutProbe() {
      const { signOut } = useAuth();
      return (
        <Text
          testID="action"
          onPress={() => {
            void signOut();
          }}
        />
      );
    }
    await render(
      <AuthProvider>
        <SignOutProbe />
      </AuthProvider>,
    );

    await fireEvent.press(screen.getByTestId("action"));
    await waitFor(() => {
      expect(firebaseSignOut).toHaveBeenCalledTimes(1);
    });
    expect(stateCallback).toBeDefined();
  });
});

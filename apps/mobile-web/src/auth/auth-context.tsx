/**
 * Auth provider — session state for the whole app.
 *
 * Two modes:
 * - Dev bypass (`EXPO_PUBLIC_DEV_AUTH_BYPASS=true`): instantly signs in the
 *   fixed local dev user (`dev-local-user`) — the same identity the API
 *   expects when `DEV_BYPASS_AUTH=true`. No Firebase project required.
 * - Firebase Auth: real email/password or Google session via
 *   `getFirebaseAuth()` (one-time console setup, see `docs/firebase-setup.md`).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "../lib/firebase";

/** Fixed dev identity — matches the API's `DEV_BYPASS_AUTH` user. */
export const DEV_USER_ID = "dev-local-user";

export interface AuthUser {
  id: string;
  email: string | null;
}

export type AuthStatus = "loading" | "signedOut" | "signedIn";

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** Signs in with email/password (instant in dev bypass). */
  signIn: (email: string, password: string) => Promise<void>;
  /** Registers a new account and signs in (instant in dev bypass). */
  signUp: (email: string, password: string) => Promise<void>;
  /** Signs in with Google on web (popup); unavailable on native shells. */
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isDevBypass(): boolean {
  return process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS === "true";
}

function mapFirebaseUser(user: User): AuthUser {
  return { id: user.uid, email: user.email };
}

function requireFirebaseAuth(): Auth {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error(
      "Firebase ist nicht konfiguriert — siehe docs/firebase-setup.md.",
    );
  }
  return auth;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (isDevBypass()) {
      setStatus("signedIn");
      setUser({ id: DEV_USER_ID, email: null });
      return;
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      // No Firebase config present → nothing to authenticate against.
      setStatus("signedOut");
      return;
    }
    return onAuthStateChanged(auth, (fbUser) => {
      setStatus(fbUser ? "signedIn" : "signedOut");
      setUser(fbUser ? mapFirebaseUser(fbUser) : null);
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (isDevBypass()) {
      setStatus("signedIn");
      setUser({ id: DEV_USER_ID, email: null });
      return;
    }
    await signInWithEmailAndPassword(requireFirebaseAuth(), email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (isDevBypass()) {
      setStatus("signedIn");
      setUser({ id: DEV_USER_ID, email: null });
      return;
    }
    await createUserWithEmailAndPassword(requireFirebaseAuth(), email, password);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (Platform.OS !== "web") {
      // Native shells are not deployed yet — no expo-auth-session wiring.
      throw new Error("Google-Anmeldung ist auf Web verfügbar.");
    }
    if (isDevBypass()) {
      setStatus("signedIn");
      setUser({ id: DEV_USER_ID, email: null });
      return;
    }
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    await signInWithPopup(requireFirebaseAuth(), provider);
  }, []);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (auth) await firebaseSignOut(auth);
    setStatus("signedOut");
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signUp, signInWithGoogle, signOut }),
    [status, user, signIn, signUp, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the session state — must be used inside `<AuthProvider>`. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return value;
}

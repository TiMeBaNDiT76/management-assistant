/**
 * Direct tests for the Firebase wiring in `src/lib/firebase.ts`.
 *
 * Covers the config gating that drives the app's two auth modes: with no
 * (or partial) `EXPO_PUBLIC_FIREBASE_*` env config, `getFirebaseAuth()`
 * returns null and the app runs on the dev-bypass identity; with a full
 * config, Firebase Auth is initialized once with AsyncStorage persistence
 * and `getAuthToken()` resolves the session's ID token.
 *
 * No real GCP project IDs or API keys are used — only obviously fake values.
 */
import { jest, describe, beforeEach, afterEach, it, expect } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
import * as firebaseAuth from "firebase/auth";
import {
  getAuthToken,
  getFirebaseAuth,
  readFirebaseConfig,
} from "../../src/lib/firebase";

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(),
}));

jest.mock("firebase/auth", () => ({
  initializeAuth: jest.fn(),
  getReactNativePersistence: jest.fn(),
}));

jest.mocked(initializeApp).mockReturnValue({ name: "mock-app" } as never);
jest.mocked(getApps).mockReturnValue([]);
jest
  .mocked(initializeAuth)
  .mockReturnValue({ currentUser: null } as never);

/** Not present in the browser TS types — same narrow accessor as `firebase.ts`. */
const getReactNativePersistence = (
  firebaseAuth as unknown as {
    getReactNativePersistence: (storage: unknown) => unknown;
  }
).getReactNativePersistence;
jest.mocked(getReactNativePersistence).mockImplementation(() => "persistence");

const ENV_KEYS = [
  "EXPO_PUBLIC_FIREBASE_API_KEY",
  "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
  "EXPO_PUBLIC_FIREBASE_APP_ID",
] as const;

/** Fake, non-real credentials for the complete-config case (env var → config key). */
const FAKE_ENV: Record<string, string> = {
  EXPO_PUBLIC_FIREBASE_API_KEY: "test-api-key-not-real",
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.invalid",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: "test-project-placeholder",
  EXPO_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:placeholder",
};

/** The mapped config `readFirebaseConfig` derives from the env vars above. */
const FAKE_CONFIG = {
  apiKey: FAKE_ENV.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: FAKE_ENV.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: FAKE_ENV.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: FAKE_ENV.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

function setCompleteConfig(): void {
  for (const [key, value] of Object.entries(FAKE_ENV)) {
    process.env[key] = value;
  }
}

describe("readFirebaseConfig", () => {
  it("returns null when no env vars are set", () => {
    expect(readFirebaseConfig()).toBeNull();
  });

  it("returns null when any single env var is missing", () => {
    for (const missing of ENV_KEYS) {
      setCompleteConfig();
      delete process.env[missing];
      expect(readFirebaseConfig()).toBeNull();
    }
  });

  it("returns the full config when all four env vars are set", () => {
    setCompleteConfig();
    expect(readFirebaseConfig()).toEqual(FAKE_CONFIG);
  });
});

describe("getFirebaseAuth / getAuthToken", () => {
  it("returns null (and a null token) when no config is present", async () => {
    expect(getFirebaseAuth()).toBeNull();
    expect(initializeApp).not.toHaveBeenCalled();
    expect(await getAuthToken()).toBeNull();
  });

  it("initializes Firebase Auth with AsyncStorage persistence and resolves ID tokens when configured", async () => {
    // One mutable auth instance so the signed-out → signed-in transition
    // works through `firebase.ts`'s module-level auth cache.
    const authInstance = {
      currentUser: null as { getIdToken: () => Promise<string> } | null,
    };
    jest.mocked(initializeAuth).mockReturnValue(authInstance as never);

    setCompleteConfig();

    expect(getFirebaseAuth()).not.toBeNull();
    // Lazily initialized: the second call reuses the cached instance.
    expect(getFirebaseAuth()).toBe(getFirebaseAuth());
    expect(initializeApp).toHaveBeenCalledWith(FAKE_CONFIG);
    expect(initializeAuth).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ persistence: "persistence" }),
    );
    expect(jest.mocked(getReactNativePersistence)).toHaveBeenCalledWith(
      AsyncStorage,
    );

    // Signed-out → no token.
    expect(await getAuthToken()).toBeNull();

    // Signed-in → the session's ID token.
    authInstance.currentUser = { getIdToken: async () => "id-token-xyz" };
    expect(await getAuthToken()).toBe("id-token-xyz");
  });
});

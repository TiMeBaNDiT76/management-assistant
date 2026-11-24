/* eslint-disable @typescript-eslint/no-require-imports --
 * jest.resetModules() + require() is the only way to obtain a fresh instance
 * of the module under test (its auth singleton lives in module scope);
 * dynamic import() is unsupported inside jest's CommonJS VM. */

/**
 * Tests for the platform-dependent Firebase Auth persistence wiring in
 * `firebase.ts`.
 *
 * Regression context: on web, Metro resolves the *browser* entry of
 * `firebase/auth`, which does not export `getReactNativePersistence`.
 * Unconditionally passing it to `initializeAuth` crashed with
 * "l is not a function" (white screen on the first Firebase login on TEST).
 *
 * The default jest-expo environment reports `Platform.OS === "ios"`, so the
 * react-native mock below makes the platform switchable per test — the web
 * branch must use `browserLocalPersistence` and never touch
 * `getReactNativePersistence`.
 */
import type { Auth, Persistence } from "firebase/auth";
import type { FirebaseWebConfig } from "./firebase";

/** Mutable platform override consumed by the react-native mock factory. */
const mockPlatformState = { os: "ios" };

jest.mock("react-native", () => ({
  Platform: {
    get OS() {
      return mockPlatformState.os;
    },
    select: jest.fn(),
  },
}));

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({ name: "test-app" })),
  getApps: jest.fn(() => []),
}));

jest.mock("firebase/auth", () => ({
  browserLocalPersistence: { type: "LOCAL" },
  initializeAuth: jest.fn(() => "auth-instance"),
  getReactNativePersistence: jest.fn(() => ({ type: "RN" })),
}));

/** Complete, clearly fictional Firebase web config (public repository). */
const TEST_CONFIG = {
  EXPO_PUBLIC_FIREBASE_API_KEY: "test-api-key",
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "test.example.firebaseapp.com",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
  EXPO_PUBLIC_FIREBASE_APP_ID: "1:0000000000:web:0000000000000000",
} as const;

const ENV_KEYS = Object.keys(TEST_CONFIG) as Array<keyof typeof TEST_CONFIG>;

interface AuthMocks {
  browserLocalPersistence: Persistence;
  initializeAuth: jest.Mock;
  getReactNativePersistence: jest.Mock;
}

/** Runtime shape of the module under test (fresh instance per test). */
interface FirebaseModule {
  readFirebaseConfig: () => FirebaseWebConfig | null;
  getFirebaseAuth: () => Auth | null;
  getAuthToken: () => Promise<string | null>;
}

function loadFirebase(): {
  authMocks: AuthMocks;
  appMocks: { initializeApp: jest.Mock; getApps: jest.Mock };
  firebase: FirebaseModule;
} {
  // `require` (not dynamic import) so the fresh module registry created by
  // jest.resetModules() is used; import order guarantees the mocked modules
  // and the module under test share the same jest.fn instances.
  const authMocks = require("firebase/auth") as unknown as AuthMocks;
  const appMocks = require("firebase/app") as unknown as {
    initializeApp: jest.Mock;
    getApps: jest.Mock;
  };
  const firebase = require("./firebase") as FirebaseModule;
  return { authMocks, appMocks, firebase };
}

describe("firebase auth wiring", () => {
  const originalValues = ENV_KEYS.map((key) => process.env[key]);

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockPlatformState.os = "ios";
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  afterAll(() => {
    ENV_KEYS.forEach((key, index) => {
      const original = originalValues[index];
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    });
  });

  describe("readFirebaseConfig", () => {
    test("returns the config when every EXPO_PUBLIC_FIREBASE_* var is set", () => {
      Object.assign(process.env, TEST_CONFIG);
      const { firebase } = loadFirebase();
      expect(firebase.readFirebaseConfig()).toEqual({
        apiKey: TEST_CONFIG.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: TEST_CONFIG.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: TEST_CONFIG.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        appId: TEST_CONFIG.EXPO_PUBLIC_FIREBASE_APP_ID,
      });
    });

    test("returns null when a single variable is missing", () => {
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY =
        TEST_CONFIG.EXPO_PUBLIC_FIREBASE_API_KEY;
      const { firebase } = loadFirebase();
      expect(firebase.readFirebaseConfig()).toBe(null);
    });
  });

  test("returns null and skips initialization without a complete config", () => {
    const { authMocks, appMocks, firebase } = loadFirebase();

    expect(firebase.getFirebaseAuth()).toBe(null);
    expect(appMocks.getApps).not.toHaveBeenCalled();
    expect(appMocks.initializeApp).not.toHaveBeenCalled();
    expect(authMocks.initializeAuth).not.toHaveBeenCalled();
  });

  test("native platform: initializeAuth receives AsyncStorage-backed persistence", () => {
    mockPlatformState.os = "ios";
    Object.assign(process.env, TEST_CONFIG);
    const { authMocks, firebase } = loadFirebase();
    const asyncStorage = require("@react-native-async-storage/async-storage")
      .default as unknown;

    const auth = firebase.getFirebaseAuth();

    expect(auth).toBe("auth-instance");
    expect(authMocks.getReactNativePersistence).toHaveBeenCalledTimes(1);
    expect(authMocks.getReactNativePersistence).toHaveBeenCalledWith(
      asyncStorage,
    );
    expect(authMocks.initializeAuth).toHaveBeenCalledTimes(1);
    const options = authMocks.initializeAuth.mock.calls[0]?.[1] as
      | { persistence: Persistence }
      | undefined;
    expect(options?.persistence).toBe(
      authMocks.getReactNativePersistence.mock.results[0]?.value,
    );
  });

  test("web platform: initializeAuth receives browserLocalPersistence and never calls getReactNativePersistence", () => {
    mockPlatformState.os = "web";
    Object.assign(process.env, TEST_CONFIG);
    const { authMocks, firebase } = loadFirebase();

    const auth = firebase.getFirebaseAuth();

    expect(auth).toBe("auth-instance");
    expect(authMocks.initializeAuth).toHaveBeenCalledTimes(1);
    const options = authMocks.initializeAuth.mock.calls[0]?.[1] as
      | { persistence: Persistence }
      | undefined;
    expect(options?.persistence).toBe(authMocks.browserLocalPersistence);
    expect(authMocks.getReactNativePersistence).not.toHaveBeenCalled();
  });

  test("web platform: initializeApp receives the env-based config", () => {
    mockPlatformState.os = "web";
    Object.assign(process.env, TEST_CONFIG);
    const { appMocks, firebase } = loadFirebase();

    firebase.getFirebaseAuth();

    expect(appMocks.initializeApp).toHaveBeenCalledTimes(1);
    expect(appMocks.initializeApp).toHaveBeenCalledWith({
      apiKey: TEST_CONFIG.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: TEST_CONFIG.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: TEST_CONFIG.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      appId: TEST_CONFIG.EXPO_PUBLIC_FIREBASE_APP_ID,
    });
  });

  test("caches the auth instance across calls", () => {
    Object.assign(process.env, TEST_CONFIG);
    const { authMocks, firebase } = loadFirebase();

    const first = firebase.getFirebaseAuth();
    const second = firebase.getFirebaseAuth();

    expect(first).toBe("auth-instance");
    expect(second).toBe(first);
    expect(authMocks.initializeAuth).toHaveBeenCalledTimes(1);
  });
});

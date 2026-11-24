/**
 * Firebase Auth wiring (see docs/firebase-setup.md).
 *
 * The web app config comes exclusively from `EXPO_PUBLIC_FIREBASE_*` env
 * variables — nothing is hardcoded (public repository). When no config is
 * present, `getFirebaseAuth()` returns null and the app runs with the
 * dev-bypass identity instead (see auth-context).
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as firebaseAuth from "firebase/auth";
import type {
  Auth,
  Persistence,
  ReactNativeAsyncStorage,
} from "firebase/auth";

const { initializeAuth } = firebaseAuth;

/**
 * `getReactNativePersistence` ships with the react-native entry of
 * `firebase/auth` (which Metro resolves at runtime via the package's
 * `react-native` export condition), but the default TypeScript types describe
 * the browser entry and omit it — hence the narrow typed accessor below.
 */
const getReactNativePersistence = (
  firebaseAuth as unknown as {
    getReactNativePersistence: (
      storage: ReactNativeAsyncStorage,
    ) => Persistence;
  }
).getReactNativePersistence;

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export function readFirebaseConfig(): FirebaseWebConfig | null {
  const config: FirebaseWebConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
  };
  const complete = Object.values(config).every((value) => value.length > 0);
  return complete ? config : null;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/** Lazily initializes Firebase Auth with AsyncStorage persistence. */
export function getFirebaseAuth(): Auth | null {
  if (auth) return auth;
  const config = readFirebaseConfig();
  if (!config) return null;
  app = getApps().length > 0 ? getApps()[0]! : initializeApp(config);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  return auth;
}

/**
 * Returns a valid Firebase ID token for the signed-in user (used as
 * `Authorization: Bearer <token>` on tRPC requests), or null when signed out
 * or running without a Firebase config (dev bypass).
 */
export async function getAuthToken(): Promise<string | null> {
  const user = getFirebaseAuth()?.currentUser;
  return user ? user.getIdToken() : null;
}

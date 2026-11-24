import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@mgmt/api";
import { getAuthToken } from "./firebase";

/**
 * Typed tRPC client for the management-assistant API.
 * `AppRouter` is a type-only import — the server code never ships into the
 * app bundle.
 */
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

/** tRPC endpoint, configurable via `EXPO_PUBLIC_API_URL` (see `.env.example`). */
export function getApiUrl(): string {
  // Empty string (e.g. an unset GitHub `vars.EXPO_PUBLIC_API_URL` rendered
  // into the build env) counts as "not configured" so the local fallback
  // still applies.
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url && url.length > 0 ? url : "http://localhost:4000/trpc";
}

/**
 * Authorization headers for API requests. Injects `Authorization: Bearer
 * <firebaseIdToken>` when a session exists; empty headers otherwise (the API
 * then answers 401, except when the dev bypass is active on both ends).
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Creates the tRPC client used by the root provider. */
export function createTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: getApiUrl(),
        headers: authHeaders,
      }),
    ],
  });
}

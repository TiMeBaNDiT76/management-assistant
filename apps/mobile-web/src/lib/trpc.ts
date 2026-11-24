import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@mgmt/api";

/**
 * Typed tRPC client for the management-assistant API.
 * `AppRouter` is a type-only import — the server code never ships into the
 * app bundle.
 */
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

/** tRPC endpoint, configurable via `EXPO_PUBLIC_API_URL` (see `.env.example`). */
export function getApiUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/trpc";
}

/** Creates the tRPC client used by the root provider. */
export function createTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: getApiUrl() })],
  });
}

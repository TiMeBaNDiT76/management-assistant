import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app";
import type { BuildAppOptions } from "../app";
import type { AppRouter } from "../trpc/app-router";

/** Builds an app instance with a throwaway in-memory SQLite DB and auth bypass. */
export async function createTestApp(overrides: BuildAppOptions = {}): Promise<FastifyInstance> {
  return buildApp({
    dbPath: ":memory:",
    devBypassAuth: true,
    logLevel: "silent",
    allowedOrigins: [],
    // Dummy key so assistant endpoints are wired; tests mock `@google/genai`.
    ai: { apiKey: "test-key" },
    ...overrides,
  });
}

/** Fetch implementation backed by fastify `inject` — no real sockets needed. */
export function injectFetch(app: FastifyInstance): typeof fetch {
  return async (input, init) => {
    const url = String(input).replace(/^https?:\/\/[^/]+/i, "");
    const response = await app.inject({
      method: ((init?.method ?? "GET") as "GET" | "POST"),
      url,
      payload: typeof init?.body === "string" ? init.body : undefined,
      headers: (init?.headers as Record<string, string>) ?? {},
    });
    return new Response(response.body, {
      status: response.statusCode,
      headers: response.headers as Record<string, string>,
    });
  };
}

/** Typed tRPC client routed through `app.inject`. */
export function createTestClient(app: FastifyInstance) {
  return createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: "http://localhost/trpc", fetch: injectFetch(app) })],
  });
}

import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import cors from "@fastify/cors";
import fp from "fastify-plugin";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { FastifyInstance, FastifyRequest } from "fastify";
import Fastify from "fastify";
import { initializeDatabase, type AppDatabase } from "@mgmt/shared";
import { authPlugin, type AuthUser } from "./auth/auth-plugin";
import type { AppConfig } from "./config";
import { loadConfig } from "./config";
import { healthPlugin } from "./plugins/health";
import { openApiPlugin } from "./plugins/openapi";
import { resolveWebDistPath, webStaticPlugin } from "./plugins/web-static";
import { createServices, type Services } from "./services/container";
import { appRouter, type AppRouter } from "./trpc/app-router";
import type { TrpcContext } from "./trpc/context";

declare module "fastify" {
  interface FastifyInstance {
    db: AppDatabase;
    services: Services;
  }
  // `user` / `ownerUserId` come from the auth plugin (see auth-plugin.ts).
  interface FastifyRequest {
    user?: AuthUser;
    ownerUserId?: string;
  }
}

export type BuildAppOptions = Partial<AppConfig>;

/** Hop-by-hop / recomputed headers we never forward to the tRPC web Request. */
const STRIPPED_HEADERS = new Set(["content-length", "connection", "host", "content-encoding"]);

/** Converts a Fastify request into the web `Request` expected by tRPC's fetch adapter. */
function toWebRequest(request: FastifyRequest): Request {
  const url = `${request.protocol}://${request.host}${request.raw.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined || STRIPPED_HEADERS.has(key)) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  if (request.method === "POST" && request.body !== undefined) {
    // Body is a string — no `duplex` required for non-streaming request bodies.
    return new Request(url, { method: "POST", headers, body: JSON.stringify(request.body) });
  }
  return new Request(url, { method: request.method, headers });
}

/**
 * Builds the Fastify application: SQLite (WAL) + CORS + Firebase auth +
 * OpenAPI docs at `/docs` + tRPC at `/trpc` + `/health`, plus optional
 * static hosting of the exported web app at `/` (when `WEB_DIST_PATH`
 * points at an existing directory, e.g. inside the Cloud Run image).
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config: AppConfig = { ...loadConfig(), ...options };
  const handle = initializeDatabase({ filename: config.dbPath });

  // Static hosting for the exported web app — only when the dist directory
  // exists (Cloud Run image stages it at /app/web); locally without a staged
  // export the API behaves exactly as before (API-only, JSON root metadata).
  const webDistPath = resolveWebDistPath(config.webDistPath);

  const app = Fastify({
    logger: { level: config.logLevel },
  });
  app.decorate("db", handle.db);

  await app.register(cors, { origin: config.allowedOrigins, credentials: true });
  // fastify-plugin: register in the root scope so the auth hook also applies
  // to root-level routes like `/trpc/*` (Fastify encapsulation).
  await app.register(
    fp(authPlugin, { name: "auth-plugin" }),
    {
      devBypassAuth: config.devBypassAuth,
      firebaseProjectId: config.firebaseProjectId,
      // SPA documents/assets are browser navigations without bearer tokens.
      publicStaticPaths: webDistPath !== undefined,
    },
  );
  await app.register(openApiPlugin);
  await app.register(healthPlugin, { includeRootMetadata: webDistPath === undefined });

  if (webDistPath) {
    // fastify-plugin wrapper: registers at the root scope so the plugin's
    // `setNotFoundHandler` (SPA fallback) applies to every unmatched request.
    await app.register(fp(webStaticPlugin, { name: "web-static-plugin" }), { webDistPath });
  }

  const services = createServices(handle, config);
  app.decorate("services", services);

  app.route({
    method: ["GET", "POST"],
    url: "/trpc/*",
    handler: async (request, reply) => {
      const context: TrpcContext = {
        ownerUserId: request.ownerUserId ?? "",
        services,
      };
      const response = await fetchRequestHandler({
        endpoint: "/trpc",
        req: toWebRequest(request),
        router: appRouter,
        createContext: () => context,
        onError: ({ error }) => request.log.error({ err: error }, "tRPC error"),
      });

      reply.status(response.status);
      for (const [key, value] of response.headers) {
        if (STRIPPED_HEADERS.has(key)) continue;
        reply.header(key, value);
      }
      return reply.send(Readable.fromWeb(response.body as NodeWebReadableStream));
    },
  });

  app.addHook("onClose", async () => {
    handle.sqlite.close();
  });

  return app;
}

export { appRouter };
export type { AppRouter };

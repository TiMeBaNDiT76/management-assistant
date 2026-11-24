/**
 * Static hosting for the exported web app (Expo static export) — a single
 * origin for API + web.
 *
 * Active only when `WEB_DIST_PATH` is set AND the directory exists; locally
 * without a staged export the API keeps its previous behaviour (no static
 * hosting). When active the plugin:
 *
 * - serves the dist files at `/` via `@fastify/static` with `wildcard: false`
 *   (one route per file at boot, so existing routes and the not-found handler
 *   keep precedence over the static files);
 * - installs a root-scope SPA fallback on top of `setNotFoundHandler`:
 *   GET/HEAD requests to paths that are not API paths and matched no file are
 *   answered with `index.html`. Everything else (POST to unknown paths, API
 *   paths) keeps the JSON 404 behaviour — tRPC error responses are untouched;
 * - applies cache headers: `/_expo/` assets are content-hashed by Expo and
 *   get `public, max-age=31536000, immutable`; everything else (index.html,
 *   favicon, ...) is served `no-cache`.
 */
import { existsSync, promises as fsPromises, statSync } from "node:fs";
import path from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyPluginAsync } from "fastify";

export interface WebStaticOptions {
  /** Directory of the exported web app (Expo static export). */
  webDistPath: string;
}

/** Cache directive for content-hashed `/_expo/` assets (one year, immutable). */
const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

/** API path roots that must never receive the HTML fallback. */
const API_ROOTS = ["/trpc", "/docs"] as const;

/** True for paths owned by API routes (never SPA-fallbacked). */
export function isApiPath(pathname: string): boolean {
  if (pathname === "/health") return true;
  return API_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

/**
 * Resolves the static web dist directory: `undefined` when disabled (env unset
 * or directory missing/invalid) so the API behaves exactly as before. Returns
 * an absolute path — `@fastify/static` rejects relative roots.
 */
export function resolveWebDistPath(webDistPath: string | undefined): string | undefined {
  if (!webDistPath) return undefined;
  const resolved = path.resolve(webDistPath);
  if (!existsSync(resolved)) return undefined;
  if (!statSync(resolved).isDirectory()) return undefined;
  return resolved;
}

/**
 * Registers the static file routes + SPA fallback. Registered via
 * fastify-plugin in `app.ts` so `setNotFoundHandler` applies to the root scope
 * (i.e. to every request that matched no route).
 */
export const webStaticPlugin: FastifyPluginAsync<WebStaticOptions> = async (app, options) => {
  const root = options.webDistPath;

  await app.register(fastifyStatic, {
    root,
    prefix: "/",
    // One route per file (no catch-all wildcard) so own routes (health, docs,
    // tRPC) and the not-found handler keep precedence over static files.
    wildcard: false,
    setHeaders: (reply, filePath) => {
      // Expo content-hashes everything below /_expo/ — safe to cache forever.
      const immutable = filePath.startsWith(path.join(root, "_expo"));
      reply.header("cache-control", immutable ? IMMUTABLE_CACHE : "no-cache");
    },
  });

  // Read index.html once at startup: the export is immutable while the
  // container runs, and a Buffer avoids depending on @fastify/static's
  // encapsulated `reply.sendFile` decoration inside the not-found handler.
  const indexHtml = await fsPromises.readFile(path.join(root, "index.html")).catch(() => undefined);
  if (!indexHtml) {
    app.log.warn(`[web-static] No index.html in ${root} — SPA fallback disabled.`);
  }

  // Root-scope not-found handler: document requests get the SPA index,
  // everything else keeps Fastify's JSON 404 (same shape as the default).
  app.setNotFoundHandler((request, reply) => {
    const method = request.method;
    const pathname = (request.raw.url ?? "/").split("?")[0] ?? "/";
    const isDocumentRequest =
      (method === "GET" || method === "HEAD") && !isApiPath(pathname) && indexHtml !== undefined;

    if (isDocumentRequest) {
      return reply
        .status(200)
        .header("content-type", "text/html; charset=utf-8")
        .header("cache-control", "no-cache")
        .send(indexHtml);
    }

    return reply.status(404).send({
      statusCode: 404,
      error: "Not Found",
      message: `Route ${method}:${request.raw.url} not found`,
    });
  });
};

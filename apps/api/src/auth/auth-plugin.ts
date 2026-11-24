import { createRemoteJWKSet, jwtVerify } from "jose";
import type { FastifyPluginAsync } from "fastify";

/** Request identity resolved from the verified Firebase Auth JWT. */
export interface AuthUser {
  id: string;
  email?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
    /** Tenant id (== AuthUser.id) used to scope every SQLite query. */
    ownerUserId?: string;
  }
}

/** Fixed tenant for local development / tests when DEV_BYPASS_AUTH=true. */
export const DEV_USER_ID = "dev-local-user";

export interface AuthPluginOptions {
  devBypassAuth: boolean;
  firebaseProjectId?: string;
}

/** Routes reachable without a bearer token. */
const EXEMPT_URLS = new Set(["/", "/health"]);

function isExempt(url: string): boolean {
  const path = url.split("?")[0] ?? url;
  if (EXEMPT_URLS.has(path)) return true;
  return path === "/docs" || path.startsWith("/docs/");
}

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

/**
 * Fastify plugin that verifies Firebase Auth JWTs on every non-exempt route
 * and decorates the request with `user` / `ownerUserId` (tenant isolation).
 */
export const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (app, options) => {
  const jwks = options.firebaseProjectId
    ? createRemoteJWKSet(new URL(FIREBASE_JWKS_URL))
    : undefined;

  app.addHook("onRequest", async (request, reply) => {
    if (isExempt(request.url)) return;

    if (options.devBypassAuth) {
      request.user = { id: DEV_USER_ID };
      request.ownerUserId = DEV_USER_ID;
      return;
    }

    if (!jwks || !options.firebaseProjectId) {
      request.log.error("Auth misconfiguration: no FIREBASE_PROJECT_ID configured.");
      return reply.status(500).send({
        statusCode: 500,
        error: "Internal Server Error",
        message: "Auth is not configured.",
      });
    }

    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Missing bearer token.",
      });
    }

    try {
      const token = header.slice("Bearer ".length);
      const { payload } = await jwtVerify(token, jwks, {
        issuer: `https://securetoken.google.com/${options.firebaseProjectId}`,
        audience: options.firebaseProjectId,
      });
      const id = payload.sub;
      if (!id) throw new Error("Token has no subject");
      request.user = {
        id,
        email: typeof payload.email === "string" ? payload.email : undefined,
      };
      request.ownerUserId = id;
    } catch (error) {
      request.log.debug({ err: error }, "JWT verification failed");
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Invalid or expired token.",
      });
    }
  });
};

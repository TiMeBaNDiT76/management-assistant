import type { FastifyPluginAsync } from "fastify";
import { apiVersion } from "../version";

export interface HealthPluginOptions {
  /**
   * Serves `GET /` API entrypoint metadata. Disabled when the API serves the
   * exported web app at `/` — the Expo `index.html` takes over the root route
   * instead (duplicate `GET /` routes would throw FST_ERR_DUPLICATED_ROUTE).
   */
  includeRootMetadata?: boolean;
}

export const healthPlugin: FastifyPluginAsync<HealthPluginOptions> = async (app, options) => {
  app.get(
    "/health",
    { schema: { tags: ["system"], summary: "Liveness & readiness probe" } },
    async () => ({ status: "ok", version: apiVersion }),
  );

  if (options.includeRootMetadata !== false) {
    app.get(
      "/",
      { schema: { tags: ["system"], summary: "API entrypoint metadata" } },
      async () => ({
        name: "management-assistant-api",
        version: apiVersion,
        rpc: "/trpc",
        docs: "/docs",
      }),
    );
  }
};

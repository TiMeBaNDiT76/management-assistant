import type { FastifyPluginAsync } from "fastify";
import { apiVersion } from "../version";

export const healthPlugin: FastifyPluginAsync = async (app) => {
  app.get(
    "/health",
    { schema: { tags: ["system"], summary: "Liveness & readiness probe" } },
    async () => ({ status: "ok", version: apiVersion }),
  );

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
};

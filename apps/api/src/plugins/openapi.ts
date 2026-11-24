import type { FastifyPluginAsync } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { apiVersion } from "../version";

/** Serves the OpenAPI document and Swagger UI at `/docs`. */
export const openApiPlugin: FastifyPluginAsync = async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Management Assistant API",
        description:
          "AI-assisted leadership & people management API. " +
          "The typed RPC surface is served via tRPC at `/trpc` " +
          "(procedures: `employee.*`, `conversation.*`, `actionItem.*`, `assistant.*`, " +
          "`masterData.*`).",
        version: apiVersion,
      },
      tags: [{ name: "system", description: "Health & metadata" }],
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list" },
  });
};

import "dotenv/config";
import { buildApp } from "./app";
import { loadConfig } from "./config";

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp(config);

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Management Assistant API listening on ${config.host}:${config.port}`);

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);
      void app.close().finally(() => process.exit(0));
    });
  }
}

main().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});

// Type-only export for workspace consumers (e.g. the Expo app's tRPC client).
export type { AppRouter } from "./trpc/app-router";

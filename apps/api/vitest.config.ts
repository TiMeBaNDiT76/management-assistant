import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Resolve the workspace package to its TypeScript source so tests run
      // against the code under test (no build step required).
      "@mgmt/shared": path.resolve(here, "../../packages/shared/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 20_000,
    env: {
      // Local-test identity used by the auth bypass (see auth-plugin.ts).
      DEV_BYPASS_AUTH: "true",
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
    },
  },
});

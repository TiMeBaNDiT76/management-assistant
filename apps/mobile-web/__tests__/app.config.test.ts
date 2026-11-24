/**
 * Tests for apps/mobile-web/app.config.ts.
 *
 * The static web export is served from a GCS bucket subpath in TEST/PROD
 * (bucket name = first path segment). `experiments.baseUrl` must therefore
 * be driven by EXPO_PUBLIC_BASE_URL at export time, while staying empty
 * (unprefixed asset paths) for local/dev builds.
 */

describe("app.config", () => {
  type AppConfig = {
    name: string;
    experiments: { typedRoutes: boolean; baseUrl: string };
  };

  const loadConfig = (): AppConfig => {
    let config: AppConfig | undefined;
    // Re-require the config module so it re-reads process.env at load time.
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS Expo config module; require() is the only way to re-evaluate it per test without --experimental-vm-modules
      config = require("../app.config") as AppConfig;
    });
    if (!config) {
      throw new Error("app.config did not load");
    }
    return config;
  };

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_BASE_URL;
    jest.resetModules();
  });

  it("prepends the bucket subpath to all asset URLs when EXPO_PUBLIC_BASE_URL is set", () => {
    process.env.EXPO_PUBLIC_BASE_URL = "/managerassistant-web-test";

    const config = loadConfig();

    expect(config.experiments.baseUrl).toBe("/managerassistant-web-test");
  });

  it("keeps asset paths unprefixed when EXPO_PUBLIC_BASE_URL is unset", () => {
    delete process.env.EXPO_PUBLIC_BASE_URL;

    const config = loadConfig();

    expect(config.experiments.baseUrl).toBe("");
  });

  it("treats an empty EXPO_PUBLIC_BASE_URL as unset", () => {
    process.env.EXPO_PUBLIC_BASE_URL = "";

    const config = loadConfig();

    expect(config.experiments.baseUrl).toBe("");
  });

  it("carries over the rest of the previous app.json contents verbatim", () => {
    process.env.EXPO_PUBLIC_BASE_URL = "/managerassistant-web-test";

    const config = loadConfig();

    expect(config.name).toBe("Management Assistant");
    expect(config.experiments.typedRoutes).toBe(false);
  });
});

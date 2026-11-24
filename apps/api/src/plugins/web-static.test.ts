import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "../testing/test-utils";
import { isApiPath, resolveWebDistPath } from "./web-static";

/** Distinct marker content so tests can prove WHICH file was served. */
const FIXTURE_INDEX = "<!doctype html><html><body>fixture-index-html</body></html>";
const FIXTURE_BUNDLE = 'console.log("fixture-bundle");';
const FIXTURE_FAVICON = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);

let distDir: string;

beforeAll(() => {
  // Mimics an Expo static export: index.html, content-hashed /_expo/ assets.
  distDir = mkdtempSync(path.join(tmpdir(), "web-dist-fixture-"));
  mkdirSync(path.join(distDir, "_expo", "static", "js", "web"), { recursive: true });
  writeFileSync(path.join(distDir, "index.html"), FIXTURE_INDEX);
  writeFileSync(path.join(distDir, "_expo", "static", "js", "web", "bundle-abc123.js"), FIXTURE_BUNDLE);
  writeFileSync(path.join(distDir, "favicon.ico"), FIXTURE_FAVICON);
});

afterAll(() => {
  rmSync(distDir, { recursive: true, force: true });
});

describe("web-static (WEB_DIST_PATH set)", () => {
  it("serves index.html at / with no-cache", async () => {
    const app = await createTestApp({ webDistPath: distDir });
    const response = await app.inject({ method: "GET", url: "/" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers["cache-control"]).toBe("no-cache");
    expect(response.body).toBe(FIXTURE_INDEX);
    await app.close();
  });

  it("falls back to index.html for SPA routes (/login)", async () => {
    const app = await createTestApp({ webDistPath: distDir });
    const response = await app.inject({ method: "GET", url: "/login" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers["cache-control"]).toBe("no-cache");
    expect(response.body).toBe(FIXTURE_INDEX);
    await app.close();
  });

  it("falls back to index.html for deep SPA routes (/people/:id)", async () => {
    const app = await createTestApp({ webDistPath: distDir });
    const response = await app.inject({
      method: "GET",
      url: "/people/00000000-0000-0000-0000-000000000000",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-cache");
    expect(response.body).toBe(FIXTURE_INDEX);
    await app.close();
  });

  it("answers HEAD document requests with the SPA fallback too", async () => {
    const app = await createTestApp({ webDistPath: distDir });
    const response = await app.inject({ method: "HEAD", url: "/login" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers["cache-control"]).toBe("no-cache");
    await app.close();
  });

  it("serves content-hashed /_expo/ assets with an immutable cache header", async () => {
    const app = await createTestApp({ webDistPath: distDir });
    const response = await app.inject({
      method: "GET",
      url: "/_expo/static/js/web/bundle-abc123.js",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("javascript");
    expect(response.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(response.body).toBe(FIXTURE_BUNDLE);
    await app.close();
  });

  it("serves other static files (favicon.ico) without the immutable header", async () => {
    const app = await createTestApp({ webDistPath: distDir });
    const response = await app.inject({ method: "GET", url: "/favicon.ico" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-cache");
    expect(response.body).toEqual(FIXTURE_FAVICON.toString("binary"));
    await app.close();
  });

  it("keeps /health as JSON (never HTML)", async () => {
    const app = await createTestApp({ webDistPath: distDir });
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.json()).toMatchObject({ status: "ok" });
    expect(response.body).not.toContain("fixture-index-html");
    await app.close();
  });

  it("keeps tRPC error responses as JSON (no HTML fallback)", async () => {
    const app = await createTestApp({ webDistPath: distDir });
    const response = await app.inject({ method: "GET", url: "/trpc/does.notExist" });

    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).not.toContain("fixture-index-html");
    await app.close();
  });

  it("keeps POST to unknown paths on a JSON 404 (no HTML fallback)", async () => {
    const app = await createTestApp({ webDistPath: distDir });
    const response = await app.inject({ method: "POST", url: "/unbekannt", payload: {} });

    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.json()).toMatchObject({ statusCode: 404 });
    expect(response.body).not.toContain("fixture-index-html");
    await app.close();
  });
});

describe("web-static (disabled)", () => {
  it("behaves as before without WEB_DIST_PATH: JSON root metadata, JSON 404", async () => {
    const app = await createTestApp();

    const root = await app.inject({ method: "GET", url: "/" });
    expect(root.statusCode).toBe(200);
    expect(root.headers["content-type"]).toContain("application/json");
    expect(root.json()).toMatchObject({ name: "management-assistant-api" });

    const login = await app.inject({ method: "GET", url: "/login" });
    expect(login.statusCode).toBe(404);
    expect(login.headers["content-type"]).toContain("application/json");

    await app.close();
  });

  it("behaves as before when WEB_DIST_PATH points at a missing directory", async () => {
    const app = await createTestApp({ webDistPath: path.join(tmpdir(), "web-dist-does-not-exist") });

    const root = await app.inject({ method: "GET", url: "/" });
    expect(root.statusCode).toBe(200);
    expect(root.headers["content-type"]).toContain("application/json");

    const login = await app.inject({ method: "GET", url: "/login" });
    expect(login.statusCode).toBe(404);
    expect(login.headers["content-type"]).toContain("application/json");

    await app.close();
  });
});

describe("web-static helpers", () => {
  it("resolveWebDistPath returns undefined for unset / missing / non-directory paths", () => {
    expect(resolveWebDistPath(undefined)).toBeUndefined();
    expect(resolveWebDistPath("")).toBeUndefined();
    expect(resolveWebDistPath(path.join(tmpdir(), "web-dist-does-not-exist"))).toBeUndefined();
  });

  it("resolveWebDistPath normalizes relative paths to absolute ones", () => {
    const resolved = resolveWebDistPath("src");
    expect(resolved).toBe(path.resolve("src"));
  });

  it("isApiPath guards the API surface only", () => {
    expect(isApiPath("/health")).toBe(true);
    expect(isApiPath("/docs")).toBe(true);
    expect(isApiPath("/docs/json")).toBe(true);
    expect(isApiPath("/trpc")).toBe(true);
    expect(isApiPath("/trpc/employees.list")).toBe(true);
    expect(isApiPath("/login")).toBe(false);
    expect(isApiPath("/people/00000000-0000-0000-0000-000000000000")).toBe(false);
    expect(isApiPath("/trpcish")).toBe(false);
  });
});

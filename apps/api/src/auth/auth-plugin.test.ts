import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEV_USER_ID } from "./auth-plugin";
import { createTestApp, createTestClient } from "../testing/test-utils";

describe("auth plugin", () => {
  it("provides the dev identity when DEV_BYPASS_AUTH is enabled", async () => {
    const app = await createTestApp(); // vitest env sets DEV_BYPASS_AUTH=true
    const client = createTestClient(app);
    // Requests pass through the auth gate instead of "Authentication required."
    await expect(client.employees.list.query({})).resolves.toEqual([]);
    await app.close();
  });

  it("exposes /health and /docs without authentication", async () => {
    const app = await createTestApp({ devBypassAuth: false, firebaseProjectId: "test-project" });

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: "ok" });

    const docs = await app.inject({ method: "GET", url: "/docs" });
    expect(docs.statusCode).toBe(200);

    const openApiJson = await app.inject({ method: "GET", url: "/docs/json" });
    expect(openApiJson.statusCode).toBe(200);
    expect(openApiJson.json()).toMatchObject({ info: { title: "Management Assistant API" } });

    await app.close();
  });

  it("rejects tRPC requests with 401 when auth is enforced and no token is present", async () => {
    const app = await createTestApp({ devBypassAuth: false, firebaseProjectId: "test-project" });
    const response = await app.inject({ method: "GET", url: "/trpc/employees.list" });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("rejects invalid bearer tokens with 401 when auth is enforced", async () => {
    const app = await createTestApp({ devBypassAuth: false, firebaseProjectId: "test-project" });
    const response = await app.inject({
      method: "GET",
      url: "/trpc/employees.list",
      headers: { authorization: "Bearer invalid.token.value" },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("treats SPA/static paths as public when the web app is served", async () => {
    // Simulates the API serving the exported web app (webDistPath staged):
    // browser navigations carry no bearer token, but /trpc stays protected.
    const webDist = mkdtempSync(path.join(tmpdir(), "auth-web-dist-"));
    writeFileSync(path.join(webDist, "index.html"), "<!doctype html><html><body>spa</body></html>");
    try {
      const app = await createTestApp({
        devBypassAuth: false,
        firebaseProjectId: "test-project",
        webDistPath: webDist,
      });

      const login = await app.inject({ method: "GET", url: "/login" });
      expect(login.statusCode).not.toBe(401);

      const trpc = await app.inject({ method: "GET", url: "/trpc/employees.list" });
      expect(trpc.statusCode).toBe(401);

      await app.close();
    } finally {
      rmSync(webDist, { recursive: true, force: true });
    }
  });

  it("documents the fixed dev tenant id", () => {
    expect(DEV_USER_ID).toBe("dev-local-user");
  });
});

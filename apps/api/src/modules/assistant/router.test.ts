import { afterAll, describe, expect, it, vi } from "vitest";
import { createTestApp, createTestClient } from "../../testing/test-utils";

const genaiMocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  embedContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({ models: genaiMocks })),
}));

describe("assistant router (tRPC over HTTP)", () => {
  const appPromise = createTestApp();
  afterAll(async () => {
    const app = await appPromise;
    await app.close();
  });

  it("serves a prep briefing for an existing employee", async () => {
    genaiMocks.generateContent.mockResolvedValue({ text: "HTTP mock briefing" });

    const app = await appPromise;
    const client = createTestClient(app);
    const employee = await client.employees.create.mutate({
      firstName: "Ada",
      lastName: "Lovelace",
    });

    const result = await client.assistant.briefing.query({ employeeId: employee.id });
    expect(result.briefing).toBe("HTTP mock briefing");
    expect(result.employeeId).toBe(employee.id);
  });

  it("fails the briefing for unknown employees with NOT_FOUND", async () => {
    const app = await appPromise;
    const client = createTestClient(app);
    await expect(
      client.assistant.briefing.query({
        employeeId: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrowError(/not found/i);
  });
});

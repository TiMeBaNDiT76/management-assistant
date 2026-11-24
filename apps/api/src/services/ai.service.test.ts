import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIService, buildBriefingPrompt } from "./ai.service";

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  embedContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({ models: mocks })),
}));

const service = new AIService({ apiKey: "test-key" });

beforeEach(() => {
  mocks.generateContent.mockReset();
  mocks.embedContent.mockReset();
  mocks.generateContent.mockResolvedValue({ text: "Mock-Briefing" });
  mocks.embedContent.mockResolvedValue({ embeddings: [{ values: [0.1, 0.2, 0.3] }] });
});

describe("buildBriefingPrompt", () => {
  it("includes employee context, conversations and action items", () => {
    const prompt = buildBriefingPrompt({
      employee: {
        firstName: "Ada",
        lastName: "Lovelace",
        role: "Engineer",
        department: null,
        location: "Berlin",
        notes: "Wants to grow into tech lead",
      },
      conversations: [
        { scheduledAt: "2026-01-15T09:00:00Z", type: "one_on_one", mood: 4, summary: "Good sprint" },
      ],
      openActionItems: [{ title: "Prepare feedback", dueDate: "2026-02-01", status: "open" }],
    });
    expect(prompt).toContain("Ada Lovelace");
    expect(prompt).toContain("Wants to grow into tech lead");
    expect(prompt).toContain("Good sprint");
    expect(prompt).toContain("Prepare feedback");
    expect(prompt).toContain("1. Current situation");
  });

  it("renders placeholders when data is missing", () => {
    const prompt = buildBriefingPrompt({
      employee: { firstName: "Ada", lastName: "Lovelace" },
      conversations: [],
      openActionItems: [],
    });
    expect(prompt).toContain("no past conversations recorded");
    expect(prompt).toContain("(none)");
  });
});

describe("AIService", () => {
  it("detects configured credentials", () => {
    expect(AIService.isConfigured({ apiKey: "k" })).toBe(true);
    expect(AIService.isConfigured({ project: "p" })).toBe(true);
    expect(AIService.isConfigured({})).toBe(false);
  });

  it("generates a briefing via the chat model", async () => {
    const briefing = await service.generateBriefing({
      employee: { firstName: "Ada", lastName: "Lovelace" },
      conversations: [],
      openActionItems: [],
    });
    expect(briefing).toBe("Mock-Briefing");
    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
    expect(mocks.generateContent.mock.calls[0]?.[0]).toMatchObject({
      contents: expect.stringContaining("Ada Lovelace"),
    });
  });

  it("summarizes notes via the chat model", async () => {
    const summary = await service.summarize("Long meeting notes");
    expect(summary).toBe("Mock-Briefing");
  });

  it("embeds text with text-embedding-004", async () => {
    const vector = await service.embed("team conflict");
    expect(vector).toEqual([0.1, 0.2, 0.3]);
    expect(mocks.embedContent.mock.calls[0]?.[0]).toMatchObject({
      model: "text-embedding-004",
      contents: "team conflict",
    });
  });

  it("throws when the embedding response is empty", async () => {
    mocks.embedContent.mockResolvedValue({ embeddings: [] });
    await expect(service.embed("x")).rejects.toThrow(/no vector/i);
  });
});

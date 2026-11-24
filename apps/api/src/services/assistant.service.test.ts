import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppDatabaseHandle } from "@mgmt/shared";
import { initializeDatabase } from "@mgmt/shared";
import { ActionItemRepository } from "../modules/action-items/repository";
import { ConversationRepository } from "../modules/conversations/repository";
import { EmployeeRepository } from "../modules/employees/repository";
import { createServices } from "./container";

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
  embedContent: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({ models: mocks })),
}));

const OWNER = "owner-a";
const QUERY_VECTOR = Array.from({ length: 768 }, (_, index) =>
  index === 0 ? 0.9 : 0,
);

const handle: AppDatabaseHandle = initializeDatabase();
const employeeRepo = new EmployeeRepository(handle.db);
const conversationRepo = new ConversationRepository(handle.db);

beforeEach(() => {
  mocks.generateContent.mockReset();
  mocks.embedContent.mockReset();
  mocks.generateContent.mockResolvedValue({ text: "Mock briefing" });
  mocks.embedContent.mockResolvedValue({ embeddings: [{ values: QUERY_VECTOR }] });
});

async function seedEmployeeWithHistory(): Promise<string> {
  const employee = await employeeRepo.create({
    id: crypto.randomUUID(),
    ownerUserId: OWNER,
    firstName: "Ada",
    lastName: "Lovelace",
    role: "Engineer",
  });
  await conversationRepo.create({
    id: crypto.randomUUID(),
    ownerUserId: OWNER,
    employeeId: employee.id,
    scheduledAt: "2026-02-02T09:00:00Z",
    summary: "Discussed growth path",
  });
  await new ActionItemRepository(handle.db).create({
    id: crypto.randomUUID(),
    ownerUserId: OWNER,
    title: "Prepare feedback talk",
    employeeId: employee.id,
  });
  return employee.id;
}

const services = createServices(handle, {
  port: 0,
  host: "127.0.0.1",
  dbPath: ":memory:",
  logLevel: "silent",
  devBypassAuth: true,
  allowedOrigins: [],
  ai: { apiKey: "test-key" },
});

describe("AssistantService", () => {
  it("creates a 1:1 prep briefing from employee history", async () => {
    const employeeId = await seedEmployeeWithHistory();
    const result = await services.assistant.briefing(OWNER, employeeId);
    expect(result.briefing).toBe("Mock briefing");
    expect(result.employeeId).toBe(employeeId);
    expect(result.generatedAt).toBeTypeOf("string");
    expect(mocks.generateContent).toHaveBeenCalledTimes(1);
  });

  it("throws NOT_FOUND for unknown employees", async () => {
    await expect(services.assistant.briefing(OWNER, "missing")).rejects.toThrow(/not found/i);
  });
});

describe.skipIf(!handle.vectorAvailable)("AssistantService with sqlite-vec", () => {
  it("indexes a conversation and finds it via semantic search", async () => {
    const employee = await employeeRepo.create({
      id: crypto.randomUUID(),
      ownerUserId: OWNER,
      firstName: "Ada",
      lastName: "Lovelace",
    });
    const conversation = await conversationRepo.create({
      id: crypto.randomUUID(),
      ownerUserId: OWNER,
      employeeId: employee.id,
      scheduledAt: "2026-03-03T09:00:00Z",
      notes: "Team conflict resolution",
    });

    const indexed = await services.assistant.indexConversation(OWNER, conversation.id);
    expect(indexed.indexed).toBe(true);

    const hits = await services.assistant.search(OWNER, { query: "conflict" });
    expect(hits[0]?.id).toBe(conversation.id);
    expect(hits[0]?.ownerUserId).toBe(OWNER);
  });

  it("keeps search tenant-scoped", async () => {
    const hits = await services.assistant.search("owner-b", { query: "conflict" });
    expect(hits).toHaveLength(0);
  });

  it("skips indexing when the conversation has no text", async () => {
    const employee = await employeeRepo.create({
      id: crypto.randomUUID(),
      ownerUserId: OWNER,
      firstName: "Ada",
      lastName: "Lovelace",
    });
    const conversation = await conversationRepo.create({
      id: crypto.randomUUID(),
      ownerUserId: OWNER,
      employeeId: employee.id,
      scheduledAt: "2026-03-04T09:00:00Z",
    });
    const indexed = await services.assistant.indexConversation(OWNER, conversation.id);
    expect(indexed.indexed).toBe(false);
  });
});

describe.skipIf(handle.vectorAvailable)("AssistantService without sqlite-vec", () => {
  it("returns 412 when the vector store is unavailable", async () => {
    await expect(services.assistant.indexConversation(OWNER, "any")).rejects.toThrow(
      /Vector search is not available/i,
    );
    await expect(services.assistant.search(OWNER, { query: "x" })).rejects.toThrow(
      /Vector search is not available/i,
    );
  });
});

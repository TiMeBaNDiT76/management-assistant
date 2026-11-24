import { GoogleGenAI } from "@google/genai";
import type { AIConfig } from "../config";

export const CHAT_MODEL = "gemini-2.5-flash";
export const EMBEDDING_MODEL = "text-embedding-004";

/** Loose employee shape for briefings (rows satisfy this structurally). */
export interface BriefingEmployee {
  firstName: string;
  lastName: string;
  role?: string | null;
  department?: string | null;
  location?: string | null;
  notes?: string | null;
}

export interface BriefingConversation {
  scheduledAt: string;
  type?: string | null;
  mood?: number | null;
  summary?: string | null;
  notes?: string | null;
}

export interface BriefingActionItem {
  title: string;
  dueDate?: string | null;
  status?: string | null;
}

export interface BriefingInput {
  employee: BriefingEmployee;
  conversations: BriefingConversation[];
  openActionItems: BriefingActionItem[];
}

/** Pure prompt builder — deterministic and unit-testable without mocks. */
export function buildBriefingPrompt(input: BriefingInput): string {
  const { employee, conversations, openActionItems } = input;
  const conversationLines =
    conversations.length > 0
      ? conversations
          .map(
            (conversation) =>
              `- ${conversation.scheduledAt} (${conversation.type}, mood ${conversation.mood ?? "n/a"}): ${
                conversation.summary ?? conversation.notes ?? "(no notes)"
              }`,
          )
          .join("\n")
      : "- (no past conversations recorded)";
  const actionItemLines =
    openActionItems.length > 0
      ? openActionItems
          .map((item) => `- ${item.title} (status: ${item.status}, due: ${item.dueDate ?? "n/a"})`)
          .join("\n")
      : "- (none)";

  return [
    "You are a management co-pilot preparing a 1:1 conversation for a manager.",
    "Write a concise, structured briefing (max 300 words) with the sections:",
    "1. Current situation, 2. Topics worth discussing, 3. Open commitments, 4. Suggested questions.",
    "Be factual, empathetic and concrete. Do not invent facts.",
    "",
    `Employee: ${employee.firstName} ${employee.lastName}` +
      (employee.role ? `, role: ${employee.role}` : "") +
      (employee.department ? `, department: ${employee.department}` : "") +
      (employee.location ? `, location: ${employee.location}` : ""),
    employee.notes ? `Employee notes: ${employee.notes}` : "",
    "",
    "Past conversations (most recent first):",
    conversationLines,
    "",
    "Open action items:",
    actionItemLines,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/**
 * Thin wrapper around `@google/genai` supporting both the Gemini Developer API
 * (API key) and Vertex AI (Application Default Credentials + project).
 */
export class AIService {
  private readonly client: GoogleGenAI;

  constructor(config: AIConfig) {
    this.client =
      config.apiKey && config.apiKey.length > 0
        ? new GoogleGenAI({ apiKey: config.apiKey })
        : new GoogleGenAI({
            vertexai: true,
            project: config.project,
            location: config.location ?? "us-central1",
          });
  }

  static isConfigured(config: AIConfig): boolean {
    return Boolean(config.apiKey || config.project);
  }

  /** Generates the 1:1 preparation briefing. */
  async generateBriefing(input: BriefingInput): Promise<string> {
    const response = await this.client.models.generateContent({
      model: CHAT_MODEL,
      contents: buildBriefingPrompt(input),
    });
    return response.text ?? "";
  }

  /** Summarizes a conversation transcript or notes blob. */
  async summarize(text: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: CHAT_MODEL,
      contents: `Summarize the following management conversation notes in 3-5 bullet points:\n\n${text}`,
    });
    return response.text ?? "";
  }

  /** Embeds text for semantic search (`text-embedding-004`). */
  async embed(text: string): Promise<number[]> {
    const response = await this.client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });
    const values = response.embeddings?.[0]?.values;
    if (!values || values.length === 0) {
      throw new Error("Embedding response contained no vector");
    }
    return values;
  }
}

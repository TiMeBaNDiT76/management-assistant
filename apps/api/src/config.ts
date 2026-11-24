/**
 * Application configuration. Reads from environment variables only —
 * never hardcode project IDs, bucket names, or API keys (public repository).
 */

export interface AIConfig {
  /** Gemini Developer API key (mutually exclusive with Vertex AI settings). */
  apiKey?: string;
  /** GCP project for Vertex AI with Application Default Credentials. */
  project?: string;
  location?: string;
}

export interface AppConfig {
  port: number;
  host: string;
  dbPath: string;
  logLevel: string;
  /**
   * Bypasses Firebase JWT verification for local development and tests.
   * Ignored (with a loud warning) when NODE_ENV === 'production'.
   */
  devBypassAuth: boolean;
  firebaseProjectId?: string;
  allowedOrigins: string[];
  ai: AIConfig;
}

function parseBoolean(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  const wantsDevBypass = parseBoolean(env.DEV_BYPASS_AUTH);
  const devBypassAuth = wantsDevBypass && nodeEnv !== "production";
  if (wantsDevBypass && !devBypassAuth) {
    console.warn(
      "[config] DEV_BYPASS_AUTH=true is ignored because NODE_ENV=production — JWT verification stays active.",
    );
  }

  const ai: AIConfig = {
    apiKey: env.GEMINI_API_KEY || undefined,
    project: env.GOOGLE_CLOUD_PROJECT || undefined,
    location: env.GOOGLE_CLOUD_LOCATION || undefined,
  };
  if (!ai.apiKey && !ai.project) {
    console.warn(
      "[config] No AI credentials configured (GEMINI_API_KEY or GOOGLE_CLOUD_PROJECT) — assistant endpoints return 412 until configured.",
    );
  }

  const firebaseProjectId = env.FIREBASE_PROJECT_ID || undefined;
  if (!devBypassAuth && !firebaseProjectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID is required unless DEV_BYPASS_AUTH is enabled for local development.",
    );
  }

  return {
    port: Number(env.PORT ?? 4000),
    host: env.HOST ?? "0.0.0.0",
    dbPath: env.DB_PATH ?? "./data/dev.db",
    logLevel: env.LOG_LEVEL ?? (nodeEnv === "production" ? "info" : "debug"),
    devBypassAuth,
    firebaseProjectId,
    allowedOrigins: (env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin: string) => origin.trim())
      .filter((origin: string) => origin.length > 0),
    ai,
  };
}

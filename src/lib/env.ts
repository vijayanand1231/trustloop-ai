import fs from "fs";
import path from "path";

interface AppConfig {
  paypalClientId: string;
  paypalSecret: string;
  paypalBaseUrl: string;
  llmApiKey: string;
}

let cachedConfig: AppConfig | null = null;

export function getEnvConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const vars: Record<string, string> = {};

  // 1. Read .env.local directly from disk and sanitize all Windows CRLF (\r\n)
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed
            .slice(eqIdx + 1)
            .trim()
            .replace(/^["']|["']$/g, "")
            .replace(/[\r\n\t]/g, "")
            .trim();
          vars[key] = val;
        }
      }
    }
  } catch (err) {
    console.warn("[Env Loader] Could not read .env.local directly:", err);
  }

  // 2. Fall back to process.env with strict CRLF sanitization
  const clean = (val?: string) =>
    (val || "").replace(/^["']|["']$/g, "").replace(/[\r\n\t]/g, "").trim();

  const paypalClientId =
    vars.PAYPAL_CLIENT_ID || clean(process.env.PAYPAL_CLIENT_ID);
  const paypalSecret =
    vars.PAYPAL_CLIENT_SECRET || clean(process.env.PAYPAL_CLIENT_SECRET);
  const paypalBaseUrl = (
    vars.PAYPAL_API_BASE ||
    clean(process.env.PAYPAL_API_BASE) ||
    "https://api-m.sandbox.paypal.com"
  ).replace(/\/+$/, "");

  const llmApiKey =
    vars.LLM_API_KEY ||
    clean(process.env.LLM_API_KEY) ||
    vars.GEMINI_API_KEY ||
    clean(process.env.GEMINI_API_KEY) ||
    vars.GROQ_API_KEY ||
    clean(process.env.GROQ_API_KEY) ||
    vars.OPENAI_API_KEY ||
    clean(process.env.OPENAI_API_KEY);

  cachedConfig = {
    paypalClientId,
    paypalSecret,
    paypalBaseUrl,
    llmApiKey,
  };

  return cachedConfig;
}

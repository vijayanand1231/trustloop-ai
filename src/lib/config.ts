import fs from "fs";
import path from "path";

export interface Config {
  paypalClientId: string;
  paypalSecret: string;
  paypalClientSecret: string;
  paypalBaseUrl: string;
  paypalApiBase: string;
  llmApiKey: string;
  enableDevAuth: boolean;
}

export function getConfig(): Config {
  let clientId = (process.env.PAYPAL_CLIENT_ID || "").trim().replace(/^["']|["']$/g, "");
  let clientSecret = (process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET || "").trim().replace(/^["']|["']$/g, "");
  let apiBase = (process.env.PAYPAL_BASE_URL || process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com").trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
  let llmApiKey = (process.env.LLM_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  let enableDevAuth = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true";

  if (!clientId || !clientSecret || !llmApiKey) {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, "utf-8");
        for (const line of envContent.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
            if (key === "PAYPAL_CLIENT_ID" && !clientId) clientId = val;
            if ((key === "PAYPAL_CLIENT_SECRET" || key === "PAYPAL_SECRET") && !clientSecret) clientSecret = val;
            if ((key === "PAYPAL_API_BASE" || key === "PAYPAL_BASE_URL") && !process.env.PAYPAL_API_BASE && !process.env.PAYPAL_BASE_URL) apiBase = val.replace(/\/+$/, "");
            if (key === "LLM_API_KEY" && !llmApiKey) llmApiKey = val;
            if (key === "NEXT_PUBLIC_ENABLE_DEV_AUTH" && process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === undefined) {
              enableDevAuth = val === "true";
            }
          }
        }
      } catch {
        // Ignore fallback errors
      }
    }
  }

  return {
    paypalClientId: clientId,
    paypalSecret: clientSecret,
    paypalClientSecret: clientSecret,
    paypalBaseUrl: apiBase,
    paypalApiBase: apiBase,
    llmApiKey: llmApiKey,
    enableDevAuth: enableDevAuth,
  };
}

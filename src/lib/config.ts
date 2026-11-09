import fs from "fs";
import path from "path";

export interface AppConfig {
  paypalClientId: string;
  paypalSecret: string;
  paypalBaseUrl: string;
  llmApiKey: string;
}

export function getConfig(): AppConfig {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env.local not found at ${envPath}`);
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  const envVars: Record<string, string> = {};

  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      envVars[key] = val;
    }
  }

  const paypalClientId = envVars.PAYPAL_CLIENT_ID || "";
  const paypalSecret = envVars.PAYPAL_CLIENT_SECRET || "";
  const paypalBaseUrl = (envVars.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com").replace(/\/+$/, "");
  const llmApiKey = envVars.LLM_API_KEY || "";

  return {
    paypalClientId,
    paypalSecret,
    paypalBaseUrl,
    llmApiKey,
  };
}

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
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

const paypalClientId = envVars.PAYPAL_CLIENT_ID;
const paypalSecret = envVars.PAYPAL_CLIENT_SECRET;
const llmApiKey = envVars.LLM_API_KEY;

console.log("\n===========================================");
console.log(" 🔍 TRUSTLOOP CREDENTIAL INTEGRITY AUDIT");
console.log("===========================================\n");

// 1. PayPal Verification
console.log("1. Testing PayPal Sandbox Credentials via curl.exe...");
try {
  const curlRes = spawnSync(
    "curl.exe",
    [
      "-s",
      "-X", "POST",
      "https://api-m.sandbox.paypal.com/v1/oauth2/token",
      "-u", paypalClientId + ":" + paypalSecret,
      "-d", "grant_type=client_credentials",
    ],
    { encoding: "utf-8" }
  );

  const data = JSON.parse(curlRes.stdout || "{}");
  if (data.access_token) {
    console.log("   ✅ PayPal Sandbox: AUTHENTICATED SUCCESSFULLY");
    console.log("      App ID:", data.app_id);
    console.log("      Token Expiry:", data.expires_in + "s");
  } else {
    console.log("   ❌ PayPal Error:", data);
  }
} catch (err) {
  console.log("   ❌ PayPal Exec Error:", err.message);
}

// 2. Gemini Multi-Model Verification
console.log("\n2. Testing Gemini LLM Models...");
const candidateModels = [
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview"
];

for (const model of candidateModels) {
  try {
    const genUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(llmApiKey);
    const genRes = await fetch(genUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Respond in 3 words: System operational check" }] }],
      }),
    });

    const resText = await genRes.text();
    if (genRes.ok) {
      const json = JSON.parse(resText);
      const output = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      console.log(`   ✅ Gemini Model [${model}]: LIVE & WORKING`);
      console.log(`      Response: "${output}"`);
      break;
    } else {
      console.log(`   ⚠️ Gemini Model [${model}] returned HTTP ${genRes.status}:`, resText.slice(0, 100));
    }
  } catch (err) {
    console.log(`   ❌ Gemini [${model}] Network Error:`, err.message);
  }
}

console.log("\n===========================================\n");

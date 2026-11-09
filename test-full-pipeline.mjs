import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

// 1. Read and parse .env.local directly
const envPath = path.resolve(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("❌ .env.local not found!");
  process.exit(1);
}

const envVars = {};
for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx !== -1) {
    envVars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const clientId = envVars.PAYPAL_CLIENT_ID;
const clientSecret = envVars.PAYPAL_CLIENT_SECRET;
const baseUrl = (envVars.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com").replace(/\/+$/, "");
const geminiKey = envVars.LLM_API_KEY;

// Existing captured transaction ID to refund
const CAPTURE_TO_REFUND = "16P91805780812045";

console.log("\n========================================================");
console.log(" 🚀 TRUSTLOOP AI — FULL PIPELINE END-TO-END AUDIT");
console.log("========================================================\n");

// HELPER: Call Gemini
async function callGemini(prompt) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=" + encodeURIComponent(geminiKey);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt + "\n\nRespond strictly in valid JSON." }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
}

async function runAudit() {
  // --- TEST 1: GEMINI MILESTONE EXTRACTION ---
  console.log("▶ [1/5] Testing AI Milestone Decomposition...");
  try {
    const brief = "Custom IoT Sensor Network contract with 150totalbudget.Stage1:PrototypeandwaterproofIP67enclosure(50). Stage 2: Mass production calibration (50).Stage3:Finaldelivery(50).";
    const prompt = 'Deconstruct this contract into milestones. Return JSON with format: {"totalAmount": 150, "milestones": [{"id": "m-1", "title": "...", "amount": 50, "criteria": "..."}]}\nContract: ' + brief;
    const result = await callGemini(prompt);
    console.log("   ✅ Gemini Extracted " + (result.milestones?.length || 0) + " Milestones totaling $" + result.totalAmount);
    result.milestones?.forEach(m => console.log("      - " + m.title + " ($" + m.amount + ")"));
  } catch (err) {
    console.log("   ❌ Extraction failed:", err.message);
  }

  // --- TEST 2: GEMINI ARBITRATION (DISPUTE DOSSIER) ---
  console.log("\n▶ [2/5] Testing AI Quality Gate & Arbitration (Defect Detection)...");
  try {
    const defectNotes = "Package arrived severely crushed. IP67 seal breached and 12 sensors failed power-on test.";
    const prompt = 'You are the TrustLoop arbitration agent. Evaluate this delivery against criteria "IP67 waterproof and operational units". Delivery Notes: "' + defectNotes + '". If defective, return {"decision": "DISPUTE_DOSSIER", "confidence": 98, "rmaId": "RMA-843912", "reasoning": "..."}. Otherwise return {"decision": "CAPTURE_PAYMENT", "confidence": 95}';
    const evalResult = await callGemini(prompt);
    console.log("   ✅ Arbitration Decision: " + evalResult.decision);
    console.log("      Confidence: " + evalResult.confidence + "%");
    console.log("      RMA Generated: " + (evalResult.rmaId || "N/A"));
    console.log("      Reasoning: " + evalResult.reasoning?.slice(0, 80) + "...");
  } catch (err) {
    console.log("   ❌ Arbitration failed:", err.message);
  }

  // --- TEST 3: PAYPAL OAUTH AUTHENTICATION ---
  console.log("\n▶ [3/5] Testing PayPal Sandbox Authentication...");
  let accessToken = "";
  try {
    const curl = spawnSync(
      "curl.exe",
      ["-s", "-X", "POST", baseUrl + "/v1/oauth2/token", "-u", clientId + ":" + clientSecret, "-d", "grant_type=client_credentials"],
      { encoding: "utf-8" }
    );
    const authData = JSON.parse(curl.stdout || "{}");
    if (authData.access_token) {
      accessToken = authData.access_token;
      console.log("   ✅ PayPal Token Acquired (App ID: " + authData.app_id + ", Expires in: " + authData.expires_in + "s)");
    } else {
      console.log("   ❌ PayPal Auth Failed:", authData);
      return;
    }
  } catch (err) {
    console.log("   ❌ Auth error:", err.message);
    return;
  }

  // --- TEST 4: PAYPAL ESCROW ORDER CREATION ---
  console.log("\n▶ [4/5] Testing PayPal Pre-Authorized Escrow Order Creation...");
  try {
    const res = await fetch(baseUrl + "/v2/checkout/orders", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "AUTHORIZE",
        purchase_units: [{
          description: "TrustLoop AI Escrow Agreement",
          amount: { currency_code: "USD", value: "150.00" },
        }],
      }),
    });
    const orderData = await res.json();
    if (res.ok) {
      console.log("   ✅ Escrow Hold Order Created: " + orderData.id + " (Status: " + orderData.status + ")");
    } else {
      console.log("   ❌ Order Creation Failed:", orderData);
    }
  } catch (err) {
    console.log("   ❌ Order error:", err.message);
  }

  // --- TEST 5: PAYPAL CAPTURE REFUND (CLAWBACK) ---
  console.log("\n▶ [5/5] Testing PayPal Arbitration Refund / Clawback on Capture " + CAPTURE_TO_REFUND + "...");
  try {
    const refundUrl = baseUrl + "/v2/payments/captures/" + CAPTURE_TO_REFUND + "/refund";
    const refundRes = await fetch(refundUrl, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        note_to_payer: "TrustLoop AI Arbitration: RMA verified item return refund",
      }),
    });
    const refundData = await refundRes.json();
    if (refundRes.ok) {
      console.log("   ✅ Refund Processed Successfully!");
      console.log("      Refund ID: " + refundData.id);
      console.log("      Status: " + refundData.status);
      console.log("      Amount Returned: " + refundData.amount?.value + " " + refundData.amount?.currency_code);
    } else if (refundData.name === "CAPTURE_ALREADY_REFUNDED") {
      console.log("   ℹ️ Capture " + CAPTURE_TO_REFUND + " was already refunded previously.");
    } else {
      console.log("   ❌ Refund Rejected (HTTP " + refundRes.status + "):", refundData.message || refundData);
    }
  } catch (err) {
    console.log("   ❌ Refund error:", err.message);
  }

  console.log("\n========================================================");
  console.log(" 🎯 AUDIT COMPLETE");
  console.log("========================================================\n");
}

runAudit();

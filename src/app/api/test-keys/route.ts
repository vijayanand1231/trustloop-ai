import { NextResponse } from "next/server";
import { spawnSync } from "child_process";
import { getConfig } from "@/lib/config";

export async function GET() {
  const { paypalClientId, paypalSecret, llmApiKey, paypalBaseUrl } = getConfig();

  // 1. Test PayPal using clean string concatenation
  let paypalResult: any = {};
  try {
    const tokenUrl = paypalBaseUrl + "/v1/oauth2/token";
    const userPass = paypalClientId + ":" + paypalSecret;
    const curl = spawnSync(
      "curl.exe",
      [
        "-s",
        "-X", "POST",
        tokenUrl,
        "-u", userPass,
        "-d", "grant_type=client_credentials",
      ],
      { encoding: "utf-8" }
    );
    paypalResult = JSON.parse(curl.stdout || "{}");
  } catch (err: any) {
    paypalResult = { error: err.message };
  }

  // 2. Test Gemini
  let geminiResult: any = {};
  try {
    const genUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=" + encodeURIComponent(llmApiKey);
    const res = await fetch(genUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Respond in 3 words: System operational check" }] }],
      }),
    });
    const text = await res.text();
    geminiResult = {
      status: res.status,
      body: JSON.parse(text),
    };
  } catch (err: any) {
    geminiResult = { error: err.message };
  }

  return NextResponse.json({
    credentialsRead: {
      paypalClientId: paypalClientId.slice(0, 10) + "... (" + paypalClientId.length + " chars)",
      paypalSecret: paypalSecret.slice(0, 6) + "... (" + paypalSecret.length + " chars)",
      llmApiKey: llmApiKey.slice(0, 8) + "... (" + llmApiKey.length + " chars)",
    },
    paypal: {
      status: paypalResult.access_token ? "SUCCESS" : "FAILED",
      appId: paypalResult.app_id || null,
      error: paypalResult.error_description || paypalResult.error || null,
    },
    gemini: {
      status: geminiResult.status === 200 ? "SUCCESS" : "HTTP_" + geminiResult.status,
      response: geminiResult.body?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null,
      error: geminiResult.body?.error?.message || null,
    },
  });
}

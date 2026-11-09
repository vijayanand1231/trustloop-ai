import { getConfig } from "./config";

interface TokenCache { token: string; expiresAt: number; }
let cachedToken: TokenCache | null = null;
let inflightToken: Promise<string> | null = null;

export function getPayPalCredentials() {
  const cfg = getConfig();
  if (!cfg.paypalClientId || !cfg.paypalSecret) {
    throw new Error(
      "Missing PayPal credentials in .env.local. Ensure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are defined."
    );
  }
  return { clientId: cfg.paypalClientId, clientSecret: cfg.paypalSecret, baseUrl: cfg.paypalBaseUrl };
}

export async function getPayPalAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token;
  if (inflightToken) return inflightToken;

  const { clientId, clientSecret, baseUrl } = getPayPalCredentials();
  const tokenUrl = baseUrl + "/v1/oauth2/token";
  const auth = Buffer.from(clientId + ":" + clientSecret).toString("base64");

  inflightToken = (async () => {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + auth,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "TrustLoop/1.0",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
    const responseText = await res.text();
    if (!res.ok) {
      throw new Error(`PayPal OAuth failed (HTTP ${res.status}): ${responseText.slice(0, 200)}`);
    }
    const data = JSON.parse(responseText);
    if (!data.access_token) throw new Error("PayPal OAuth: no access_token in response");
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (Number(data.expires_in) || 32_000) * 1000,
    };
    return data.access_token as string;
  })();

  try { return await inflightToken; }
  finally { inflightToken = null; }
}

async function paypalFetch(
  method: "GET" | "POST",
  path: string,
  { body, idempotencyKey }: { body?: Record<string, any>; idempotencyKey?: string } = {}
) {
  const token = await getPayPalAccessToken();
  const { baseUrl } = getPayPalCredentials();
  const headers: Record<string, string> = {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
    "User-Agent": "TrustLoop/1.0",
    Accept: "application/json",
  };
  if (idempotencyKey) headers["PayPal-Request-Id"] = idempotencyKey;

  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (res.status === 204) return { _noContent: true };

  const text = await res.text();
  let data: any = {};
  if (text) { try { data = JSON.parse(text); } catch { data = { raw: text }; } }

  if (!res.ok) {
    const msg = data.message
      || data.details?.[0]?.description
      || data.error_description
      || `PayPal ${method} ${path} failed (HTTP ${res.status})`;
    const err = new Error(msg) as Error & { status?: number; details?: any };
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

export async function createEscrowOrder({
  amount, currency = "USD", description = "TrustLoop Escrow Agreement", idempotencyKey,
}: {
  amount: number | string; currency?: string; description?: string; idempotencyKey?: string;
}) {
  const formattedAmount = Number(amount).toFixed(2);
  return paypalFetch("POST", "/v2/checkout/orders", {
    body: {
      intent: "AUTHORIZE",
      purchase_units: [{
        description: description.slice(0, 127),
        amount: { currency_code: currency, value: formattedAmount },
      }],
    },
    idempotencyKey: idempotencyKey ?? `order:Date.now():{formattedAmount}`,
  });
}

export async function authorizeOrder(orderId: string) {
  const cleanId = String(orderId || "").trim();
  if (!cleanId) throw new Error("authorizeOrder: orderId required");
  const data = await paypalFetch("POST", `/v2/checkout/orders/${cleanId}/authorize`, {
    body: {},
    idempotencyKey: `authorize:${cleanId}`,
  });
  const authorizationId = data.purchase_units?.[0]?.payments?.authorizations?.[0]?.id;
  return { authorizationId, status: data.status, details: data };
}

export async function getAuthorizationDetails(authorizationId: string) {
  const id = String(authorizationId || "").trim();
  if (!id) throw new Error("getAuthorizationDetails: authorizationId required");
  return paypalFetch("GET", `/v2/payments/authorizations/${id}`);
}

export async function captureAuthorizedPayment({
  authorizationId, amount, currency = "USD",
  isFinalCapture = true,
  note = "TrustLoop Milestone Settlement",
  idempotencyKey,
}: {
  authorizationId: string; amount?: number | string; currency?: string;
  isFinalCapture?: boolean; note?: string; idempotencyKey?: string;
}) {
  const id = String(authorizationId || "").trim();
  if (!id) throw new Error("captureAuthorizedPayment: authorizationId required");

  const payload: Record<string, any> = {
    final_capture: Boolean(isFinalCapture),
    note_to_payer: note,
  };
  if (amount !== undefined) {
    payload.amount = { currency_code: currency, value: Number(amount).toFixed(2) };
  }

  const data = await paypalFetch("POST", `/v2/payments/authorizations/${id}/capture`, {
    body: payload,
    idempotencyKey: idempotencyKey ?? `capture:id:{payload.amount?.value ?? "full"}:${isFinalCapture}`,
  });

  const rawAmount =
    data.amount?.value ||
    data.seller_receivable_breakdown?.gross_amount?.value ||
    (amount !== undefined ? Number(amount).toFixed(2) : "0.00");
  const resCurrency =
    data.amount?.currency_code ||
    data.seller_receivable_breakdown?.gross_amount?.currency_code ||
    currency;

  return {
    status: data.status,
    transactionId: data.id,
    amount: `${rawAmount} ${resCurrency}`,
    rawAmount,
    currency: resCurrency,
    isFinalCapture: Boolean(isFinalCapture),
    capturedAt: data.create_time || data.update_time || new Date().toISOString(),
  };
}

export async function refundCapturedPayment({
  captureId, amount, currency = "USD",
  note = "TrustLoop AI Arbitration: RMA verified item return refund",
  idempotencyKey,
}: {
  captureId: string; amount?: number | string; currency?: string;
  note?: string; idempotencyKey?: string;
}) {
  const id = String(captureId || "").trim();
  if (!id) throw new Error("refundCapturedPayment: captureId required");

  const body: Record<string, any> = { note_to_payer: note };
  if (amount !== undefined) {
    body.amount = { value: Number(amount).toFixed(2), currency_code: currency };
  }

  const data = await paypalFetch("POST", `/v2/payments/captures/${id}/refund`, {
    body,
    idempotencyKey: idempotencyKey ?? `refund:id:{body.amount?.value ?? "full"}`,
  });

  return {
    status: data.status,
    refundId: data.id,
    amount: `${data.amount?.value || "0.00"} ${data.amount?.currency_code || currency}`,
    refundedAt: data.create_time || data.update_time || new Date().toISOString(),
  };
}

export async function voidAuthorization({
  authorizationId, idempotencyKey,
}: { authorizationId: string; idempotencyKey?: string }) {
  const id = String(authorizationId || "").trim();
  if (!id) throw new Error("voidAuthorization: authorizationId required");

  const data = await paypalFetch("POST", `/v2/payments/authorizations/${id}/void`, {
    idempotencyKey: idempotencyKey ?? `void:${id}`,
  });

  return {
    voided: true,
    authorizationId: id,
    status: (data && data.status) || "VOIDED",
    voidedAt: new Date().toISOString(),
  };
}

export async function getCaptureDetails(captureId: string) {
  const id = String(captureId || "").trim();
  if (!id) throw new Error("getCaptureDetails: captureId required");
  return paypalFetch("GET", `/v2/payments/captures/${id}`);
}

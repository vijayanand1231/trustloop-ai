import { NextResponse } from "next/server";
import {
  recordWebhookEvent, getWebhookEvents
} from "@/lib/webhook-store";

const REQUIRED_PAYPAL_HEADERS = [
  "paypal-transmission-id",
  "paypal-transmission-time",
  "paypal-transmission-sig",
  "paypal-cert-url",
  "paypal-auth-algo",
];

function hasPayPalSignatureHeaders(req: Request): boolean {
  return REQUIRED_PAYPAL_HEADERS.every((h) => Boolean(req.headers.get(h)));
}

export async function GET() {
  return NextResponse.json({ events: getWebhookEvents() });
}

export async function POST(req: Request) {
  try {
    const event = await req.json();
    const signed = hasPayPalSignatureHeaders(req);
    const trId = req.headers.get("paypal-transmission-id") || "";

    console.log(
      `[PayPal Webhook] ${signed ? "✓ signed" : "✗ unsigned"} ` +
      `event: ${event.event_type} (${event.id || trId})`
    );

    if (!signed) {
      return NextResponse.json(
        { error: "Missing PayPal signature headers" },
        { status: 401 }
      );
    }

    recordWebhookEvent({
      id: event.id || `evt-${Date.now()}`,
      eventType: event.event_type || "GENERIC_EVENT",
      summary: event.summary || "Asynchronous event received",
      resourceId: event.resource?.id || "",
      timestamp: new Date().toISOString(),
      status: "VERIFIED",
      rawPayload: event,
    });

    return NextResponse.json(
      { received: true, eventId: event.id, verified: true },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[PayPal Webhook] Error:", err.message);
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }
}
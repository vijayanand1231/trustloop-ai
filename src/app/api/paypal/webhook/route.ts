import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LEDGER_FILE = path.resolve(process.cwd(), "webhook-ledger.json");

function appendEventToLedger(event: any) {
  try {
    let ledger = [];
    if (fs.existsSync(LEDGER_FILE)) {
      ledger = JSON.parse(fs.readFileSync(LEDGER_FILE, "utf-8"));
    }
    ledger.unshift({
      id: event.id || `evt-${Date.now()}`,
      eventType: event.event_type || "GENERIC_EVENT",
      summary: event.summary || "Asynchronous event received",
      resourceType: event.resource_type || "payment",
      status: event.resource?.status || "RECEIVED",
      receivedAt: new Date().toISOString(),
    });
    // Keep last 25 events
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(ledger.slice(0, 25), null, 2), "utf-8");
  } catch (err: any) {
    console.error("[Webhook Ledger] Error persisting event:", err.message);
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(LEDGER_FILE)) {
      return NextResponse.json({ events: [] });
    }
    const data = JSON.parse(fs.readFileSync(LEDGER_FILE, "utf-8"));
    return NextResponse.json({ events: data });
  } catch (err: any) {
    return NextResponse.json({ events: [] });
  }
}

export async function POST(req: Request) {
  try {
    const event = await req.json();
    console.log(`[PayPal Webhook] Received Event: event.eventtype({event.id})`);

    appendEventToLedger(event);

    return NextResponse.json({ received: true, eventId: event.id }, { status: 200 });
  } catch (err: any) {
    console.error("[PayPal Webhook] Error processing event:", err.message);
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}

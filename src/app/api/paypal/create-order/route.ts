import { NextResponse } from "next/server";
import { createEscrowOrder } from "@/lib/paypal";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount ?? 150).toFixed(2);
    const currency = body.currency || "USD";
    const description = body.description || "TrustLoop Escrow Agreement";

    console.log("[API /create-order] Creating order:", { amount, currency });
    const order = await createEscrowOrder({ amount, currency, description });
    console.log("[API /create-order] Created Order ID:", order.id);

    return NextResponse.json({ id: order.id, orderId: order.id }, { status: 200 });
  } catch (error: any) {
    console.error("[API /create-order] Error:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to create escrow order" },
      { status: 500 }
    );
  }
}


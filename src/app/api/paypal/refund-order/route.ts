import { NextResponse } from "next/server";
import { refundCapturedPayment } from "@/lib/paypal";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const captureId = body.captureId || body.transactionId;
    const note = body.note || "Automated RMA Escrow Reversal by TrustLoop AI";

    if (!captureId) {
      return NextResponse.json(
        { error: "Missing required field: captureId" },
        { status: 400 }
      );
    }

    console.log("[API /refund-order] Refunding Capture ID:", captureId);
    const result = await refundCapturedPayment({ captureId, note });
    console.log("[API /refund-order] Refund Success:", result);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[API /refund-order] Exception:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to process refund" },
      { status: 500 }
    );
  }
}

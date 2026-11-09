import { NextResponse } from "next/server";
import { refundCapturedPayment } from "@/lib/paypal";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { captureId, note } = body;

    if (!captureId) {
      return NextResponse.json(
        { error: "Missing captureId in request body" },
        { status: 400 }
      );
    }

    console.log(`[API /refund-capture] Refunding capture: ${captureId}`);
    const result = await refundCapturedPayment({ captureId, note });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[API /refund-capture] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to process refund" },
      { status: 500 }
    );
  }
}

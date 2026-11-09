import { NextResponse } from "next/server";
import { captureAuthorizedPayment } from "@/lib/paypal";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const authorizationId = body.authorizationId || body.id;
    const amount = body.amount;
    const currency = body.currency || "USD";
    const isFinalCapture = body.isFinalCapture !== undefined ? body.isFinalCapture : true;
    const note = body.note || "TrustLoop Milestone Settlement";
    const milestoneId = body.milestoneId || "m-1";

    if (!authorizationId) {
      return NextResponse.json(
        { error: "Missing required field: authorizationId" },
        { status: 400 }
      );
    }

    console.log("[API /capture-order] Processing milestone capture:", {
      authorizationId,
      milestoneId,
      amount,
      isFinalCapture,
    });

    const result = await captureAuthorizedPayment({
      authorizationId,
      amount,
      currency,
      isFinalCapture,
      note,
    });

    return NextResponse.json({ ...result, milestoneId }, { status: 200 });
  } catch (error: any) {
    console.error("[API /capture-order] Exception:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to capture payment" },
      { status: 500 }
    );
  }
}

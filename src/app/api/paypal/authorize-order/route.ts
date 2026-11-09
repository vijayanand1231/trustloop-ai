import { NextResponse } from "next/server";
import { authorizeOrder } from "@/lib/paypal";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = body.orderId || body.orderID || body.id;

    if (!orderId) {
      return NextResponse.json(
        { error: "Missing required field: orderId" },
        { status: 400 }
      );
    }

    console.log("[API /authorize-order] Authorizing Order ID:", orderId);
    const result = await authorizeOrder(orderId);
    console.log("[API /authorize-order] Authorization Success ID:", result.authorizationId);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[API /authorize-order] Exception:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to authorize order" },
      { status: 500 }
    );
  }
}



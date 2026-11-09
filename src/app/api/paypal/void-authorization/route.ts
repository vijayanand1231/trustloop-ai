import { NextResponse } from "next/server";
import { voidAuthorization } from "@/lib/paypal";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { authorizationId } = body;

    if (!authorizationId) {
      return NextResponse.json(
        { error: "Missing authorizationId in request body" },
        { status: 400 }
      );
    }

    console.log(`[API /void-authorization] Voiding authorization: ${authorizationId}`);
    const result = await voidAuthorization({ authorizationId });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[API /void-authorization] Error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to void authorization" },
      { status: err.status || 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { evaluateDeliverableProof } from "@/lib/llm";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const proofUrl = (body.proofUrl || body.deliverableProof || "").trim();
    const notes = (body.deliveryNotes || body.notes || "").trim();
    const milestone = body.milestone || {};

    const result = await evaluateDeliverableProof({
      milestone,
      proofUrl,
      deliveryNotes: notes,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[API /evaluate-proof] Error:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to evaluate deliverable proof" },
      { status: 500 }
    );
  }
}

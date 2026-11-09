import { NextResponse } from "next/server";
import { parseContractMilestones } from "@/lib/llm";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const brief = (body.contractBrief || body.brief || body.prompt || "").trim();

    if (!brief) {
      return NextResponse.json(
        { error: "Contract brief cannot be empty." },
        { status: 400 }
      );
    }

    const result = await parseContractMilestones(brief);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[API /parse-milestones] Error:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to parse contract milestones" },
      { status: 500 }
    );
  }
}

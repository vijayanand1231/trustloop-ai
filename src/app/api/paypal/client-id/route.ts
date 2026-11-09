import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

export async function GET() {
  const { paypalClientId } = getConfig();
  return NextResponse.json({ clientId: paypalClientId });
}

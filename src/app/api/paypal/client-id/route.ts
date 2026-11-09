import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

export async function GET(req: Request) {
  const { paypalClientId } = getConfig();
  return NextResponse.json({ clientId: paypalClientId });
}

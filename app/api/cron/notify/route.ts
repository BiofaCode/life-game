import { NextResponse, type NextRequest } from "next/server";
import { eveningDigest } from "@/lib/digest";
import { pushConfigured, pushToAll } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Appelé par Vercel Cron (vercel.json). Protégé par CRON_SECRET (en-tête Authorization). */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!pushConfigured()) return NextResponse.json({ skipped: "VAPID non configuré" });
  try {
    const payload = await eveningDigest();
    const result = await pushToAll(payload);
    return NextResponse.json({ ...result, payload });
  } catch (e) {
    console.error("cron notify", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

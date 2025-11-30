import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { getSession } from "../../_utils/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const balance = await storage.getUserBalance(session.userId);
    return NextResponse.json({ balance });
  } catch (error) {
    console.error("[GET /api/wallet/balance] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}


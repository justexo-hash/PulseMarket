import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { getSession } from "../_utils/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const bets = await storage.getBetsByUser(session.userId);
    return NextResponse.json(bets);
  } catch (error) {
    console.error("[GET /api/bets] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bets" },
      { status: 500 }
    );
  }
}


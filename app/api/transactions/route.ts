import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { getSession } from "../_utils/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const transactions = await storage.getTransactionsByUser(session.userId);
    return NextResponse.json(transactions);
  } catch (error) {
    console.error("[GET /api/transactions] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}


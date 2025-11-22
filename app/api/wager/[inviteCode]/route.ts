import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { recalculateProbability } from "../../_utils/markets";
import { isValidInviteCode } from "@server/inviteCodes";
import { requireUser } from "../../_utils/auth";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { inviteCode: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { inviteCode } = params;

  if (!inviteCode || !isValidInviteCode(inviteCode)) {
    return NextResponse.json({ error: "Invalid invite code format" }, { status: 400 });
  }

  try {
    await requireUser();
    const market = await storage.getMarketByInviteCode(inviteCode);
    if (!market) {
      return NextResponse.json({ error: "Private wager not found" }, { status: 404 });
    }

    return NextResponse.json(recalculateProbability(market));
  } catch (error) {
    console.error("[GET /api/wager/:inviteCode] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch private wager" },
      { status: 500 }
    );
  }
}


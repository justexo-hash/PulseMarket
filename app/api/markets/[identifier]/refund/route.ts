import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import {
  generateCommitmentHash,
  generateSecret,
} from "@server/provablyFair";
import { publishEvent, publishToUser } from "@lib/realtime/server";
import { getSession } from "../../../_utils/session";

interface RouteParams {
  params: { identifier: string };
}

export async function POST(_request: Request, { params }: RouteParams) {
  const session = getSession();
  const sessionUserId = session?.userId;
  if (!sessionUserId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await storage.getUserById(sessionUserId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const marketId = Number(params.identifier);
  if (Number.isNaN(marketId)) {
    return NextResponse.json({ error: "Invalid market ID" }, { status: 400 });
  }

  try {
    const market = await storage.getMarketById(marketId);
    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    if (market.status === "resolved") {
      return NextResponse.json(
        { error: "Cannot refund a resolved market" },
        { status: 400 }
      );
    }

    if (market.isPrivate === 1) {
      if (market.createdBy !== sessionUserId) {
        return NextResponse.json(
          {
            error: "Only the creator of this private wager can refund it",
          },
          { status: 403 }
        );
      }
    } else if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Only admins can refund public markets" },
        { status: 403 }
      );
    }

    const allBets = await storage.getBetsByMarket(marketId);
    await storage.refundMarketBets(marketId);

    const secret = generateSecret();
    const commitmentHash = generateCommitmentHash("refunded", secret, marketId);
    await storage.updateMarketCommitment(
      marketId,
      commitmentHash,
      secret,
      "refunded"
    );

    await publishEvent({ type: "market:updated", data: { id: marketId } });
    const userIds = allBets
      .map((b) => b.userId)
      .filter(
        (id, index, arr): id is number =>
          id !== undefined && arr.indexOf(id) === index
      );
    await Promise.all(
      userIds.map((id) =>
        publishToUser(id, { type: "balance:updated", data: { userId: id } })
      )
    );

    return NextResponse.json({
      message:
        "Market bets refunded successfully. Funds have been returned to portfolio balances.",
    });
  } catch (error: any) {
    console.error("[Refund] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to refund market bets" },
      { status: 500 }
    );
  }
}


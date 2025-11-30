import { NextRequest, NextResponse } from "next/server";
import { storage } from "@server/storage";
import { resolveMarketSchema } from "@shared/schema";
import {
  generateCommitmentHash,
  generateSecret,
  verifyCommitmentHash,
} from "@server/provablyFair";
import { publishEvent, publishToUser } from "@lib/realtime/server";
import { getSession } from "../../../_utils/session";

interface RouteParams {
  params: { identifier: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
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

  const body = await request.json();
  const parsed = resolveMarketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors },
      { status: 400 }
    );
  }

  const outcome = parsed.data.outcome;

  try {
    const market = await storage.getMarketById(marketId);
    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    if (market.isPrivate === 1) {
      if (market.createdBy !== sessionUserId) {
        return NextResponse.json(
          {
            error: "Only the creator of this private wager can resolve it",
          },
          { status: 403 }
        );
      }
    } else if (!user.isAdmin) {
      return NextResponse.json(
        { error: "Only admins can resolve public markets" },
        { status: 403 }
      );
    }

    const allBets = await storage.getBetsByMarket(marketId);
    await storage.calculateAndDistributePayouts(marketId, outcome);

    const secret = generateSecret();
    const commitmentHash = generateCommitmentHash(outcome, secret, marketId);
    const isValid = verifyCommitmentHash(
      commitmentHash,
      outcome,
      secret,
      marketId
    );
    if (!isValid) {
      console.error("[Resolve] Generated invalid commitment hash");
    }

    const resolvedMarket = await storage.resolveMarket(
      marketId,
      outcome,
      commitmentHash,
      secret
    );

    if (!resolvedMarket) {
      return NextResponse.json(
        { error: "Market not found" },
        { status: 404 }
      );
    }

    await publishEvent({ type: "market:resolved", data: { id: marketId } });
    await publishEvent({ type: "market:updated", data: { id: marketId } });

    const winnerBets = allBets.filter((bet) => bet.position === outcome);
    const winnerUserIds = winnerBets
      .map((bet) => bet.userId)
      .filter(
        (id, index, arr): id is number =>
          id !== undefined && arr.indexOf(id) === index
      );
    await Promise.all(
      winnerUserIds.map((id) =>
        publishToUser(id, { type: "balance:updated", data: { userId: id } })
      )
    );

    return NextResponse.json({
      market: resolvedMarket,
      provablyFair: {
        commitmentHash,
        secret,
        verified: isValid,
      },
    });
  } catch (error: any) {
    console.error("[Resolve] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to resolve market" },
      { status: 500 }
    );
  }
}


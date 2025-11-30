import { NextRequest, NextResponse } from "next/server";
import { betSchema } from "@shared/schema";
import { storage } from "@server/storage";
import { isValidInviteCode } from "@server/inviteCodes";
import { getSession } from "../../../_utils/session";
import { publishEvent, publishToUser } from "@lib/realtime/server";

interface RouteParams {
  params: { identifier: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  const userId = session?.userId;
  const sessionWalletAddress = session?.walletAddress;

  const body = await request.json();

  if (!userId || !sessionWalletAddress) {
    return NextResponse.json(
      { error: "Not authenticated. Please connect wallet." },
      { status: 401 }
    );
  }

  if (
    body.walletAddress &&
    body.walletAddress.trim() !== sessionWalletAddress
  ) {
    return NextResponse.json(
      { error: "Wallet mismatch. Please reconnect your wallet." },
      { status: 403 }
    );
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

    if (market.isPrivate === 1) {
      const inviteCode = body.inviteCode;
      if (!inviteCode || !isValidInviteCode(inviteCode)) {
        return NextResponse.json(
          { error: "Valid invite code is required for private wagers" },
          { status: 400 }
        );
      }
      if (market.inviteCode !== inviteCode) {
        return NextResponse.json(
          { error: "Invalid invite code" },
          { status: 403 }
        );
      }
    }

    const { inviteCode: _inviteCode, walletAddress: _walletAddress, ...betBody } =
      body ?? {};

    const betData = {
      ...betBody,
      amount:
        typeof betBody?.amount === "string"
          ? betBody.amount
          : String(betBody?.amount ?? ""),
      marketId,
    };

    const parsed = betSchema.safeParse(betData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors },
        { status: 400 }
      );
    }

    const bet = await storage.createBet(
      userId,
      marketId,
      parsed.data.position,
      parsed.data.amount
    );

    await publishEvent({ type: "bet:placed", data: { marketId } });
    await publishEvent({ type: "market:updated", data: { id: marketId } });
    await publishToUser(userId, {
      type: "balance:updated",
      data: { userId },
    });

    return NextResponse.json({ bet, market }, { status: 201 });
  } catch (error: any) {
    console.error("[Bet] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to place bet" },
      { status: 400 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { betSchema } from "@shared/schema";
import { storage } from "@server/storage";
import { isValidInviteCode } from "@server/inviteCodes";
import { getSession, setSession } from "../../../_utils/session";
import { publishEvent, publishToUser } from "@lib/realtime/server";

interface RouteParams {
  params: { identifier: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = getSession();
  let userId = session?.userId;
  let sessionWalletAddress = session?.walletAddress;

  const body = await request.json();
  const providedWalletAddress =
    typeof body.walletAddress === "string" ? body.walletAddress : undefined;

  if (!userId && providedWalletAddress) {
    const walletAddress = providedWalletAddress.trim();
    if (walletAddress.length > 0) {
      const existingUser = await storage.getUserByWalletAddress(walletAddress);
      if (existingUser) {
        userId = existingUser.id;
        sessionWalletAddress = existingUser.walletAddress;
        setSession({
          userId: existingUser.id,
          walletAddress: existingUser.walletAddress,
        });
      } else {
        const randomPassword = crypto.randomBytes(32).toString("hex");
        const newUser = await storage.createUser({
          walletAddress,
          password: randomPassword,
        });
        userId = newUser.id;
        sessionWalletAddress = newUser.walletAddress;
        setSession({
          userId: newUser.id,
          walletAddress: newUser.walletAddress,
        });
      }
    }
  }

  if (!userId) {
    return NextResponse.json(
      { error: "Not authenticated. Please connect wallet." },
      { status: 401 }
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


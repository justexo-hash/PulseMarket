import { NextRequest, NextResponse } from "next/server";
import { storage } from "@server/storage";
import {
  getTreasuryKeypair,
  sendPayout,
  calculateRequiredReserve,
} from "@server/payouts";
import { publishToUser } from "@lib/realtime/server";
import { getSession } from "../../_utils/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const session = await getSession();
  const userId = session?.userId;
  const walletAddress = session?.walletAddress;

  if (
    body.walletAddress &&
    walletAddress &&
    body.walletAddress.trim() !== walletAddress
  ) {
    return NextResponse.json(
      { error: "Wallet mismatch. Please reconnect your wallet." },
      { status: 403 }
    );
  }

  if (!userId || !walletAddress) {
    return NextResponse.json(
      { error: "Not authenticated. Please connect wallet or log in." },
      { status: 401 }
    );
  }

  try {
    const { amount } = body ?? {};
    if (!amount) {
      return NextResponse.json(
        { error: "Amount is required for withdrawal" },
        { status: 400 }
      );
    }

    const withdrawAmount = parseFloat(amount);
    if (Number.isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return NextResponse.json(
        { error: "Withdrawal amount must be a positive number" },
        { status: 400 }
      );
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentBalance = parseFloat(user.balance || "0");
    if (currentBalance < withdrawAmount) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
          currentBalance: currentBalance.toFixed(9),
          requestedAmount: withdrawAmount.toFixed(9),
        },
        { status: 400 }
      );
    }

    const treasuryKeypair = getTreasuryKeypair();
    let txSignature: string | null = null;
    let reserveAmount = 0;
    let actualPayoutAmount = withdrawAmount;

    if (treasuryKeypair) {
      reserveAmount = await calculateRequiredReserve(treasuryKeypair);
      actualPayoutAmount = Math.max(0, withdrawAmount - reserveAmount);

      if (actualPayoutAmount <= 0) {
        return NextResponse.json(
          {
            error: "Withdrawal amount too small",
            message: `Minimum withdrawal is ${(reserveAmount + 0.0001).toFixed(
              6
            )} SOL (reserve: ${reserveAmount.toFixed(
              6
            )} SOL for rent/fees + minimum: 0.0001 SOL)`,
            reserveAmount: reserveAmount.toFixed(6),
          },
          { status: 400 }
        );
      }

      try {
        txSignature = await sendPayout(
          treasuryKeypair,
          walletAddress,
          actualPayoutAmount
        );
      } catch (error: any) {
        return NextResponse.json(
          {
            error: "Withdrawal failed",
            details:
              error?.message ||
              "The on-chain transaction failed. Your balance has not been changed.",
          },
          { status: 400 }
        );
      }
    } else {
      console.warn(
        "[Withdraw] Treasury keypair not available. Database withdrawal only."
      );
    }

    const updatedUser = await storage.withdraw(
      userId,
      withdrawAmount.toFixed(9)
    );

    await storage.createTransaction({
      userId,
      type: "withdraw",
      amount: (-withdrawAmount).toFixed(9),
      txSignature: txSignature || undefined,
      description: `Withdrew ${withdrawAmount.toFixed(9)} SOL`,
    });

    const { password, ...userWithoutPassword } = updatedUser;

    await publishToUser(userId, {
      type: "balance:updated",
      data: { userId },
    });

    return NextResponse.json({
      ...userWithoutPassword,
      withdrawalVerification: {
        verified: !!txSignature,
        requestedAmount: withdrawAmount,
        actualPayoutAmount,
        reserveAmount,
        txSignature,
      },
    });
  } catch (error: any) {
    console.error("[Withdraw] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to withdraw" },
      { status: 500 }
    );
  }
}


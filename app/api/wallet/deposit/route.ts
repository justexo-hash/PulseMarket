import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { storage } from "@server/storage";
import { verifyDepositTransaction } from "@server/deposits";
import { publishToUser } from "@lib/realtime/server";
import { getSession, setSession } from "../../_utils/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();

  let session = getSession();
  let userId = session?.userId;
  let walletAddress = session?.walletAddress;

  const providedWalletAddress =
    typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";

  if (!userId && providedWalletAddress) {
    const user = await storage.getUserByWalletAddress(providedWalletAddress);
    if (user) {
      userId = user.id;
      walletAddress = user.walletAddress;
      setSession({ userId: user.id, walletAddress: user.walletAddress });
    } else {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const newUser = await storage.createUser({
        walletAddress: providedWalletAddress,
        password: randomPassword,
      });
      userId = newUser.id;
      walletAddress = newUser.walletAddress;
      setSession({ userId: newUser.id, walletAddress: newUser.walletAddress });
    }
  }

  if (!userId || !walletAddress) {
    return NextResponse.json(
      { error: "Not authenticated. Please connect wallet or log in." },
      { status: 401 }
    );
  }

  try {
    const { amount, txSignature } = body ?? {};
    if (!amount || !txSignature) {
      return NextResponse.json(
        {
          error: "Amount and transaction signature are required for on-chain deposits",
        },
        { status: 400 }
      );
    }

    const treasuryAddress =
      process.env.NEXT_PUBLIC_TREASURY_ADDRESS ||
      process.env.TREASURY_ADDRESS ||
      process.env.VITE_TREASURY_ADDRESS;
    if (!treasuryAddress) {
      return NextResponse.json(
        { error: "Treasury address not configured" },
        { status: 500 }
      );
    }

    const verified = await verifyDepositTransaction(
      txSignature,
      walletAddress,
      treasuryAddress,
      parseFloat(amount)
    );

    if (!verified.isValid) {
      return NextResponse.json(
        {
          error: verified.error || "Transaction verification failed",
          details: {
            expectedFrom: walletAddress,
            actualFrom: verified.fromAddress,
            expectedTo: treasuryAddress,
            actualTo: verified.toAddress,
            expectedAmount: amount,
            actualAmount: verified.amountSOL,
          },
        },
        { status: 400 }
      );
    }

    const existingTransactions = await storage.getTransactionsByUser(userId);
    const alreadyProcessed = existingTransactions.some(
      (tx) =>
        tx.type === "deposit" &&
        tx.description?.includes(`Tx: ${txSignature}`)
    );

    if (alreadyProcessed) {
      return NextResponse.json(
        { error: "This transaction has already been processed", txSignature },
        { status: 400 }
      );
    }

    const depositAmount = verified.amountSOL.toFixed(9);
    const user = await storage.deposit(userId, depositAmount);

    await storage.createTransaction({
      userId,
      type: "deposit",
      amount: depositAmount,
      txSignature,
      description: `Deposited ${depositAmount} SOL`,
    });

    const { password, ...userWithoutPassword } = user;

    await publishToUser(userId, {
      type: "balance:updated",
      data: { userId },
    });

    return NextResponse.json({
      ...userWithoutPassword,
      depositVerification: {
        verified: true,
        amount: verified.amountSOL,
        txSignature: verified.signature,
      },
    });
  } catch (error: any) {
    console.error("[Deposit] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to deposit" },
      { status: 500 }
    );
  }
}


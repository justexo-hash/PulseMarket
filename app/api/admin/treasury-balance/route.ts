import { NextResponse } from "next/server";
import {
  getTreasuryBalance,
  getTreasuryKeypair,
  calculateRequiredReserve,
} from "@server/payouts";
import { requireAdminOrCreator } from "../../_utils/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminOrCreator();

    const treasuryKeypair = getTreasuryKeypair();

    if (!treasuryKeypair) {
      return NextResponse.json({
        balance: 0,
        balanceFormatted: "0.0000",
        treasuryAddress: null,
        error: "Treasury keypair not configured",
        reserveAmount: parseFloat(process.env.TREASURY_RESERVE_SOL || "0.1"),
        availableForWithdrawal: 0,
      });
    }

    const balance = await getTreasuryBalance(treasuryKeypair);
    let reserveAmount = 0.001;
    try {
      reserveAmount = await calculateRequiredReserve(treasuryKeypair);
    } catch (error) {
      console.warn(
        "[Treasury Balance] Could not calculate reserve, using fallback"
      );
    }
    const availableForWithdrawal = Math.max(0, balance - reserveAmount);

    return NextResponse.json({
      balance,
      balanceFormatted: balance.toFixed(4),
      treasuryAddress: treasuryKeypair.publicKey.toBase58(),
      reserveAmount,
      availableForWithdrawal,
      availableForWithdrawalFormatted: availableForWithdrawal.toFixed(4),
    });
  } catch (error: any) {
    console.error("[Treasury Balance] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch treasury balance" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { setSession } from "../../_utils/session";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";

    if (!walletAddress || walletAddress.length < 32) {
      return NextResponse.json(
        { error: "Valid wallet address required" },
        { status: 400 }
      );
    }

    let user = await storage.getUserByWalletAddress(walletAddress);
    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      user = await storage.createUser({
        walletAddress,
        password: randomPassword,
      });
    }

    setSession({ userId: user.id, walletAddress: user.walletAddress });

    const { password, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    console.error("[POST /api/auth/wallet] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to authenticate wallet" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import crypto from "crypto";
import { storage } from "@server/storage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const walletAddress =
      typeof body.walletAddress === "string"
        ? body.walletAddress.trim()
        : "";

    if (!walletAddress || walletAddress.length < 32) {
      return NextResponse.json(
        { error: "Valid wallet address required" },
        { status: 400 }
      );
    }

    const nonce = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await storage.upsertWalletNonce(walletAddress, nonce, expiresAt);

    return NextResponse.json({ nonce, expiresAt });
  } catch (error: any) {
    console.error("[POST /api/auth/nonce] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create nonce" },
      { status: 500 }
    );
  }
}



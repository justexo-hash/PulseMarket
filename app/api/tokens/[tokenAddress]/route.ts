import { NextResponse } from "next/server";
import { requireAdmin } from "../../_utils/auth";
import { getTokenInfo } from "@server/solanaTracker";

interface RouteParams {
  params: { tokenAddress: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    await requireAdmin();

    const tokenAddress = params.tokenAddress?.trim();
    if (!tokenAddress) {
      return NextResponse.json(
        { error: "Token address is required" },
        { status: 400 }
      );
    }

    const tokenInfo = await getTokenInfo(tokenAddress);

    return NextResponse.json({
      success: true,
      token: {
        name: tokenInfo.token.name,
        symbol: tokenInfo.token.symbol,
        image: tokenInfo.token.image,
        mint: tokenInfo.token.mint,
        decimals: tokenInfo.token.decimals,
      },
    });
  } catch (error: any) {
    console.error("[Tokens] Error:", error);
    const message = error?.message || "Failed to fetch token info";
    const status = message.includes("401") || message === "Not authenticated"
      ? 401
      : message.includes("403") || message === "Admin access required"
      ? 403
      : message.includes("404")
      ? 404
      : message.includes("400")
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}


import { NextRequest, NextResponse } from "next/server";
import { storage } from "@server/storage";
import { recalculateProbability } from "../_utils/markets";
import { insertMarketSchema, type InsertMarket } from "@shared/schema";
import { generateInviteCode } from "@server/inviteCodes";
import {
  publishEvent,
} from "@lib/realtime/server";
import { getSession } from "../_utils/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allMarkets = await storage.getAllMarkets();
    const now = new Date();
    
    const publicMarkets = allMarkets
      .filter((market) => {
        // Only show public markets
        if (market.isPrivate === 1) return false;
        
        // Only show active markets (not resolved or refunded)
        if (market.status !== "active") return false;
        
        // Filter out expired markets
        if (market.expiresAt) {
          const expirationDate = new Date(market.expiresAt);
          if (expirationDate <= now) return false;
        }
        
        return true;
      })
      .map(recalculateProbability);

    return NextResponse.json(publicMarkets);
  } catch (error) {
    console.error("[GET /api/markets] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch markets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session?.userId;

    const body = await request.json();
    const normalizedBody = {
      ...body,
      image:
        body?.image === null || body?.image === undefined || body?.image === ""
          ? undefined
          : String(body.image),
    };

    const result = insertMarketSchema.safeParse(normalizedBody);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors },
        { status: 400 }
      );
    }

    let expiresAt: Date | null = null;
    if (result.data.expiresAt) {
      const dateStr =
        typeof result.data.expiresAt === "string"
          ? result.data.expiresAt.trim()
          : String(result.data.expiresAt).trim();
      if (dateStr && dateStr !== "null" && dateStr !== "undefined") {
        const parsed = new Date(dateStr);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json(
            { error: "Invalid expiration date format" },
            { status: 400 }
          );
        }
        expiresAt = parsed;
      }
    }

    let inviteCode: string | undefined;
    if (result.data.isPrivate) {
      inviteCode = generateInviteCode();
      let existing = await storage.getMarketByInviteCode(inviteCode);
      let attempts = 0;
      while (existing && attempts < 10) {
        inviteCode = generateInviteCode();
        existing = await storage.getMarketByInviteCode(inviteCode);
        attempts += 1;
      }
      if (existing) {
        return NextResponse.json(
          {
            error: "Failed to generate unique invite code. Please try again.",
          },
          { status: 500 }
        );
      }
    }

    const parsedData = {
      ...result.data,
      expiresAt: expiresAt ?? undefined,
    } as InsertMarket;

    const marketData: InsertMarket & {
      inviteCode?: string;
      createdBy?: number;
    } = {
      ...parsedData,
      inviteCode,
      createdBy: parsedData.isPrivate ? userId : undefined,
      payoutType:
        parsedData.payoutType ||
        (parsedData.isPrivate ? "winner-takes-all" : "proportional"),
    };

    const market = await storage.createMarket(marketData);

    if (!market.isPrivate) {
      await publishEvent({ type: "market:created", data: market });
    }

    return NextResponse.json(market, { status: 201 });
  } catch (error: any) {
    console.error("[Market] Error creating market:", error);
    const errorMessage = error?.message || String(error);
    if (
      errorMessage.includes("column") ||
      errorMessage.includes("expires_at") ||
      errorMessage.includes("created_at") ||
      errorMessage.includes("is_private") ||
      errorMessage.includes("invite_code")
    ) {
      return NextResponse.json(
        {
          error: "Database schema mismatch. Please run: npm run db:push",
          details: errorMessage,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create market",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}


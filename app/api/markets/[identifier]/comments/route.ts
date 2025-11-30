import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireUser } from "../../../_utils/auth";
import { z } from "zod";

const commentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment is too long"),
});

interface RouteParams {
  params: { identifier: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const identifier = decodeURIComponent(params.identifier);
    const market = await storage.getMarketBySlug(identifier);
    if (!market) {
      const numericId = Number(identifier);
      if (!Number.isNaN(numericId)) {
        const marketById = await storage.getMarketById(numericId);
        if (marketById) {
          const comments = await storage.getMarketComments(marketById.id);
          return NextResponse.json({ comments });
        }
      }
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    const comments = await storage.getMarketComments(market.id);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("[GET /api/markets/[identifier]/comments]", error);
    return NextResponse.json(
      { error: "Failed to load comments" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const user = await requireUser();
    const identifier = decodeURIComponent(params.identifier);
    const market =
      (await storage.getMarketBySlug(identifier)) ||
      (Number.isNaN(Number(identifier))
        ? null
        : await storage.getMarketById(Number(identifier)));

    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    const body = await request.json();
    const { content } = commentSchema.parse(body);

    const comment = await storage.createMarketComment({
      marketId: market.id,
      userId: user.id,
      content,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    if (error?.message === "Not authenticated") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[POST /api/markets/[identifier]/comments]", error);
    return NextResponse.json(
      { error: "Failed to post comment" },
      { status: 500 }
    );
  }
}



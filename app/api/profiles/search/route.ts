import { NextResponse } from "next/server";
import { searchProfiles } from "@server/profiles";

const MAX_LIMIT = 20;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limitParam = Number(searchParams.get("limit") ?? "5");
  const limit = Math.max(
    1,
    Math.min(Number.isNaN(limitParam) ? 5 : limitParam, MAX_LIMIT)
  );

  if (query.length === 0) {
    return NextResponse.json({ users: [] });
  }

  try {
    const users = await searchProfiles(query, limit);
    return NextResponse.json({ users });
  } catch (error) {
    console.error("[GET /api/profiles/search]", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}



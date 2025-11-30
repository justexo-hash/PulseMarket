import { NextResponse } from "next/server";
import { getPulseProfile } from "@server/profiles";
import { getSession } from "../../_utils/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { username: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    const viewerId = session?.userId;

    const username = params.username?.toLowerCase();
    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const profile = await getPulseProfile(username, viewerId);
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...profile,
      followers: {
        ...profile.followers,
        viewerIsFollowing: profile.followers.isFollowing,
      },
    });
  } catch (error) {
    console.error("[GET /api/profiles/[username]]", error);
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    );
  }
}


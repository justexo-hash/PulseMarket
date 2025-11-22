import { NextResponse } from "next/server";
import { requireUser } from "../../../_utils/auth";
import { followUser, unfollowUser } from "@server/profiles";
import { storage } from "@server/storage";

interface RouteParams {
  params: { username: string };
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const viewer = await requireUser();
    const targetUsername = params.username?.toLowerCase();

    if (!targetUsername) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const targetUser = await storage.getUserByUsername(targetUsername);
    if (!targetUser) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await followUser(viewer.id, targetUser.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const message = error?.message || "Unable to follow user";
    const status =
      message === "Not authenticated" || message === "User not found"
        ? 401
        : message === "Cannot follow yourself"
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const viewer = await requireUser();
    const targetUsername = params.username?.toLowerCase();

    if (!targetUsername) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const targetUser = await storage.getUserByUsername(targetUsername);
    if (!targetUser) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await unfollowUser(viewer.id, targetUser.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const message = error?.message || "Unable to unfollow user";
    const status =
      message === "Not authenticated" || message === "User not found"
        ? 401
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}


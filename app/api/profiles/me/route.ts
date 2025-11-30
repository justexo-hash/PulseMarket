import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "../../_utils/auth";
import { storage } from "@server/storage";

const updateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-z0-9._-]+$/, "Only lowercase letters, numbers, ., _, -")
    .optional(),
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be at most 50 characters")
    .optional(),
  bio: z
    .string()
    .max(280, "Bio must be at most 280 characters")
    .optional(),
  avatarUrl: z
    .string()
    .trim()
    .url("Avatar must be a valid URL")
    .or(z.literal(""))
    .optional(),
});

export async function GET() {
  const user = await requireUser();
  const { password, ...userWithoutPassword } = user;
  return NextResponse.json(userWithoutPassword);
}

export async function PATCH(request: Request) {
  try {
    const viewer = await requireUser();
    const previousUsername = viewer.username;
    const body = await request.json();
    const payload = updateProfileSchema.parse(body);

    const updates: {
      username?: string;
      displayName?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
    } = {};

    if (payload.username !== undefined) {
      const username = payload.username.toLowerCase();
      if (username !== viewer.username) {
        const existing = await storage.getUserByUsername(username);
        if (existing && existing.id !== viewer.id) {
          return NextResponse.json(
            { error: "Username already taken" },
            { status: 409 }
          );
        }
      }
      updates.username = username;
    }

    if (payload.displayName !== undefined) {
      updates.displayName = payload.displayName || null;
    }

    if (payload.bio !== undefined) {
      updates.bio = payload.bio?.trim() ? payload.bio : null;
    }

    if (payload.avatarUrl !== undefined) {
      updates.avatarUrl = payload.avatarUrl.trim() ? payload.avatarUrl.trim() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true });
    }

    const updatedUser = await storage.updateUserProfile(viewer.id, updates);
    const { password, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      success: true,
      user: { ...userWithoutPassword, previousUsername },
    });
  } catch (error: any) {
    const message = error?.message || "Failed to update profile";
    const status =
      message === "Not authenticated" || message === "User not found" ? 401 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}



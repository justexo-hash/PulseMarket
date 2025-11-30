import { NextResponse } from "next/server";
import { getSession } from "../../_utils/session";
import { createRealtimeTokenRequest } from "@lib/realtime/server";

export async function POST() {
  try {
    const session = await getSession();
    const capability: Record<string, Array<"subscribe">> = {
      "pulse-global": ["subscribe"],
    };

    const clientId = session ? `user-${session.userId}` : "guest";

    if (session) {
      capability[`user:${session.userId}`] = ["subscribe"];
    }

    const tokenRequest = await createRealtimeTokenRequest({
      clientId,
      capability,
    });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("[POST /api/realtime/auth] Error:", error);
    return NextResponse.json(
      { error: "Failed to create Ably token" },
      { status: 500 }
    );
  }
}


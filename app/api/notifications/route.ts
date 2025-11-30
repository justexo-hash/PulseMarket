import { NextResponse } from "next/server";
import { requireUser } from "../_utils/auth";
import { getNotificationsForUser } from "@server/notifications";

export const revalidate = 0;

export async function GET() {
  try {
    const user = await requireUser();
    const notifications = await getNotificationsForUser(user.id);
    return NextResponse.json({ notifications });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    const status = message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}



import { NextResponse } from "next/server";
import { clearSession } from "../../_utils/session";

export async function POST() {
  clearSession();
  return NextResponse.json({ message: "Logged out successfully" });
}


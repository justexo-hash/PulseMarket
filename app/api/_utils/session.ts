import { cookies } from "next/headers";

const SESSION_COOKIE = "pulse_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: number;
  walletAddress: string;
}

function encodeSession(value: SessionPayload): string {
  const json = JSON.stringify(value);
  return Buffer.from(json, "utf8").toString("base64url");
}

function decodeSession(value: string): SessionPayload | null {
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getSession(): SessionPayload | null {
  const cookie = cookies().get(SESSION_COOKIE);
  if (!cookie?.value) {
    return null;
  }
  return decodeSession(cookie.value);
}

export function setSession(payload: SessionPayload) {
  cookies().set(SESSION_COOKIE, encodeSession(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export function clearSession() {
  cookies().delete(SESSION_COOKIE);
}


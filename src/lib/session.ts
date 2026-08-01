import crypto from "node:crypto";
import { cookies } from "next/headers";
import { deleteAllSessionsForUser, deleteSessionToken, getUserBySessionToken, insertSession, type User } from "./db";

export const SESSION_COOKIE = "auth_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 hari

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;

  insertSession(token, userId, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_SECONDS));

  return token;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return token ? getUserBySessionToken(token) : null;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    deleteSessionToken(token);
  }
  cookieStore.set(SESSION_COOKIE, "", cookieOptions(0));
}

/** Logout dari semua perangkat: hapus semua session milik user + bersihkan cookie */
export async function destroyAllSessions(userId: string): Promise<void> {
  deleteAllSessionsForUser(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", cookieOptions(0));
}

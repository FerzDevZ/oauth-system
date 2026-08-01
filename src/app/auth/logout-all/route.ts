import { NextResponse } from "next/server";
import { logAuth } from "@/lib/logger";
import { destroyAllSessions, getCurrentUser } from "@/lib/session";

// Logout dari semua perangkat: hapus seluruh session milik user di database
export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await destroyAllSessions(user.id);
    logAuth("logout_all", { userId: user.id });
  }
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}

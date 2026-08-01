import { NextResponse } from "next/server";
import { logAuth } from "@/lib/logger";
import { destroySession, getCurrentUser } from "@/lib/session";

export async function POST() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    logAuth("logout", { userId: user.id });
  }
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}

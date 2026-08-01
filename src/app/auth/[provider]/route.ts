import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/oauth";
import { isProvider } from "@/lib/oauth/providers";

// Mulai alur OAuth: buat state acak, simpan ke cookie, lalu redirect ke provider
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!isProvider(provider)) {
    return NextResponse.redirect(new URL("/?error=invalid_provider", req.url));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = new URL(`/auth/${provider}/callback`, req.url).toString();

  let authUrl: string;
  try {
    authUrl = getAuthorizationUrl(provider, state, redirectUri);
  } catch {
    // Client ID/Secret belum dikonfigurasi di .env
    return NextResponse.redirect(new URL("/?error=not_configured", req.url));
  }

  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 menit
  });

  return NextResponse.redirect(authUrl);
}

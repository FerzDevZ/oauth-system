import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logAuth } from "@/lib/logger";
import { getAuthorizationUrl } from "@/lib/oauth";
import { createPkcePair } from "@/lib/oauth/pkce";
import { isProvider } from "@/lib/oauth/providers";
import { getClientIp, isRateLimited } from "@/lib/security";

// Mulai alur OAuth: buat state + PKCE, simpan ke cookie, lalu redirect ke provider
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!isProvider(provider)) {
    return NextResponse.redirect(new URL("/?error=invalid_provider", req.url));
  }

  const ip = getClientIp(req);
  if (isRateLimited(`oauth_start:${provider}:${ip}`)) {
    logAuth("rate_limited", { ip, path: `/auth/${provider}` });
    return NextResponse.redirect(new URL("/?error=rate_limited", req.url));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const { codeVerifier, codeChallenge } = createPkcePair();
  const redirectUri = new URL(`/auth/${provider}/callback`, req.url).toString();

  let authUrl: string;
  try {
    authUrl = getAuthorizationUrl(provider, state, redirectUri, codeChallenge);
  } catch {
    // Client ID/Secret belum dikonfigurasi di .env
    return NextResponse.redirect(new URL("/?error=not_configured", req.url));
  }

  const cookieStore = await cookies();
  const cookieBase = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 menit
  };
  cookieStore.set("oauth_state", state, cookieBase);
  cookieStore.set("oauth_verifier", codeVerifier, cookieBase);

  logAuth("oauth_started", { provider, ip });
  return NextResponse.redirect(authUrl);
}

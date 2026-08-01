import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/db";
import { logAuth } from "@/lib/logger";
import { getUserFromCode } from "@/lib/oauth";
import { isProvider } from "@/lib/oauth/providers";
import { getClientIp, isRateLimited } from "@/lib/security";
import { createSession } from "@/lib/session";

// Callback OAuth: tukar `code` + `code_verifier` (PKCE) dengan token, ambil profil user,
// simpan/update user di SQLite, buat session, lalu redirect ke dashboard
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!isProvider(provider)) {
    return NextResponse.redirect(new URL("/?error=invalid_provider", req.url));
  }

  const ip = getClientIp(req);
  if (isRateLimited(`oauth_callback:${provider}:${ip}`)) {
    logAuth("rate_limited", { ip, path: `/auth/${provider}/callback` });
    return NextResponse.redirect(new URL("/?error=rate_limited", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("oauth_state")?.value;
  const codeVerifier = cookieStore.get("oauth_verifier")?.value;
  // Hapus cookie OAuth sesegera mungkin (dipakai sekali saja)
  cookieStore.set("oauth_state", "", { path: "/", maxAge: 0 });
  cookieStore.set("oauth_verifier", "", { path: "/", maxAge: 0 });

  if (!code) {
    logAuth("oauth_failed", { provider, reason: "missing_code", ip });
    return NextResponse.redirect(new URL("/?error=missing_code", req.url));
  }
  if (!state || !expectedState || state !== expectedState) {
    // Proteksi CSRF: state harus cocok dengan yang kita set sebelumnya
    logAuth("oauth_failed", { provider, reason: "state_mismatch", ip });
    return NextResponse.redirect(new URL("/?error=state_mismatch", req.url));
  }

  const redirectUri = new URL(`/auth/${provider}/callback`, req.url).toString();

  try {
    const providerUser = await getUserFromCode(provider, code, redirectUri, codeVerifier);
    const user = upsertUser({
      provider,
      providerUserId: providerUser.providerUserId,
      email: providerUser.email,
      name: providerUser.name,
      avatarUrl: providerUser.avatarUrl,
    });

    await createSession(user.id);
    logAuth("oauth_success", { provider, userId: user.id, email: user.email, ip });
  } catch {
    logAuth("oauth_failed", { provider, reason: "oauth_failed", ip });
    return NextResponse.redirect(new URL("/?error=oauth_failed", req.url));
  }

  return NextResponse.redirect(new URL("/dashboard", req.url));
}

import type { ProviderUser } from "./providers";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} tidak di-set`);
  return value;
}

export function getGoogleAuthorizationUrl(
  state: string,
  redirectUri: string,
  codeChallenge?: string,
): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  if (codeChallenge) {
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", "S256");
  }

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function getGoogleUser(
  code: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<ProviderUser> {
  const tokenBody = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  if (codeVerifier) {
    tokenBody.set("code_verifier", codeVerifier);
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });

  if (!tokenRes.ok) {
    throw new Error(`Google token exchange gagal: ${tokenRes.status} ${await tokenRes.text()}`);
  }

  const token = (await tokenRes.json()) as { access_token: string };
  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });

  if (!userRes.ok) {
    throw new Error(`Google userinfo gagal: ${userRes.status}`);
  }

  const user = (await userRes.json()) as {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  return {
    providerUserId: user.sub,
    email: user.email ?? null,
    name: user.name ?? null,
    avatarUrl: user.picture ?? null,
  };
}

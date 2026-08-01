import type { ProviderUser } from "./providers";

const GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} tidak di-set`);
  return value;
}

export function getGithubAuthorizationUrl(
  state: string,
  redirectUri: string,
  codeChallenge?: string,
): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GITHUB_CLIENT_ID"),
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state,
  });

  if (codeChallenge) {
    params.set("code_challenge", codeChallenge);
    params.set("code_challenge_method", "S256");
  }

  return `${GITHUB_AUTH_URL}?${params.toString()}`;
}

export async function getGithubUser(
  code: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<ProviderUser> {
  const tokenBody = new URLSearchParams({
    client_id: requireEnv("GITHUB_CLIENT_ID"),
    client_secret: requireEnv("GITHUB_CLIENT_SECRET"),
    code,
    redirect_uri: redirectUri,
  });

  if (codeVerifier) {
    tokenBody.set("code_verifier", codeVerifier);
  }

  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenBody,
  });

  if (!tokenRes.ok) {
    throw new Error(`GitHub token exchange gagal: ${tokenRes.status} ${await tokenRes.text()}`);
  }

  const token = (await tokenRes.json()) as { access_token: string };
  const userRes = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "auth-project",
    },
  });

  if (!userRes.ok) {
    throw new Error(`GitHub userinfo gagal: ${userRes.status}`);
  }

  const user = (await userRes.json()) as {
    id: number;
    login: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };

  return {
    providerUserId: String(user.id),
    email: user.email ?? null,
    name: user.name ?? user.login,
    avatarUrl: user.avatar_url ?? null,
  };
}

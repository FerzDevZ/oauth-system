import { afterEach, describe, expect, it, vi } from "vitest";
import { getGithubAuthorizationUrl, getGithubUser } from "@/lib/oauth/github";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe("oauth/github", () => {
  it("membangun authorization URL dengan state & PKCE", () => {
    process.env.GITHUB_CLIENT_ID = "github-id";
    const url = getGithubAuthorizationUrl(
      "state-1",
      "http://localhost:3000/auth/github/callback",
      "challenge-xyz",
    );
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(parsed.searchParams.get("client_id")).toBe("github-id");
    expect(parsed.searchParams.get("scope")).toBe("read:user user:email");
    expect(parsed.searchParams.get("state")).toBe("state-1");
    expect(parsed.searchParams.get("code_challenge")).toBe("challenge-xyz");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("menukar code dan mengambil profil user (fallback name ke login)", async () => {
    process.env.GITHUB_CLIENT_ID = "github-id";
    process.env.GITHUB_CLIENT_SECRET = "github-secret";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "at-123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 42, login: "firman", name: null, email: null, avatar_url: "avatar" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const user = await getGithubUser(
      "code-1",
      "http://localhost:3000/auth/github/callback",
      "verifier-1",
    );

    expect(user).toEqual({
      providerUserId: "42",
      email: null,
      name: "firman",
      avatarUrl: "avatar",
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("code_verifier")).toBe("verifier-1");
    expect(body.get("client_id")).toBe("github-id");
  });
});

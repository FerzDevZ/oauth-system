import { afterEach, describe, expect, it, vi } from "vitest";
import { getGoogleAuthorizationUrl, getGoogleUser } from "@/lib/oauth/google";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe("oauth/google", () => {
  it("membangun authorization URL dengan state & PKCE", () => {
    process.env.GOOGLE_CLIENT_ID = "google-id";
    const url = getGoogleAuthorizationUrl(
      "state-1",
      "http://localhost:3000/auth/google/callback",
      "challenge-xyz",
    );
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(parsed.searchParams.get("client_id")).toBe("google-id");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("scope")).toContain("openid");
    expect(parsed.searchParams.get("state")).toBe("state-1");
    expect(parsed.searchParams.get("code_challenge")).toBe("challenge-xyz");
    expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("menukar code (dengan code_verifier) dan mengambil profil user", async () => {
    process.env.GOOGLE_CLIENT_ID = "google-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";

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
          JSON.stringify({ sub: "sub-1", email: "user@example.com", name: "User Uji", picture: "pic" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const user = await getGoogleUser(
      "code-1",
      "http://localhost:3000/auth/google/callback",
      "verifier-1",
    );

    expect(user).toEqual({
      providerUserId: "sub-1",
      email: "user@example.com",
      name: "User Uji",
      avatarUrl: "pic",
    });

    // Pastikan token exchange mengirim code_verifier (PKCE)
    const [, init] = fetchMock.mock.calls[0];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("code_verifier")).toBe("verifier-1");
    expect(body.get("grant_type")).toBe("authorization_code");
  });

  it("melempar error saat token exchange gagal", async () => {
    process.env.GOOGLE_CLIENT_ID = "google-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad request", { status: 400 })),
    );

    await expect(
      getGoogleUser("code-1", "http://localhost:3000/auth/google/callback"),
    ).rejects.toThrow(/token exchange/i);
  });
});

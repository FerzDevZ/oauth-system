import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  upsertUser: vi.fn(),
  getUserFromCode: vi.fn(),
  createSession: vi.fn(),
  logAuth: vi.fn(),
  isRateLimited: vi.fn(() => false),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));
vi.mock("@/lib/db", () => ({ upsertUser: mocks.upsertUser }));
vi.mock("@/lib/oauth", () => ({ getUserFromCode: mocks.getUserFromCode }));
vi.mock("@/lib/security", () => ({
  isRateLimited: mocks.isRateLimited,
  getClientIp: mocks.getClientIp,
}));
vi.mock("@/lib/logger", () => ({ logAuth: mocks.logAuth }));
vi.mock("@/lib/session", () => ({ createSession: mocks.createSession }));

import { GET } from "@/app/auth/[provider]/callback/route";

function makeCookieStore(stateValue?: string) {
  return {
    get: vi.fn((name: string) => {
      if (name === "oauth_state") return stateValue ? { name, value: stateValue } : undefined;
      if (name === "oauth_verifier") return { name, value: "verifier-1" };
      return undefined;
    }),
    set: vi.fn(),
  };
}

function context(provider: string) {
  return { params: Promise.resolve({ provider }) };
}

const CALLBACK_URL = "http://localhost:3000/auth/google/callback";

describe("auth/[provider]/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak provider yang tidak dikenal", async () => {
    mocks.cookies.mockReturnValue(makeCookieStore());
    const res = await GET(new NextRequest(CALLBACK_URL), context("facebook"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/?error=invalid_provider");
  });

  it("redirect error saat code tidak ada", async () => {
    mocks.cookies.mockReturnValue(makeCookieStore("valid-state"));
    const res = await GET(new NextRequest(`${CALLBACK_URL}?state=valid-state`), context("google"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/?error=missing_code");
  });

  it("menolak saat state tidak cocok (anti-CSRF)", async () => {
    mocks.cookies.mockReturnValue(makeCookieStore("other-state"));
    const res = await GET(
      new NextRequest(`${CALLBACK_URL}?code=abc&state=expected-state`),
      context("google"),
    );
    expect(res.headers.get("location")).toBe("http://localhost:3000/?error=state_mismatch");
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("redirect error saat provider gagal menukar token", async () => {
    mocks.cookies.mockReturnValue(makeCookieStore("valid-state"));
    mocks.getUserFromCode.mockRejectedValue(new Error("token exchange gagal"));
    const res = await GET(
      new NextRequest(`${CALLBACK_URL}?code=abc&state=valid-state`),
      context("google"),
    );
    expect(res.headers.get("location")).toBe("http://localhost:3000/?error=oauth_failed");
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });

  it("berhasil: buat user, buat session, redirect ke dashboard", async () => {
    mocks.cookies.mockReturnValue(makeCookieStore("valid-state"));
    mocks.getUserFromCode.mockResolvedValue({
      providerUserId: "sub-1",
      email: "user@example.com",
      name: "User Uji",
      avatarUrl: "pic",
    });
    mocks.upsertUser.mockReturnValue({
      id: "user-1",
      email: "user@example.com",
      name: "User Uji",
      avatarUrl: "pic",
      provider: "google",
    });
    mocks.createSession.mockResolvedValue("session-token");

    const res = await GET(
      new NextRequest(`${CALLBACK_URL}?code=abc&state=valid-state`),
      context("google"),
    );

    expect(mocks.getUserFromCode).toHaveBeenCalledWith(
      "google",
      "abc",
      "http://localhost:3000/auth/google/callback",
      "verifier-1",
    );
    expect(mocks.upsertUser).toHaveBeenCalledWith({
      provider: "google",
      providerUserId: "sub-1",
      email: "user@example.com",
      name: "User Uji",
      avatarUrl: "pic",
    });
    expect(mocks.createSession).toHaveBeenCalledWith("user-1");
    expect(mocks.logAuth).toHaveBeenCalledWith("oauth_success", expect.objectContaining({ userId: "user-1" }));
    expect(res.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  it("redirect ke halaman rate-limited saat terkena rate limit", async () => {
    mocks.isRateLimited.mockReturnValueOnce(true);
    const res = await GET(new NextRequest(CALLBACK_URL), context("google"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/?error=rate_limited");
  });
});

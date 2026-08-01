import { beforeEach, describe, expect, it } from "vitest";
import { isRateLimited, resetRateLimiterForTests } from "@/lib/security";

describe("rate-limit", () => {
  beforeEach(() => {
    resetRateLimiterForTests();
  });

  it("mengizinkan request pertama lalu memblokir setelah batas", () => {
    const key = "oauth_callback:google:1.2.3.4";
    const max = Number(process.env.RATE_LIMIT_MAX ?? 10);

    for (let i = 0; i < max; i++) {
      expect(isRateLimited(key)).toBe(false);
    }
    expect(isRateLimited(key)).toBe(true);
  });

  it("key yang berbeda punya hitungan terpisah", () => {
    const keyA = "oauth_start:google:1.1.1.1";
    const keyB = "oauth_start:github:2.2.2.2";

    expect(isRateLimited(keyA)).toBe(false);
    expect(isRateLimited(keyB)).toBe(false);
  });
});

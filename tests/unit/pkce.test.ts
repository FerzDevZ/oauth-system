import { describe, expect, it } from "vitest";
import { createPkcePair, deriveCodeChallenge } from "@/lib/oauth/pkce";

describe("oauth/pkce", () => {
  it("menghasilkan verifier acak & challenge yang valid (RFC 7636)", () => {
    const { codeVerifier, codeChallenge } = createPkcePair();

    // verifier: 43-128 karakter, karakter aman
    expect(codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(codeVerifier.length).toBeLessThanOrEqual(128);
    expect(/^[A-Za-z0-9\-._~]+$/.test(codeVerifier)).toBe(true);

    // challenge = base64url(sha256(verifier)), panjang 43
    expect(codeChallenge).toHaveLength(43);
    expect(codeChallenge).toBe(deriveCodeChallenge(codeVerifier));
  });

  it("menghasilkan verifier yang berbeda setiap pemanggilan", () => {
    const a = createPkcePair();
    const b = createPkcePair();
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
    expect(a.codeChallenge).not.toBe(b.codeChallenge);
  });
});

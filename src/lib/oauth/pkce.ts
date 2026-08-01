import crypto from "node:crypto";

/**
 * Buat pasangan PKCE (RFC 7636).
 * code_verifier  -> nilai acak, disimpan di cookie, dikirim saat tukar token
 * code_challenge -> SHA-256 dari verifier (base64url), dikirim saat authorize
 */
export function createPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function deriveCodeChallenge(codeVerifier: string): string {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
}

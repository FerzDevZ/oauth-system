type RateLimitBucket = { count: number; resetAt: number };

const WINDOW_MS = 60_000; // 1 menit
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX ?? 10);

// Disimpan di globalThis agar tidak hilang saat hot-reload dev
const globalForSecurity = globalThis as unknown as { __rateLimits?: Map<string, RateLimitBucket> };
const store = globalForSecurity.__rateLimits ?? new Map<string, RateLimitBucket>();
if (process.env.NODE_ENV !== "production") {
  globalForSecurity.__rateLimits = store;
}

/**
 * Rate limiter sederhana (fixed window) berbasis key, mis. `oauth_callback:google:IP`.
 * Mengembalikan true jika request melebihi batas.
 */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_REQUESTS;
}

/** Hanya untuk keperluan test */
export function resetRateLimiterForTests(): void {
  store.clear();
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Rate limiter fixed-window sederhana berbasis memori proses. Cukup untuk
 * membatasi brute-force login per IP dan per akun pada satu instans.
 *
 * CATATAN PRODUKSI: penyimpanan in-memory tidak dibagi antar instans
 * serverless. Untuk penegakan lintas instans, ganti store dengan Upstash/Redis
 * (subprosesor baru -> perlu persetujuan). Antarmuka fungsi ini dibuat agar
 * store mudah ditukar tanpa mengubah pemanggil.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
  now: number = Date.now(),
): RateLimitResult {
  const bucket = store.get(key);
  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterMs: 0 };
}

/** Hanya untuk pengujian: kosongkan seluruh state limiter. */
export function resetRateLimitStore(): void {
  store.clear();
}

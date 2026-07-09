import { afterEach, describe, expect, it } from 'vitest';
import { rateLimit, resetRateLimitStore } from '@/lib/auth/rate-limit';

afterEach(() => resetRateLimitStore());

describe('rateLimit', () => {
  it('mengizinkan hingga limit lalu menolak', () => {
    const opts = { limit: 3, windowMs: 1000 };
    expect(rateLimit('k', opts, 0).allowed).toBe(true);
    expect(rateLimit('k', opts, 0).allowed).toBe(true);
    expect(rateLimit('k', opts, 0).allowed).toBe(true);
    const blocked = rateLimit('k', opts, 0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(1000);
  });

  it('mereset setelah jendela berlalu', () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit('k', opts, 0).allowed).toBe(true);
    expect(rateLimit('k', opts, 500).allowed).toBe(false);
    expect(rateLimit('k', opts, 1000).allowed).toBe(true); // jendela baru
  });

  it('kunci berbeda tidak saling memengaruhi', () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit('ip:1', opts, 0).allowed).toBe(true);
    expect(rateLimit('ip:2', opts, 0).allowed).toBe(true);
    expect(rateLimit('ip:1', opts, 0).allowed).toBe(false);
  });
});

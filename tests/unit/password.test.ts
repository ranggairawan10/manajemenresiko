import { describe, expect, it } from 'vitest';
import { emailSchema, loginSchema, MIN_PASSWORD_LENGTH, passwordSchema } from '@/lib/auth/password';

describe('passwordSchema (NIST >= 12)', () => {
  it(`menolak kata sandi < ${MIN_PASSWORD_LENGTH} karakter`, () => {
    expect(passwordSchema.safeParse('pendek123').success).toBe(false);
    expect(passwordSchema.safeParse('a'.repeat(MIN_PASSWORD_LENGTH - 1)).success).toBe(false);
  });

  it('menerima kata sandi >= 12 karakter', () => {
    expect(passwordSchema.safeParse('a'.repeat(MIN_PASSWORD_LENGTH)).success).toBe(true);
    expect(passwordSchema.safeParse('kata-sandi-yang-kuat-2026').success).toBe(true);
  });
});

describe('emailSchema', () => {
  it('menormalkan trim + lowercase', () => {
    const r = emailSchema.safeParse('  User@Example.COM ');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe('user@example.com');
  });

  it('menolak email tidak valid', () => {
    expect(emailSchema.safeParse('bukan-email').success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('memvalidasi email + password sekaligus', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'rahasia-kuat-12' }).success).toBe(
      true,
    );
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'pendek' }).success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  generateInviteToken,
  hashInviteToken,
  inviteExpiry,
  INVITE_TTL_DAYS,
} from '@/lib/invite/token';
import { parseInviteCsv } from '@/lib/invite/csv';

describe('invite token', () => {
  it('hash SHA-256 deterministik (64 hex) & berbeda per token', () => {
    expect(hashInviteToken('abc')).toBe(hashInviteToken('abc'));
    expect(hashInviteToken('abc')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteToken('abc')).not.toBe(hashInviteToken('abd'));
  });

  it('generateInviteToken menghasilkan token acak URL-safe', () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(40);
  });

  it('kedaluwarsa 7 hari dari now', () => {
    const now = new Date('2026-07-09T00:00:00.000Z');
    const exp = inviteExpiry(now);
    expect(exp.getTime() - now.getTime()).toBe(INVITE_TTL_DAYS * 86400_000);
  });
});

describe('parseInviteCsv', () => {
  it('mem-parse email+role, default peserta, abaikan header', () => {
    const { valid, report } = parseInviteCsv('email,role\na@x.com,asesor\nb@x.com\n');
    expect(valid).toEqual([
      { email: 'a@x.com', role: 'asesor' },
      { email: 'b@x.com', role: 'peserta' },
    ]);
    expect(report.map((r) => r.status)).toEqual(['ok', 'ok']);
  });

  it('menandai email invalid, role invalid, duplikat, dan existing', () => {
    const { valid, report } = parseInviteCsv(
      'a@x.com,peserta\nbukan-email,peserta\nc@x.com,raja\na@x.com,peserta\nd@x.com,peserta\n',
      { existingEmails: new Set(['d@x.com']) },
    );
    const byStatus = report.map((r) => r.status);
    expect(byStatus).toEqual(['ok', 'invalid_email', 'invalid_role', 'duplicate', 'existing']);
    expect(valid).toEqual([{ email: 'a@x.com', role: 'peserta' }]);
  });

  it('admin_platform tidak dapat diundang (invalid_role)', () => {
    const { report } = parseInviteCsv('x@x.com,admin_platform\n');
    expect(report[0]?.status).toBe('invalid_role');
  });

  it('memproses 500 baris dengan cepat (DoD performa)', () => {
    const lines = Array.from({ length: 500 }, (_, i) => `user${i}@x.com,peserta`).join('\n');
    const start = Date.now();
    const { valid, report } = parseInviteCsv(lines);
    expect(valid.length).toBe(500);
    expect(report.length).toBe(500);
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

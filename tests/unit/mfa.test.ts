import { describe, expect, it } from 'vitest';
import { evaluateMfaGate, requiresMfa } from '@/lib/auth/mfa';

describe('requiresMfa', () => {
  it('wajib untuk admin_tenant & admin_platform', () => {
    expect(requiresMfa('admin_tenant')).toBe(true);
    expect(requiresMfa('admin_platform')).toBe(true);
  });
  it('tidak wajib untuk peserta/asesor/null', () => {
    expect(requiresMfa('peserta')).toBe(false);
    expect(requiresMfa('asesor')).toBe(false);
    expect(requiresMfa(null)).toBe(false);
  });
});

describe('evaluateMfaGate', () => {
  it('peran non-admin selalu ok', () => {
    expect(
      evaluateMfaGate({ role: 'peserta', hasVerifiedFactor: false, currentLevel: 'aal1' }),
    ).toBe('ok');
  });

  it('admin tanpa faktor -> enroll', () => {
    expect(
      evaluateMfaGate({ role: 'admin_tenant', hasVerifiedFactor: false, currentLevel: 'aal1' }),
    ).toBe('enroll');
  });

  it('admin punya faktor tapi belum AAL2 -> verify', () => {
    expect(
      evaluateMfaGate({ role: 'admin_platform', hasVerifiedFactor: true, currentLevel: 'aal1' }),
    ).toBe('verify');
  });

  it('admin sudah AAL2 -> ok', () => {
    expect(
      evaluateMfaGate({ role: 'admin_tenant', hasVerifiedFactor: true, currentLevel: 'aal2' }),
    ).toBe('ok');
  });
});

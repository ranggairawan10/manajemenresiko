import { describe, expect, it } from 'vitest';
import {
  canAccessVaultPath,
  isValidVaultPath,
  vaultPrefix,
  type VaultClaims,
} from '@/lib/storage/vault-path';
import { decodeClaims } from '@/lib/supabase/claims';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';
const USER_1 = 'aaaaaaaa-0000-4000-8000-000000000001';
const USER_2 = 'aaaaaaaa-0000-4000-8000-000000000002';

const peserta: VaultClaims = { tenantId: TENANT_A, userId: USER_1, role: 'peserta' };
const adminTenant: VaultClaims = { tenantId: TENANT_A, userId: USER_1, role: 'admin_tenant' };

describe('isValidVaultPath', () => {
  it('menerima path tenant/user/berkas', () => {
    expect(isValidVaultPath(`${TENANT_A}/${USER_1}/sertifikat.pdf`)).toBe(true);
  });

  it('menolak traversal, leading slash, backslash, segmen kosong, terlalu pendek', () => {
    expect(isValidVaultPath(`${TENANT_A}/${USER_1}/../rahasia.pdf`)).toBe(false);
    expect(isValidVaultPath(`/${TENANT_A}/${USER_1}/x.pdf`)).toBe(false);
    expect(isValidVaultPath(`${TENANT_A}\\${USER_1}\\x.pdf`)).toBe(false);
    expect(isValidVaultPath(`${TENANT_A}//x.pdf`)).toBe(false);
    expect(isValidVaultPath(`${TENANT_A}/${USER_1}`)).toBe(false);
    expect(isValidVaultPath('')).toBe(false);
  });
});

describe('canAccessVaultPath (isolasi path silang)', () => {
  it('user boleh mengakses path miliknya', () => {
    expect(canAccessVaultPath(`${TENANT_A}/${USER_1}/a.pdf`, peserta)).toBe(true);
  });

  it('user TIDAK boleh mengakses path user lain di tenant sama', () => {
    expect(canAccessVaultPath(`${TENANT_A}/${USER_2}/a.pdf`, peserta)).toBe(false);
  });

  it('user TIDAK boleh mengakses path tenant lain', () => {
    expect(canAccessVaultPath(`${TENANT_B}/${USER_1}/a.pdf`, peserta)).toBe(false);
  });

  it('admin_tenant boleh mengakses seluruh path tenantnya', () => {
    expect(canAccessVaultPath(`${TENANT_A}/${USER_2}/a.pdf`, adminTenant)).toBe(true);
  });

  it('admin_tenant TIDAK boleh melintas ke tenant lain', () => {
    expect(canAccessVaultPath(`${TENANT_B}/${USER_1}/a.pdf`, adminTenant)).toBe(false);
  });

  it('menolak path invalid walau tenant cocok', () => {
    expect(canAccessVaultPath(`${TENANT_A}/${USER_1}/../${USER_2}/a.pdf`, peserta)).toBe(false);
  });
});

describe('vaultPrefix', () => {
  it('membentuk prefix tenant/user/', () => {
    expect(vaultPrefix(TENANT_A, USER_1)).toBe(`${TENANT_A}/${USER_1}/`);
  });
});

describe('decodeClaims', () => {
  function token(payload: Record<string, unknown>): string {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    return `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
  }

  it('mengekstrak sub/tenant_id/user_role', () => {
    const c = decodeClaims(token({ sub: USER_1, tenant_id: TENANT_A, user_role: 'peserta' }));
    expect(c).toEqual({ userId: USER_1, tenantId: TENANT_A, role: 'peserta' });
  });

  it('tenant/role null bila klaim tak ada', () => {
    const c = decodeClaims(token({ sub: USER_1 }));
    expect(c).toEqual({ userId: USER_1, tenantId: null, role: null });
  });

  it('null untuk token cacat', () => {
    expect(decodeClaims('bukan-token')).toBeNull();
  });
});

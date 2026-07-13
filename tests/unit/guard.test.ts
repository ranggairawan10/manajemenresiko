import { describe, expect, it } from 'vitest';
import { roleAllowed } from '@/lib/auth/guard';

describe('roleAllowed', () => {
  it('true bila peran termasuk allowlist', () => {
    expect(roleAllowed('admin_platform', ['admin_platform'])).toBe(true);
    expect(roleAllowed('admin_tenant', ['admin_tenant', 'admin_platform'])).toBe(true);
  });

  it('false bila peran di luar allowlist atau null', () => {
    expect(roleAllowed('peserta', ['admin_tenant'])).toBe(false);
    expect(roleAllowed(null, ['admin_tenant'])).toBe(false);
    expect(roleAllowed(undefined, ['admin_platform'])).toBe(false);
  });
});

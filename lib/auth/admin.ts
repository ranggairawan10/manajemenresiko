import { requireRole } from '@/lib/auth/guard';
import type { SessionContext } from '@/lib/auth/session';

/** Guard admin_platform: login + MFA (AAL2) + peran. RLS = lapis terakhir. */
export function requireAdminPlatform(): Promise<SessionContext> {
  return requireRole(['admin_platform']);
}

/** Guard admin_tenant: login + MFA (AAL2) + peran. */
export function requireAdminTenant(): Promise<SessionContext> {
  return requireRole(['admin_tenant']);
}

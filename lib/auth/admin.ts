import { redirect } from 'next/navigation';
import { getSessionContext, type SessionContext } from '@/lib/auth/session';
import { evaluateMfaGate } from '@/lib/auth/mfa';

/**
 * Guard halaman/aksi admin_platform: wajib login, wajib MFA (AAL2), dan peran
 * admin_platform. RLS tetap menjadi lapis penegakan terakhir di database.
 */
export async function requireAdminPlatform(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx.user) redirect('/login');

  const gate = evaluateMfaGate({
    role: ctx.claims?.role ?? null,
    hasVerifiedFactor: ctx.hasVerifiedFactor,
    currentLevel: ctx.currentLevel,
  });
  if (gate === 'enroll') redirect('/mfa/enroll');
  if (gate === 'verify') redirect('/mfa/verify');

  if (ctx.claims?.role !== 'admin_platform') redirect('/sesi');
  return ctx;
}

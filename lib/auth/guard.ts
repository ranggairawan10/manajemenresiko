import { forbidden, redirect } from 'next/navigation';
import { getSessionContext, type SessionContext } from '@/lib/auth/session';
import { evaluateMfaGate } from '@/lib/auth/mfa';

/** Apakah peran termasuk yang diizinkan. Murni, mudah diuji. */
export function roleAllowed(role: string | null | undefined, allowed: readonly string[]): boolean {
  return role != null && allowed.includes(role);
}

/**
 * Guard route berbasis peran:
 * - Tanpa sesi -> /login.
 * - Admin belum AAL2 -> /mfa/enroll|verify.
 * - Peran tidak diizinkan -> forbidden() (403 seragam, tanpa bocor info).
 */
export async function requireRole(allowed: readonly string[]): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx.user) redirect('/login');

  const gate = evaluateMfaGate({
    role: ctx.claims?.role ?? null,
    hasVerifiedFactor: ctx.hasVerifiedFactor,
    currentLevel: ctx.currentLevel,
  });
  if (gate === 'enroll') redirect('/mfa/enroll');
  if (gate === 'verify') redirect('/mfa/verify');

  if (!roleAllowed(ctx.claims?.role, allowed)) forbidden();
  return ctx;
}

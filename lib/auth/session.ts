import { createSupabaseServerClient } from '@/lib/supabase/server';
import { decodeClaims, type AppClaims } from '@/lib/supabase/claims';

/**
 * Konteks sesi + status MFA untuk keputusan gate & tampilan. Dikumpulkan sekali
 * di server (getUser terverifikasi + AAL + daftar faktor).
 */
export interface SessionContext {
  user: { id: string; email: string | null } | null;
  claims: AppClaims | null;
  currentLevel: string | null;
  hasVerifiedFactor: boolean;
  verifiedTotpFactorId: string | null;
}

export async function getSessionContext(): Promise<SessionContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      user: null,
      claims: null,
      currentLevel: null,
      hasVerifiedFactor: false,
      verifiedTotpFactorId: null,
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const claims = session ? decodeClaims(session.access_token) : null;

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = (factors?.totp ?? []).find((f) => f.status === 'verified') ?? null;

  return {
    user: { id: user.id, email: user.email ?? null },
    claims,
    currentLevel: aal?.currentLevel ?? null,
    hasVerifiedFactor: verified != null,
    verifiedTotpFactorId: verified?.id ?? null,
  };
}

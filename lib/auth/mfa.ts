/**
 * Kebijakan MFA (T-021): admin_tenant & admin_platform WAJIB TOTP. Peran lain
 * opsional. Logika gate murni agar mudah diuji; sisi server memberi input
 * (peran dari klaim, apakah ada faktor terverifikasi, AAL sesi saat ini).
 */

export const MFA_REQUIRED_ROLES = ['admin_tenant', 'admin_platform'] as const;

export function requiresMfa(role: string | null | undefined): boolean {
  return role != null && (MFA_REQUIRED_ROLES as readonly string[]).includes(role);
}

export type MfaGate = 'ok' | 'enroll' | 'verify';

export interface MfaGateInput {
  role: string | null;
  hasVerifiedFactor: boolean;
  currentLevel: string | null; // 'aal1' | 'aal2' | null
}

/**
 * Keputusan gate:
 * - Peran tak wajib MFA -> 'ok'.
 * - Sudah AAL2 -> 'ok'.
 * - Wajib MFA, punya faktor terverifikasi tapi belum AAL2 -> 'verify'.
 * - Wajib MFA, belum punya faktor -> 'enroll'.
 */
export function evaluateMfaGate({ role, hasVerifiedFactor, currentLevel }: MfaGateInput): MfaGate {
  if (!requiresMfa(role)) return 'ok';
  if (currentLevel === 'aal2') return 'ok';
  return hasVerifiedFactor ? 'verify' : 'enroll';
}

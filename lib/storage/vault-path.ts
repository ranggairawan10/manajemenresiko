/**
 * Aturan path bucket `vault` (T-015): objek disimpan pada prefix
 * `{tenant_id}/{user_id}/...`. Fungsi murni (mudah diuji) yang memutuskan apakah
 * pemanggil berhak atas sebuah path — dipakai server sebelum menerbitkan signed
 * URL, dan mencerminkan policy RLS `storage.objects`.
 */

export const VAULT_BUCKET = 'vault';
export const SIGNED_URL_TTL_SECONDS = 300; // <= 5 menit (aturan keamanan #5)

export interface VaultClaims {
  tenantId: string;
  userId: string;
  role: string | null;
}

/** Prefix path milik satu user di dalam tenant. */
export function vaultPrefix(tenantId: string, userId: string): string {
  return `${tenantId}/${userId}/`;
}

/** Validasi bentuk path: tenant/user/berkas, tanpa traversal atau segmen kosong. */
export function isValidVaultPath(path: string): boolean {
  if (typeof path !== 'string' || path.length === 0 || path.length > 1024) return false;
  if (path.startsWith('/') || path.includes('..') || path.includes('\\')) return false;
  const segments = path.split('/');
  if (segments.length < 3) return false; // minimal tenant/user/berkas
  return segments.every((s) => s.length > 0);
}

/**
 * Apakah pemanggil boleh mengakses (menerbitkan signed URL untuk) `path`.
 * - Path wajib berada dalam tenant pemanggil.
 * - admin_tenant boleh mengakses seluruh path tenantnya.
 * - Selain itu hanya path milik user sendiri.
 */
export function canAccessVaultPath(path: string, claims: VaultClaims): boolean {
  if (!isValidVaultPath(path)) return false;
  const [tenantSeg, userSeg] = path.split('/');
  if (tenantSeg !== claims.tenantId) return false;
  if (claims.role === 'admin_tenant') return true;
  return userSeg === claims.userId;
}

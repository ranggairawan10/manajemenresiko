/**
 * Ekstraksi custom claim (tenant_id, user_role) dari JWT Supabase. Klaim ini
 * top-level, disuntik oleh custom_access_token_hook (T-010). Token DIVERIFIKASI
 * lebih dulu via supabase.auth.getUser(); di sini payload hanya di-decode untuk
 * membaca klaim, tanpa memercayainya sebagai sumber autentikasi.
 */

export interface AppClaims {
  userId: string;
  tenantId: string | null;
  role: string | null;
}

export function decodeClaims(accessToken: string): AppClaims | null {
  const parts = accessToken.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      sub?: string;
      tenant_id?: string;
      user_role?: string;
    };
    if (!payload.sub) return null;
    return {
      userId: payload.sub,
      tenantId: payload.tenant_id ?? null,
      role: payload.user_role ?? null,
    };
  } catch {
    return null;
  }
}

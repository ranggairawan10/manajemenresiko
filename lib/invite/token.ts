import { createHash, randomBytes } from 'node:crypto';

/**
 * Token undangan sekali pakai (T-023). Token acak dikirim ke pengundang; DB
 * hanya menyimpan hash SHA-256 (tidak reversibel). Saat accept, token yang
 * dipresentasikan di-hash lalu dicocokkan. Kedaluwarsa 7 hari.
 */
export const INVITE_TTL_DAYS = 7;

export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function inviteExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

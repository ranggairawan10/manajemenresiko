import { emailSchema } from '@/lib/auth/password';

/**
 * Parsing & validasi CSV undangan (T-023). Kolom: email[,role]. Menghasilkan
 * daftar baris valid + laporan per baris (dedup dalam file & terhadap email yang
 * sudah ada). Murni & deterministik agar mudah diuji dan cepat (O(n)).
 */

export const INVITABLE_ROLES = ['peserta', 'asesor', 'admin_tenant'] as const;
export type InviteRole = (typeof INVITABLE_ROLES)[number];

export type InviteRowStatus = 'ok' | 'duplicate' | 'existing' | 'invalid_email' | 'invalid_role';

export interface InviteRowReport {
  line: number;
  email: string;
  role: string;
  status: InviteRowStatus;
}

export interface ParsedInvites {
  valid: { email: string; role: InviteRole }[];
  report: InviteRowReport[];
}

function isInvitableRole(role: string): role is InviteRole {
  return (INVITABLE_ROLES as readonly string[]).includes(role);
}

export function parseInviteCsv(
  text: string,
  opts: { existingEmails?: ReadonlySet<string> } = {},
): ParsedInvites {
  const existing = opts.existingEmails ?? new Set<string>();
  const rows = text.split(/\r?\n/).map((l) => l.trim());

  const valid: { email: string; role: InviteRole }[] = [];
  const report: InviteRowReport[] = [];
  const seen = new Set<string>();

  rows.forEach((raw, index) => {
    if (raw.length === 0) return; // lewati baris kosong
    const line = index + 1;
    const cols = raw.split(',').map((c) => c.trim());

    // Lewati header bila baris pertama tampak seperti judul kolom.
    if (index === 0 && /email/i.test(cols[0] ?? '')) return;

    const emailRaw = cols[0] ?? '';
    const roleRaw = (cols[1] ?? 'peserta').toLowerCase();

    const parsedEmail = emailSchema.safeParse(emailRaw);
    if (!parsedEmail.success) {
      report.push({ line, email: emailRaw, role: roleRaw, status: 'invalid_email' });
      return;
    }
    const email = parsedEmail.data;

    if (!isInvitableRole(roleRaw)) {
      report.push({ line, email, role: roleRaw, status: 'invalid_role' });
      return;
    }
    if (seen.has(email)) {
      report.push({ line, email, role: roleRaw, status: 'duplicate' });
      return;
    }
    if (existing.has(email)) {
      report.push({ line, email, role: roleRaw, status: 'existing' });
      return;
    }

    seen.add(email);
    valid.push({ email, role: roleRaw });
    report.push({ line, email, role: roleRaw, status: 'ok' });
  });

  return { valid, report };
}

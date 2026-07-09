'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireAdminTenant } from '@/lib/auth/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { emailSchema } from '@/lib/auth/password';
import { rateLimit } from '@/lib/auth/rate-limit';
import { generateInviteToken, hashInviteToken, inviteExpiry } from '@/lib/invite/token';
import { INVITABLE_ROLES, parseInviteCsv, type InviteRowReport } from '@/lib/invite/csv';

const MAX_CSV_BYTES = 2 * 1024 * 1024;
const WINDOW_MS = 15 * 60 * 1000;

export interface InviteState {
  error?: string;
  link?: string;
  report?: InviteRowReport[];
  summary?: { total: number; created: number; skipped: number };
}

async function origin(): Promise<string> {
  const h = await headers();
  return h.get('origin') ?? `https://${h.get('host') ?? ''}`;
}

async function existingPendingEmails(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<Set<string>> {
  const { data } = await supabase.from('invitations').select('email').is('used_at', null);
  return new Set((data ?? []).map((r: { email: string }) => r.email.toLowerCase()));
}

export async function inviteSingle(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const ctx = await requireAdminTenant();
  const tenantId = ctx.claims!.tenantId!;

  const email = emailSchema.safeParse(formData.get('email'));
  const role = String(formData.get('role') ?? 'peserta');
  if (!email.success) return { error: 'Email tidak valid.' };
  if (!(INVITABLE_ROLES as readonly string[]).includes(role))
    return { error: 'Peran tidak valid.' };

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit(`invite:ip:${ip}`, { limit: 30, windowMs: WINDOW_MS }).allowed) {
    return { error: 'Terlalu banyak permintaan. Coba lagi nanti.' };
  }

  const token = generateInviteToken();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('invitations').insert({
    tenant_id: tenantId,
    email: email.data,
    role,
    token_hash: hashInviteToken(token),
    expires_at: inviteExpiry().toISOString(),
    created_by: ctx.user!.id,
  });
  if (error) return { error: 'Gagal membuat undangan.' };

  revalidatePath('/admin/invitations');
  // Email dikirim di T-061; sementara tampilkan link untuk didistribusikan.
  return { link: `${await origin()}/accept?token=${token}` };
}

export async function inviteCsv(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const ctx = await requireAdminTenant();
  const tenantId = ctx.claims!.tenantId!;

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Pilih berkas CSV.' };
  if (file.size > MAX_CSV_BYTES) return { error: 'Berkas melebihi 2MB.' };

  const supabase = await createSupabaseServerClient();
  const existing = await existingPendingEmails(supabase);
  const { valid, report } = parseInviteCsv(await file.text(), { existingEmails: existing });

  if (valid.length > 0) {
    const rows = valid.map((v) => ({
      tenant_id: tenantId,
      email: v.email,
      role: v.role,
      token_hash: hashInviteToken(generateInviteToken()),
      expires_at: inviteExpiry().toISOString(),
      created_by: ctx.user!.id,
    }));
    const { error } = await supabase.from('invitations').insert(rows);
    if (error) return { error: 'Gagal menyimpan sebagian undangan.', report };
  }

  revalidatePath('/admin/invitations');
  return {
    report,
    summary: { total: report.length, created: valid.length, skipped: report.length - valid.length },
  };
}

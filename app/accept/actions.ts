'use server';

import { redirect } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { hashInviteToken } from '@/lib/invite/token';
import { passwordSchema } from '@/lib/auth/password';

/**
 * Menerima undangan: validasi token (hash + belum dipakai + belum kedaluwarsa),
 * buat akun auth + profil (service role, sekali), lalu tandai undangan terpakai.
 */
export async function acceptInvite(formData: FormData): Promise<void> {
  const token = String(formData.get('token') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const password = passwordSchema.safeParse(formData.get('password'));
  const url = (code: string) => `/accept?token=${encodeURIComponent(token)}&error=${code}`;
  if (!token || !password.success) redirect(url('invalid'));

  const admin = createSupabaseAdminClient();
  const { data: inv } = await admin
    .from('invitations')
    .select('id, email, role, tenant_id, expires_at, used_at')
    .eq('token_hash', hashInviteToken(token))
    .maybeSingle();
  if (!inv || inv.used_at || new Date(inv.expires_at).getTime() < Date.now()) {
    redirect(url('expired'));
  }

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: inv.email,
    password: password.data,
    email_confirm: true,
  });
  if (cErr || !created || !created.user) redirect(url('account'));

  const { error: pErr } = await admin.from('profiles').insert({
    user_id: created.user.id,
    tenant_id: inv.tenant_id,
    role: inv.role,
    full_name: fullName.length > 0 ? fullName : null,
    status: 'active',
  });
  if (pErr) redirect(url('profile'));

  await admin.from('invitations').update({ used_at: new Date().toISOString() }).eq('id', inv.id);

  redirect('/login?accepted=1');
}

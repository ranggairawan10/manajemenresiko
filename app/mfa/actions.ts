'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const CODE_RE = /^\d{6}$/;

/** Verifikasi kode saat enrollment faktor baru (factorId dari halaman enroll). */
export async function verifyEnrollment(formData: FormData): Promise<void> {
  const factorId = String(formData.get('factorId') ?? '');
  const code = String(formData.get('code') ?? '').trim();
  if (!factorId || !CODE_RE.test(code)) redirect('/mfa/enroll?error=code');

  const supabase = await createSupabaseServerClient();
  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
  if (cErr || !challenge) redirect('/mfa/enroll?error=challenge');

  const { error: vErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (vErr) redirect('/mfa/enroll?error=code');

  redirect('/sesi');
}

/** Verifikasi kode untuk faktor terverifikasi yang sudah ada (naik ke AAL2). */
export async function verifyChallenge(formData: FormData): Promise<void> {
  const factorId = String(formData.get('factorId') ?? '');
  const code = String(formData.get('code') ?? '').trim();
  if (!factorId || !CODE_RE.test(code)) redirect('/mfa/verify?error=code');

  const supabase = await createSupabaseServerClient();
  const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
  if (cErr || !challenge) redirect('/mfa/verify?error=challenge');

  const { error: vErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (vErr) redirect('/mfa/verify?error=code');

  redirect('/sesi');
}

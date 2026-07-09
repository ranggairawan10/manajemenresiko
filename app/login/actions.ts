'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { emailSchema, loginSchema } from '@/lib/auth/password';
import { rateLimit } from '@/lib/auth/rate-limit';

const WINDOW_MS = 15 * 60 * 1000; // 15 menit

async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get('x-forwarded-for');
  return (fwd?.split(',')[0] ?? 'unknown').trim() || 'unknown';
}

export async function loginWithPassword(formData: FormData): Promise<void> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) redirect('/login?error=invalid');

  const ip = await clientIp();
  const ipLimit = rateLimit(`login:ip:${ip}`, { limit: 10, windowMs: WINDOW_MS });
  const accountLimit = rateLimit(`login:acc:${parsed.data.email}`, {
    limit: 5,
    windowMs: WINDOW_MS,
  });
  if (!ipLimit.allowed || !accountLimit.allowed) redirect('/login?error=rate');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Pesan seragam agar tidak membocorkan keberadaan akun.
  if (error) redirect('/login?error=credentials');

  redirect('/sesi');
}

export async function loginWithMagicLink(formData: FormData): Promise<void> {
  const parsed = emailSchema.safeParse(formData.get('email'));
  if (!parsed.success) redirect('/login?error=invalid');

  const ip = await clientIp();
  if (!rateLimit(`magic:ip:${ip}`, { limit: 5, windowMs: WINDOW_MS }).allowed) {
    redirect('/login?error=rate');
  }

  const h = await headers();
  const origin = h.get('origin') ?? `https://${h.get('host') ?? ''}`;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect('/login?error=magic');

  redirect('/login?sent=1');
}

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

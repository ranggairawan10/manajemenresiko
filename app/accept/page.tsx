import type { Metadata } from 'next';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { hashInviteToken } from '@/lib/invite/token';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/password';
import { acceptInvite } from './actions';

export const metadata: Metadata = { title: 'Terima Undangan — Manajemen Resiko' };

const inputCls =
  'rounded-md border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-teal';

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-3 px-6 py-12 text-center">
      <h1 className="text-xl font-bold text-navy">Undangan</h1>
      <p className="rounded-md bg-danger-tint px-4 py-3 text-sm text-danger-deep">{children}</p>
    </main>
  );
}

export default async function AcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  if (!token) return <Notice>Tautan undangan tidak lengkap.</Notice>;

  const admin = createSupabaseAdminClient();
  const { data: inv } = await admin
    .from('invitations')
    .select('email, role, expires_at, used_at')
    .eq('token_hash', hashInviteToken(token))
    .maybeSingle();

  const valid = inv && !inv.used_at && new Date(inv.expires_at).getTime() > Date.now();
  if (!valid) return <Notice>Undangan tidak valid, sudah dipakai, atau kedaluwarsa.</Notice>;

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-5 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-label text-teal">Terima undangan</p>
        <h1 className="text-2xl font-bold text-navy">Buat akun Anda</h1>
        <p className="text-sm text-ink-2">
          Untuk <span className="font-mono text-ink">{inv.email}</span> · peran {inv.role}
        </p>
      </header>

      {error && (
        <p className="rounded-md bg-danger-tint px-4 py-3 text-sm text-danger-deep" role="alert">
          {error === 'account'
            ? 'Akun dengan email ini mungkin sudah ada.'
            : error === 'invalid'
              ? 'Kata sandi minimal 12 karakter.'
              : 'Gagal memproses undangan.'}
        </p>
      )}

      <form action={acceptInvite} className="flex flex-col gap-3">
        <input type="hidden" name="token" value={token} />
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Nama lengkap
          <input name="full_name" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Kata sandi (min. {MIN_PASSWORD_LENGTH} karakter)
          <input
            name="password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className={inputCls}
          />
        </label>
        <button
          type="submit"
          className="mt-1 rounded-md bg-teal px-4 py-2 font-semibold text-white shadow-e-cyan transition hover:bg-teal-600"
        >
          Terima & buat akun
        </button>
      </form>
    </main>
  );
}

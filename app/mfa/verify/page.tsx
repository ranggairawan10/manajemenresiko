import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/auth/session';
import { verifyChallenge } from '../actions';

export const metadata: Metadata = { title: 'Verifikasi MFA — Manajemen Resiko' };

export default async function MfaVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx.user) redirect('/login');
  if (!ctx.verifiedTotpFactorId) redirect('/mfa/enroll');

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-5 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-label text-teal">Verifikasi</p>
        <h1 className="text-2xl font-bold text-navy">Masukkan kode authenticator</h1>
        <p className="text-sm text-ink-2">
          Buka aplikasi authenticator Anda dan masukkan kode 6 digit.
        </p>
      </header>

      {error && (
        <p className="rounded-md bg-danger-tint px-4 py-3 text-sm text-danger-deep" role="alert">
          Kode salah atau kedaluwarsa. Coba lagi.
        </p>
      )}

      <form action={verifyChallenge} className="flex flex-col gap-3">
        <input type="hidden" name="factorId" value={ctx.verifiedTotpFactorId} />
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Kode 6 digit
          <input
            name="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            className="rounded-md border border-border bg-surface px-3 py-2 font-mono tracking-widest text-ink outline-none focus:border-teal"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-teal px-4 py-2 font-semibold text-white shadow-e-cyan transition hover:bg-teal-600"
        >
          Verifikasi
        </button>
      </form>
    </main>
  );
}

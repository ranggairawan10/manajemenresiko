import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { verifyEnrollment } from '../actions';

export const metadata: Metadata = { title: 'Aktifkan MFA — Manajemen Resiko' };

export default async function MfaEnrollPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Bersihkan faktor TOTP yang belum terverifikasi agar tidak menumpuk.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const f of factors?.totp ?? []) {
    if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data: enrolled, error: enrollErr } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
  });

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-5 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-label text-teal">Keamanan akun</p>
        <h1 className="text-2xl font-bold text-navy">Aktifkan autentikasi dua faktor</h1>
        <p className="text-sm text-ink-2">
          Peran admin wajib MFA. Pindai QR dengan aplikasi authenticator (mis. Google
          Authenticator), lalu masukkan kode 6 digit.
        </p>
      </header>

      {error && (
        <p className="rounded-md bg-danger-tint px-4 py-3 text-sm text-danger-deep" role="alert">
          Kode salah atau kedaluwarsa. Coba lagi.
        </p>
      )}

      {enrollErr || !enrolled ? (
        <p className="rounded-md bg-danger-tint px-4 py-3 text-sm text-danger-deep">
          Gagal memulai pendaftaran MFA. Muat ulang halaman.
        </p>
      ) : (
        <>
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-5 shadow-e1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrolled.totp.qr_code} alt="QR kode TOTP" className="h-48 w-48" />
            <p className="text-center text-xs text-ink-3">
              Tidak bisa memindai? Masukkan kunci ini manual:
              <br />
              <span className="font-mono break-all text-ink-2">{enrolled.totp.secret}</span>
            </p>
          </div>

          <form action={verifyEnrollment} className="flex flex-col gap-3">
            <input type="hidden" name="factorId" value={enrolled.id} />
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
              Verifikasi & aktifkan
            </button>
          </form>
        </>
      )}
    </main>
  );
}

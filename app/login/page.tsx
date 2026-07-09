import type { Metadata } from 'next';
import { loginWithMagicLink, loginWithPassword } from './actions';

export const metadata: Metadata = {
  title: 'Masuk — Manajemen Resiko',
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid: 'Periksa kembali email dan kata sandi Anda.',
  credentials: 'Email atau kata sandi salah.',
  rate: 'Terlalu banyak percobaan. Coba lagi beberapa saat.',
  magic: 'Gagal mengirim tautan masuk. Coba lagi.',
  auth: 'Sesi tidak dapat dibuat. Silakan masuk kembali.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; accepted?: string }>;
}) {
  const { error, sent, accepted } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'Terjadi kesalahan.') : null;

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-label text-teal">Manajemen Resiko</p>
        <h1 className="text-2xl font-bold text-navy">Masuk</h1>
        <p className="text-sm text-ink-2">Platform pembekalan sertifikasi & vault SMR.</p>
      </header>

      {errorMessage && (
        <p className="rounded-md bg-danger-tint px-4 py-3 text-sm text-danger-deep" role="alert">
          {errorMessage}
        </p>
      )}
      {sent && (
        <p className="rounded-md bg-success-tint px-4 py-3 text-sm text-success-deep" role="status">
          Tautan masuk telah dikirim ke email Anda (berlaku sementara).
        </p>
      )}
      {accepted && (
        <p className="rounded-md bg-success-tint px-4 py-3 text-sm text-success-deep" role="status">
          Akun berhasil dibuat. Silakan masuk.
        </p>
      )}

      <form action={loginWithPassword} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-md border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-teal"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Kata sandi
          <input
            type="password"
            name="password"
            required
            minLength={12}
            autoComplete="current-password"
            className="rounded-md border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-teal"
          />
        </label>
        <button
          type="submit"
          className="mt-1 rounded-md bg-teal px-4 py-2 font-semibold text-white shadow-e-cyan transition hover:bg-teal-600"
        >
          Masuk
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-ink-3">
        <span className="h-px flex-1 bg-border" />
        atau
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={loginWithMagicLink} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Email untuk tautan masuk
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded-md border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-teal"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-border-strong px-4 py-2 font-semibold text-navy transition hover:bg-surface-2"
        >
          Kirim tautan masuk
        </button>
      </form>
    </main>
  );
}

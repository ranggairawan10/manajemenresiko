import Link from 'next/link';

/** 403 seragam — pesan generik tanpa detail peran/resource. */
export default function Forbidden() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p className="text-xs font-semibold uppercase tracking-label text-ink-3">403</p>
      <h1 className="text-2xl font-bold text-navy">Akses ditolak</h1>
      <p className="text-sm text-ink-2">Anda tidak memiliki izin untuk membuka halaman ini.</p>
      <Link href="/sesi" className="mt-2 text-sm font-semibold text-teal">
        Kembali ke beranda
      </Link>
    </main>
  );
}

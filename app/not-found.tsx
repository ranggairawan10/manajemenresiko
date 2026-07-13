import Link from 'next/link';

/** 404 seragam — tidak membocorkan apakah resource ada atau hak akses. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p className="text-xs font-semibold uppercase tracking-label text-ink-3">404</p>
      <h1 className="text-2xl font-bold text-navy">Halaman tidak ditemukan</h1>
      <p className="text-sm text-ink-2">
        Halaman atau data yang Anda cari tidak tersedia atau tidak dapat diakses.
      </p>
      <Link href="/sesi" className="mt-2 text-sm font-semibold text-teal">
        Kembali ke beranda
      </Link>
    </main>
  );
}

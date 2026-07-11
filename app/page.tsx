import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <h1 className="text-3xl font-bold text-navy">Manajemen Resiko</h1>
      <p className="max-w-2xl leading-relaxed text-ink-2">
        Platform pembekalan sertifikasi &amp; pengelolaan SMR perbankan Indonesia. Design System
        v5.2 &amp; theming Tailwind aktif (T-002).
      </p>
      <Link
        href="/styleguide"
        className="mt-2 rounded-md bg-teal px-4 py-2 font-semibold text-white shadow-e-cyan transition hover:bg-teal-600"
      >
        Lihat Styleguide
      </Link>
    </main>
  );
}

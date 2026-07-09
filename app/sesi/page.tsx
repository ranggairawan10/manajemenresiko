import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { decodeClaims } from '@/lib/supabase/claims';
import { logout } from '@/app/login/actions';

export const metadata: Metadata = {
  title: 'Sesi — Manajemen Resiko',
};

const ROLE_LABEL: Record<string, string> = {
  peserta: 'Peserta',
  asesor: 'Asesor',
  admin_tenant: 'Admin Tenant',
  admin_platform: 'Admin Platform',
};

export default async function SesiPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const claims = session ? decodeClaims(session.access_token) : null;

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-label text-teal">Sesi aktif</p>
        <h1 className="text-2xl font-bold text-navy">Selamat datang</h1>
      </header>

      <dl className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-e1">
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-ink-3">Email</dt>
          <dd className="font-mono text-sm text-ink">{user.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-ink-3">Peran</dt>
          <dd className="text-sm font-semibold text-ink">
            {claims?.role ? (ROLE_LABEL[claims.role] ?? claims.role) : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-ink-3">Tenant</dt>
          <dd className="font-mono text-xs text-ink-2">{claims?.tenantId ?? '—'}</dd>
        </div>
      </dl>

      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-danger-deep transition hover:bg-danger-tint"
        >
          Keluar
        </button>
      </form>
    </main>
  );
}

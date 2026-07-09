import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminPlatform } from '@/lib/auth/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createTenant } from './actions';

export const metadata: Metadata = { title: 'Kelola Tenant — Manajemen Resiko' };

const NOTICE: Record<string, string> = {
  created: 'Tenant berhasil dibuat.',
  updated: 'Tenant berhasil diperbarui.',
};
const ERRORS: Record<string, string> = {
  invalid: 'Data tidak valid. Periksa kembali isian.',
  duplicate: 'Slug sudah dipakai tenant lain.',
  save: 'Gagal menyimpan. Coba lagi.',
};

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  accent_color: string | null;
  status: string;
}

const inputCls =
  'rounded-md border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-teal';

export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; updated?: string }>;
}) {
  await requireAdminPlatform();
  const { error, created, updated } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, accent_color, status')
    .order('created_at', { ascending: false });

  const notice = created ? NOTICE.created : updated ? NOTICE.updated : null;

  return (
    <main className="mx-auto flex max-w-content flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-label text-teal">Admin Platform</p>
        <h1 className="text-2xl font-bold text-navy">Kelola Tenant</h1>
      </header>

      {notice && (
        <p className="rounded-md bg-success-tint px-4 py-3 text-sm text-success-deep" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-md bg-danger-tint px-4 py-3 text-sm text-danger-deep" role="alert">
          {ERRORS[error] ?? 'Terjadi kesalahan.'}
        </p>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-label text-ink-3">Daftar tenant</h2>
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {(tenants as TenantRow[] | null)?.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ backgroundColor: t.accent_color ?? 'var(--color-teal)' }}
                />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">{t.name}</span>
                  <span className="font-mono text-xs text-ink-3">{t.slug}</span>
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-ink-3">{t.status}</span>
                <Link
                  href={`/admin/tenants/${t.id}/edit`}
                  className="text-sm font-semibold text-teal"
                >
                  Ubah
                </Link>
              </span>
            </li>
          )) ?? null}
          {(!tenants || tenants.length === 0) && (
            <li className="px-4 py-6 text-center text-sm text-ink-3">Belum ada tenant.</li>
          )}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-label text-ink-3">Tenant baru</h2>
        <form action={createTenant} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-ink-2">
            Nama
            <input name="name" required minLength={2} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-2">
            Slug
            <input
              name="slug"
              required
              placeholder="bank-abc"
              className={`${inputCls} font-mono`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-2">
            Warna aksen (hex)
            <input name="accent_color" placeholder="#0FA3B1" className={`${inputCls} font-mono`} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-2">
            URL logo
            <input name="logo_url" type="url" placeholder="https://…" className={inputCls} />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-teal px-4 py-2 font-semibold text-white shadow-e-cyan transition hover:bg-teal-600"
            >
              Buat tenant
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

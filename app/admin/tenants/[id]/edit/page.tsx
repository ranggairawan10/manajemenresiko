import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminPlatform } from '@/lib/auth/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { TenantTheme } from '@/components/tenant-theme';
import { updateTenant } from '../../actions';

export const metadata: Metadata = { title: 'Ubah Tenant — Manajemen Resiko' };

const inputCls =
  'rounded-md border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-teal';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  accent_color: string | null;
  logo_url: string | null;
  status: string;
}

export default async function EditTenantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminPlatform();
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, accent_color, logo_url, status')
    .eq('id', id)
    .maybeSingle();
  if (!tenant) notFound();
  const t = tenant as TenantRow;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-12">
      {/* Pratinjau theming: aksen tenant meng-override --color-teal di scope ini. */}
      <TenantTheme accent={t.accent_color} />

      <header className="flex flex-col gap-1">
        <Link href="/admin/tenants" className="text-xs font-semibold text-teal">
          ← Kelola Tenant
        </Link>
        <h1 className="text-2xl font-bold text-navy">Ubah {t.name}</h1>
      </header>

      {error && (
        <p className="rounded-md bg-danger-tint px-4 py-3 text-sm text-danger-deep" role="alert">
          {error === 'invalid' ? 'Data tidak valid.' : 'Gagal menyimpan.'}
        </p>
      )}

      <form action={updateTenant} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={t.id} />
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Nama
          <input name="name" defaultValue={t.name} required className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Slug
          <input name="slug" defaultValue={t.slug} required className={`${inputCls} font-mono`} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Warna aksen (hex)
          <input
            name="accent_color"
            defaultValue={t.accent_color ?? ''}
            placeholder="#0FA3B1"
            className={`${inputCls} font-mono`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          URL logo
          <input name="logo_url" type="url" defaultValue={t.logo_url ?? ''} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-2">
          Status
          <select name="status" defaultValue={t.status} className={inputCls}>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
          </select>
        </label>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="rounded-md bg-teal px-4 py-2 font-semibold text-white shadow-e-cyan transition hover:bg-teal-600"
          >
            Simpan
          </button>
          <span className="text-xs text-ink-3">Tombol memakai warna aksen tenant (pratinjau).</span>
        </div>
      </form>
    </main>
  );
}

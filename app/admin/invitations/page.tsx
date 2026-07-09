import type { Metadata } from 'next';
import { requireAdminTenant } from '@/lib/auth/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { InviteForms } from './invite-forms';

export const metadata: Metadata = { title: 'Undangan — Manajemen Resiko' };

interface InvitationRow {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  used_at: string | null;
}

export default async function InvitationsPage() {
  await requireAdminTenant();

  const supabase = await createSupabaseServerClient();
  const { data: invitations } = await supabase
    .from('invitations')
    .select('id, email, role, expires_at, used_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto flex max-w-content flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-label text-teal">Admin Tenant</p>
        <h1 className="text-2xl font-bold text-navy">Undangan pengguna</h1>
      </header>

      <InviteForms />

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-label text-ink-3">
          Undangan terbaru
        </h2>
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {(invitations as InvitationRow[] | null)?.map((inv) => {
            const expired = new Date(inv.expires_at).getTime() < Date.now();
            const status = inv.used_at ? 'diterima' : expired ? 'kedaluwarsa' : 'menunggu';
            return (
              <li key={inv.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="flex flex-col">
                  <span className="text-sm text-ink">{inv.email}</span>
                  <span className="font-mono text-xs text-ink-3">{inv.role}</span>
                </span>
                <span className="text-xs text-ink-3">{status}</span>
              </li>
            );
          }) ?? null}
          {(!invitations || invitations.length === 0) && (
            <li className="px-4 py-6 text-center text-sm text-ink-3">Belum ada undangan.</li>
          )}
        </ul>
      </section>
    </main>
  );
}

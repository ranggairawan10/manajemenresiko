'use client';

import { useActionState } from 'react';
import { inviteCsv, inviteSingle, type InviteState } from './actions';
import { INVITABLE_ROLES } from '@/lib/invite/csv';

const initial: InviteState = {};

const inputCls =
  'rounded-md border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-teal';

const STATUS_STYLE: Record<string, string> = {
  ok: 'bg-success-tint text-success-deep',
  duplicate: 'bg-warning-tint text-warning-deep',
  existing: 'bg-warning-tint text-warning-deep',
  invalid_email: 'bg-danger-tint text-danger-deep',
  invalid_role: 'bg-danger-tint text-danger-deep',
};

export function InviteForms() {
  const [single, singleAction, singlePending] = useActionState(inviteSingle, initial);
  const [csv, csvAction, csvPending] = useActionState(inviteCsv, initial);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-label text-ink-3">Undang satu</h2>
        <form action={singleAction} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            name="email"
            type="email"
            required
            placeholder="email@bank.co.id"
            className={inputCls}
          />
          <select name="role" defaultValue="peserta" className={inputCls}>
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={singlePending}
            className="rounded-md bg-teal px-4 py-2 font-semibold text-white shadow-e-cyan transition hover:bg-teal-600 disabled:opacity-60"
          >
            {singlePending ? 'Mengirim…' : 'Undang'}
          </button>
        </form>
        {single.error && <p className="text-sm text-danger-deep">{single.error}</p>}
        {single.link && (
          <p className="rounded-md bg-success-tint px-4 py-3 text-sm text-success-deep">
            Undangan dibuat. Tautan (dikirim via email di produksi):
            <br />
            <span className="font-mono break-all text-xs">{single.link}</span>
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-label text-ink-3">
          Unggah CSV (email,role — maks 2MB)
        </h2>
        <form action={csvAction} className="flex flex-wrap items-center gap-3">
          <input
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="text-sm text-ink-2"
          />
          <button
            type="submit"
            disabled={csvPending}
            className="rounded-md border border-border-strong px-4 py-2 font-semibold text-navy transition hover:bg-surface-2 disabled:opacity-60"
          >
            {csvPending ? 'Memproses…' : 'Proses CSV'}
          </button>
        </form>
        {csv.error && <p className="text-sm text-danger-deep">{csv.error}</p>}
        {csv.summary && (
          <p className="text-sm text-ink-2">
            Total {csv.summary.total} · dibuat{' '}
            <span className="font-semibold text-success-deep">{csv.summary.created}</span> ·
            dilewati <span className="font-semibold text-warning-deep">{csv.summary.skipped}</span>
          </p>
        )}
        {csv.report && csv.report.length > 0 && (
          <div className="max-h-80 overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-2 text-xs uppercase tracking-label text-ink-3">
                <tr>
                  <th className="px-3 py-2">Baris</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Peran</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {csv.report.map((r) => (
                  <tr key={r.line} className="border-t border-border">
                    <td className="px-3 py-1.5 font-mono text-xs text-ink-3">{r.line}</td>
                    <td className="px-3 py-1.5 text-ink">{r.email}</td>
                    <td className="px-3 py-1.5 text-ink-2">{r.role}</td>
                    <td className="px-3 py-1.5">
                      <span
                        className={`rounded-sm px-2 py-0.5 font-mono text-xs ${STATUS_STYLE[r.status] ?? ''}`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

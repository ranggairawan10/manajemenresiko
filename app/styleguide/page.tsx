import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Styleguide — Manajemen Resiko',
  description: 'Demo token Design System v5.2 (warna, radius, elevasi, motion, tipografi).',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-label text-ink-3">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ cls, name }: { cls: string; name: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={`h-14 w-full rounded-md border border-border ${cls}`} />
      <span className="font-mono text-xs text-ink-2">{name}</span>
    </div>
  );
}

const brand = [
  { cls: 'bg-navy', name: 'navy' },
  { cls: 'bg-navy-700', name: 'navy-700' },
  { cls: 'bg-teal', name: 'teal' },
  { cls: 'bg-teal-600', name: 'teal-600' },
  { cls: 'bg-teal-700', name: 'teal-700' },
  { cls: 'bg-cyan', name: 'cyan' },
  { cls: 'bg-cyan-600', name: 'cyan-600' },
  { cls: 'bg-cyan-700', name: 'cyan-700' },
];

const neutrals = [
  { cls: 'bg-n0', name: 'n0' },
  { cls: 'bg-n50', name: 'n50' },
  { cls: 'bg-n100', name: 'n100' },
  { cls: 'bg-n200', name: 'n200' },
  { cls: 'bg-n300', name: 'n300' },
  { cls: 'bg-n400', name: 'n400' },
  { cls: 'bg-n500', name: 'n500' },
  { cls: 'bg-n600', name: 'n600' },
  { cls: 'bg-n700', name: 'n700' },
  { cls: 'bg-n800', name: 'n800' },
  { cls: 'bg-n900', name: 'n900' },
];

const semantic = [
  { base: 'bg-success', tint: 'bg-success-tint', deep: 'text-success-deep', name: 'success' },
  { base: 'bg-warning', tint: 'bg-warning-tint', deep: 'text-warning-deep', name: 'warning' },
  { base: 'bg-danger', tint: 'bg-danger-tint', deep: 'text-danger-deep', name: 'danger' },
  { base: 'bg-info', tint: 'bg-info-tint', deep: 'text-info-deep', name: 'info' },
  { base: 'bg-purple', tint: 'bg-purple-tint', deep: 'text-purple-deep', name: 'purple' },
  { base: 'bg-slate', tint: 'bg-slate-tint', deep: 'text-slate-deep', name: 'slate' },
];

const radii = [
  { cls: 'rounded-xs', name: 'xs · 6px' },
  { cls: 'rounded-sm', name: 'sm · 9px' },
  { cls: 'rounded-md', name: 'md · 13px' },
  { cls: 'rounded-lg', name: 'lg · 18px' },
  { cls: 'rounded-xl', name: 'xl · 26px' },
  { cls: 'rounded-full', name: 'full' },
];

const shadows = [
  { cls: 'shadow-e1', name: 'e1 · resting' },
  { cls: 'shadow-e2', name: 'e2 · hover' },
  { cls: 'shadow-e3', name: 'e3 · modal' },
  { cls: 'shadow-e-cyan', name: 'e-cyan · glow' },
];

const gradients = [
  { cls: 'bg-grad-hero', name: 'grad-hero' },
  { cls: 'bg-grad-vivid', name: 'grad-vivid' },
  { cls: 'bg-grad-deep', name: 'grad-deep' },
  { cls: 'bg-grad-soft', name: 'grad-soft' },
];

const weights = [
  { cls: 'font-extralight', name: '200' },
  { cls: 'font-light', name: '300' },
  { cls: 'font-normal', name: '400' },
  { cls: 'font-medium', name: '500' },
  { cls: 'font-semibold', name: '600' },
  { cls: 'font-bold', name: '700' },
  { cls: 'font-extrabold', name: '800' },
];

export default function StyleguidePage() {
  return (
    <main className="mx-auto max-w-content px-6 py-12">
      <header className="mb-10 flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-label text-teal">
          Design System v5.2
        </p>
        <h1 className="text-3xl font-bold text-navy">Styleguide Token</h1>
        <p className="max-w-2xl text-ink-2">
          Demo token dari <code className="font-mono text-sm">app/globals.css</code> — satu-satunya
          sumber token. Semua elemen di halaman ini memakai utility Tailwind hasil{' '}
          <code>@theme</code>, tanpa hex hardcode.
        </p>
      </header>

      <div className="flex flex-col gap-12">
        <Section title="Warna brand">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {brand.map((s) => (
              <Swatch key={s.name} cls={s.cls} name={s.name} />
            ))}
          </div>
        </Section>

        <Section title="Netral">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 lg:grid-cols-11">
            {neutrals.map((s) => (
              <Swatch key={s.name} cls={s.cls} name={s.name} />
            ))}
          </div>
        </Section>

        <Section title="Semantik (dasar + tint/deep)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {semantic.map((s) => (
              <div key={s.name} className="flex flex-col gap-1.5">
                <div className={`h-10 w-full rounded-md ${s.base}`} />
                <span
                  className={`rounded-sm px-2 py-1 text-center font-mono text-xs ${s.tint} ${s.deep}`}
                >
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Radius">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {radii.map((r) => (
              <div key={r.name} className="flex flex-col items-center gap-2">
                <div className={`h-16 w-16 border border-border-strong bg-surface-3 ${r.cls}`} />
                <span className="font-mono text-xs text-ink-2">{r.name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Elevasi">
          <div className="grid grid-cols-2 gap-6 rounded-lg bg-surface-2 p-6 sm:grid-cols-4">
            {shadows.map((s) => (
              <div key={s.name} className="flex flex-col items-center gap-2">
                <div className={`h-16 w-full rounded-md bg-surface ${s.cls}`} />
                <span className="font-mono text-xs text-ink-2">{s.name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Gradien">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gradients.map((g) => (
              <div key={g.name} className="flex flex-col gap-1.5">
                <div className={`h-16 w-full rounded-lg ${g.cls}`} />
                <span className="font-mono text-xs text-ink-2">{g.name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Motion (hover swatch)">
          <div className="flex flex-wrap gap-8">
            <div className="group flex flex-col gap-2">
              <div className="h-16 w-40 overflow-hidden rounded-md bg-surface-3">
                <div className="h-full w-16 rounded-md bg-teal transition-transform duration-500 ease-smooth group-hover:translate-x-24" />
              </div>
              <span className="font-mono text-xs text-ink-2">ease-smooth</span>
            </div>
            <div className="group flex flex-col gap-2">
              <div className="h-16 w-40 overflow-hidden rounded-md bg-surface-3">
                <div className="h-full w-16 rounded-md bg-cyan transition-transform duration-500 ease-spring group-hover:translate-x-24" />
              </div>
              <span className="font-mono text-xs text-ink-2">ease-spring</span>
            </div>
          </div>
        </Section>

        <Section title="Tipografi">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              {weights.map((w) => (
                <p key={w.name} className={`text-lg text-ink ${w.cls}`}>
                  <span className="font-mono text-xs text-ink-3">PJS {w.name}</span> — Manajemen
                  Resiko SMR Perbankan
                </p>
              ))}
            </div>
            <p className="font-display text-4xl font-extrabold text-navy">
              Display / KPI 92<span className="text-teal">%</span>
            </p>
            <p className="font-mono text-sm text-ink-2">Mono — Sertifikat: 000-KKNI-5-2026</p>
            <p className="text-xs font-semibold uppercase tracking-label text-ink-3">
              Label kecil · uppercase · tracking .06em
            </p>
          </div>
        </Section>
      </div>
    </main>
  );
}

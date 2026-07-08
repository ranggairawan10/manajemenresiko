# Manajemen Resiko

Platform training, refreshment tahunan, dan pengelolaan masa berlaku Sertifikat
Manajemen Risiko (SMR) untuk SDM perbankan Indonesia (konvensional & syariah).
Multi tenant. PWA.

Mulai dari sini:
1. `CLAUDE.md` - aturan kerja & keamanan repo (wajib dibaca Claude Code tiap sesi)
2. `TASKS.md` - antrean kerja Fase 0 -> Fase 1
3. `manajemen-resiko-prompts-claude-code.md` - template prompt sesi
4. `docs/manajemen-resiko-prd.md`, `docs/manajemen-resiko-tech-spec.md`, `docs/adr/` - sumber kebenaran produk & arsitektur
5. `docs/regulasi/` - ringkasan regulasi (SEOJK 28/2022 dkk)
6. `.env.example` - salin ke `.env.local`, isi bagian rahasia secara lokal

Stack: Next.js (App Router, TS) di Vercel + Supabase (ap-southeast-1).
Keamanan: lihat CLAUDE.md butir "Aturan keamanan" dan docs/manajemen-resiko-prd.md bab 9/10.

## Pengembangan lokal

```bash
corepack pnpm install     # pnpm via corepack (aktifkan sekali: sudo corepack enable)
corepack pnpm dev         # http://localhost:3000
corepack pnpm typecheck && corepack pnpm lint && corepack pnpm test
```

## Migrasi Supabase

Supabase CLI terpasang sebagai devDependency. Buat migrasi baru dan push ke
Postgres 15 staging (ap-southeast-1):

```bash
corepack pnpm db:new nama_migrasi     # buat file supabase/migrations/<ts>_nama_migrasi.sql
corepack pnpm db:push --linked        # butuh `supabase login` + `supabase link` sekali
```

Tanpa `supabase login` (mis. CI atau auth via password saja), push dengan
connection string session pooler (percent-encoded, ambil password dari env,
jangan pernah cetak ke log):

```bash
corepack pnpm db:push --db-url "postgresql://postgres.<ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

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

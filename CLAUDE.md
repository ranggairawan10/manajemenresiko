# CLAUDE.md - Manajemen Resiko (Platform Training & Pengelolaan SMR Perbankan)

Instruksi ini mengikat untuk semua sesi Claude Code di repo ini. Baca sebelum mengerjakan task apa pun.

## Konteks produk (ringkas)

Manajemen Resiko: PWA multi tenant untuk pembekalan sertifikasi, refreshment tahunan, dan certificate vault SMR perbankan Indonesia (konvensional + syariah). Manajemen Resiko BUKAN LSP, tidak menyelenggarakan uji kompetensi, tidak menerbitkan sertifikat. Sebelum ada pengakuan LSP, semua aktivitas dilabeli "pembekalan", jangan pernah menulis copy yang mengklaim memperpanjang SMR.

Dokumen sumber kebenaran (folder /docs):
- docs/manajemen-resiko-prd.md (PRD v2.0), docs/adr/*.md (ADR-001 s.d. 005), docs/manajemen-resiko-tech-spec.md, docs/design/manajemen-resiko-design-system.html (v5.2).
Jika kode dan dokumen bertentangan: berhenti, tulis pertanyaan di TASKS.md bagian BLOCKED, jangan menebak.

## Stack dan konvensi

- Next.js App Router + TypeScript strict, Vercel. Supabase: Postgres 15, Auth, Storage, pg_cron, Edge Functions. Region ap-southeast-1.
- UI: token Manajemen Resiko Design System v5.2 via Tailwind theme (globals.css sebagai satu-satunya sumber token). DILARANG hardcode hex/radius/shadow di komponen. Font: Plus Jakarta Sans via next/font/local. Bahasa UI: Indonesia; istilah SMR/UK/KUK/KKNI tidak diterjemahkan.
- Struktur: app/ (routes), components/ (UI), lib/ (domain + supabase client), supabase/migrations/ (SQL bernomor), supabase/functions/ (edge), tests/ (unit, isolation, e2e).
- Commit: conventional commits (feat:, fix:, chore:, test:, docs:). Satu task = satu branch = satu PR. Jangan pernah push langsung ke main.

## Aturan keamanan (tidak bisa dinegosiasikan)

1. RLS enabled + FORCE di setiap tabel domain. Tabel baru tanpa policy + test isolasi = task belum selesai.
2. tenant_id dan role hanya dari custom claims JWT, tidak pernah dari body/query request.
3. Service role key hanya di server (route handler/server action/edge function). Jika kode client mengimpor service role, itu bug kritikal.
4. Kunci jawaban (question_options.is_correct) tidak boleh melewati batas server dalam bentuk apa pun: tidak di response, tidak di HTML, tidak di cache.
5. Semua input divalidasi zod di server. Semua akses file via signed URL <= 5 menit yang diterbitkan server.
6. Tidak ada secret di repo. .env.example boleh, .env tidak. Jika menemukan secret ter-commit: berhenti dan laporkan di BLOCKED.
7. Log tidak boleh memuat password, token, nomor sertifikat, atau isi dokumen.
8. Dependency baru harus dijustifikasi di deskripsi PR (kenapa perlu, alternatif, lisensi).

## Loop kerja autonomous

1. Buka TASKS.md, ambil task paling atas berstatus [ ] yang dependensinya sudah [x].
2. Tandai [~] (in progress), buat branch task/<ID>-<slug>.
3. Rencanakan singkat di komentar PR, implementasi, tulis test.
4. Jalankan gate lokal: pnpm typecheck && pnpm lint && pnpm test && pnpm test:isolation (jika menyentuh DB/RLS).
5. Semua hijau -> commit, buka PR berisi: ringkasan, cara verifikasi, dampak keamanan. Tandai task [x] + tulis nomor PR.
6. Gagal atau butuh keputusan manusia -> tandai [!], tulis di bagian BLOCKED (apa yang dicoba, kenapa buntu, opsi + rekomendasi), lanjut ke task berikutnya yang tidak tergantung.
7. Maksimal 1 task [~] pada satu waktu.

## Definisi selesai (berlaku untuk SEMUA task)

- Typecheck, lint, unit test hijau; test isolasi hijau bila menyentuh data.
- Perubahan skema = file migrasi bernomor + down migration + policy RLS + test isolasi untuk tabel itu.
- Tidak menurunkan coverage area kritis (lib/domain, policy).
- Dokumentasi tersentuh bila perilaku berubah (README bagian terkait / komentar migrasi).

## Yang TIDAK boleh dilakukan tanpa persetujuan manusia

- Mengubah ADR atau menyimpang darinya.
- Menghapus/mengubah migrasi yang sudah ada di main (selalu migrasi baru).
- Menambah subprosesor/layanan eksternal baru.
- Operasi destruktif pada database staging/production.
- Mengubah kebijakan RLS yang sudah lulus review tanpa membuka PR terpisah berlabel security.

# TASKS.md - Antrean Kerja Manajemen Resiko (Fase 0 -> Fase 1)

Format: [ ] belum, [~] dikerjakan, [x] selesai (tulis #PR), [!] blocked (lihat bagian BLOCKED).
Kerjakan berurutan dari atas kecuali dependensi (dep:) menyatakan lain. Setiap task harus memenuhi Definisi Selesai di CLAUDE.md.

## EPIC 0: Fondasi repo dan CI (target: hari 1-3)

- [~] T-001 Init repo: Next.js App Router + TS strict, pnpm, ESLint+Prettier, struktur folder sesuai CLAUDE.md. DoD: `pnpm dev` jalan, halaman placeholder render.
- [~] T-002 Setup Tailwind theme dari token Design System v5.2 (warna, radius, shadow, easing, font PJS via next/font/local). DoD: halaman demo /styleguide menampilkan token; tidak ada hex hardcode di komponen. dep: T-001
- [~] T-003 Setup Supabase project (staging) + supabase CLI + migrasi kosong pertama + koneksi env. DoD: `supabase db push` sukses; .env.example lengkap. dep: T-001
- [~] T-004 CI GitHub Actions: typecheck, lint, unit test, gitleaks (secret scan), npm audit + Dependabot, semgrep dasar. Branch protection: PR wajib review + CI hijau. DoD: PR dummy diblokir saat test gagal. dep: T-001
- [~] T-005 Harness test isolasi tenant (pgTAP atau vitest+postgres): fixture tenant A/B + user 4 role, helper assertCrossTenantDenied(). Terpasang di CI sebagai job terpisah `test:isolation`. DoD: harness jalan terhadap tabel contoh. dep: T-003, T-004

## EPIC 1: Skema inti dan RLS (target: minggu 1)

- [~] T-010 Migrasi identitas: tenants, profiles (role enum), invitations + trigger sync custom claims (tenant_id, user_role) ke JWT. RLS + policy + test isolasi. DoD: klaim muncul di JWT user baru. dep: T-005
- [~] T-011 Migrasi taksonomi master: schemes (KKNI 4-7 + FT 6/7), tracks, unit_kompetensi, elemen, kuk, learning_paths, modules, units. Seed 6 skema + 2 track. RLS: read authenticated, write admin_platform. DoD: seed idempotent. dep: T-010
- [~] T-012 Migrasi bank soal: questions, question_options (is_correct), exam_blueprints + VIEW soal tanpa is_correct untuk client + policy yang menutup akses langsung question_options dari role client. Test: query client ke is_correct DITOLAK. dep: T-011
- [~] T-013 Migrasi aktivitas: enrollments, unit_progress, attempts, attempt_answers + trigger immutable setelah submit. RLS + test isolasi + test immutability. dep: T-011
- [~] T-014 Migrasi vault: certificates (nomor_enc terenkripsi kolom via Supabase Vault/pgsodium), refreshment_logs, + audit_log append-only (trigger tolak UPDATE/DELETE) + consents. RLS + test isolasi + test append-only. dep: T-010
- [~] T-015 Storage: bucket privat `vault`, kebijakan path {tenant_id}/{user_id}/, endpoint /api/files/sign (signed URL <= 5 menit, cek kepemilikan, tulis audit_log). Test isolasi path silang. dep: T-014

## EPIC 2: F1 Autentikasi dan multi tenant (target: minggu 2)

- [ ] T-020 Auth flow: login email+password, magic link, logout, halaman sesi. Password check panjang >= 12 + rate limit login (middleware IP+akun). dep: T-010
- [ ] T-021 MFA TOTP: enrollment + enforcement wajib untuk admin_tenant/admin_platform saat login. DoD: admin tanpa MFA dipaksa setup sebelum masuk. dep: T-020
- [ ] T-022 Onboarding tenant: CRUD tenant (admin_platform) + branding (logo, warna aksen via theming layer). dep: T-020
- [ ] T-023 Undangan: form email tunggal + upload CSV (<= 2MB, validasi, dedup, laporan per baris), token sekali pakai hash + kedaluwarsa 7 hari, halaman accept. Rate limit. DoD: CSV 500 baris < 5 menit. dep: T-022
- [ ] T-024 Guard route per role + halaman 403/404 seragam (tanpa bocor info). Test e2e: user tenant A akses resource tenant B -> 404/403. dep: T-020

## EPIC 3: F2 Learning path dan materi (target: minggu 3)

- [ ] T-030 Render learning path -> modul -> unit (rich text sanitized whitelist, video embed whitelist domain, dokumen via signed URL, kuis formatif). dep: T-011, T-015
- [ ] T-031 Progres: tandai unit selesai, agregat per modul dan per UK (persentase), mode bebas/berurutan per kebijakan tenant. dep: T-030
- [ ] T-032 Enrollment & assignment oleh admin_tenant (per user / per CSV angkatan). dep: T-023, T-030

## EPIC 4: F3 Bank soal dan try-out (target: minggu 4)

- [ ] T-040 Mode latihan per UK: soal via view aman, feedback + pembahasan setelah jawab (pembahasan diambil per soal setelah submit jawaban itu). dep: T-012
- [ ] T-041 Mode simulasi: mulai attempt (seed server, urutan soal+opsi dirandom dari seed), timer server-side, autosave PUT answers, resume setelah putus koneksi. dep: T-040
- [ ] T-042 Submit & skor server-side + peta kekuatan/kelemahan per UK (uk_breakdown) + kunci jawaban attempt (immutable). Test: skor tidak bisa dimanipulasi dari client. dep: T-041
- [ ] T-043 Proteksi soal: rate limit endpoint soal, watermark overlay identitas user pada komponen soal, larangan copy (deterrent). dep: T-041

## EPIC 5: F4 Certificate vault (target: minggu 5)

- [ ] T-050 CRUD metadata sertifikat (jenis SMR KKNI/tingkat lama/asesor/lainnya, penyetaraan) milik sendiri + input oleh admin_tenant atas nama user. dep: T-014
- [ ] T-051 Upload file: presigned upload, validasi magic bytes server, strip EXIF, quarantine sampai scan lolos (ClamAV container / layanan scan), tampil via signed URL. dep: T-015, T-050
- [ ] T-052 Log refreshment manual + otomatis dari penyelesaian modul e-learning (source=platform_auto, recognition_status=pembekalan, feature flag diakui_lsp OFF). dep: T-031, T-050
- [ ] T-053 Halaman vault peserta (status token semantik: aktif/warning/danger/info) + vault tenant untuk admin_tenant. dep: T-050

## EPIC 6: F5 Reminder engine (target: minggu 6)

- [ ] T-060 Migrasi notification_queue (dedupe_key unique) + notification_log append-only + fn_build_reminder_queue() (H-90/60/30/0 + refresh bulan ke-9 + tembusan admin mulai H-60) + jadwal pg_cron 01:00 WIB. Test: re-run tidak menghasilkan duplikat; perubahan expires_at membangun ulang antrean. dep: T-014
- [ ] T-061 Edge Function notify-consumer: batch 100 skip-locked, template email tanpa data sensitif, kirim via Resend (domain SPF/DKIM/DMARC), retry backoff, > 5 gagal -> failed + alert. dep: T-060
- [ ] T-062 Kill switch reminder per platform + ekspor daftar "at risk" oleh admin_tenant (ter-audit). dep: T-061
- [ ] T-063 Watchdog & metrik antrean (pending>24h, failed, sent harian) di dashboard admin_platform + alert Sentry. dep: T-061

## EPIC 7: F6 Dashboard dan laporan (target: minggu 7)

- [ ] T-070 Dashboard peserta: progres, skor per UK, countdown sertifikat, riwayat refreshment. dep: T-042, T-053
- [ ] T-071 Dashboard admin_tenant: heatmap kepatuhan, completion per angkatan, daftar at risk. dep: T-053, T-060
- [ ] T-072 Ekspor XLSX/PDF laporan realisasi pengembangan SDM: job async + hasil via signed URL + audit_log. DoD: 5.000 baris < 30 detik. dep: T-071
- [ ] T-073 Dashboard admin_platform: agregat lintas tenant non-PII + kesehatan reminder. dep: T-063

## EPIC 8: Hardening pra-pilot (target: minggu 8)

- [ ] T-080 Header keamanan (CSP ketat, HSTS, nosniff, Referrer-Policy, frame-ancestors) + audit Lighthouse/securityheaders. dep: T-030
- [ ] T-081 Sentry + masking PII di log + review seluruh log statement. dep: T-063
- [ ] T-082 Backup: verifikasi backup harian + restore drill ke Postgres kosong (bukti ADR-003/005), dokumentasikan langkahnya. dep: T-014
- [ ] T-083 Jalankan checklist pre-ship keamanan penuh (secret, dependency, authz, transport, logging/PII, rate limit, header) dan arsipkan hasilnya di docs/evidence/. dep: semua epic
- [ ] T-084 Seed konten pilot KKNI 5 Konvensional (placeholder terstruktur menunggu ekstraksi UK/KUK dari PDF SKKNI). dep: T-011

## BLOCKED / PERTANYAAN UNTUK MANUSIA

(Claude menulis di sini saat menandai task [!]. Format: T-xxx | apa yang dicoba | kenapa buntu | opsi + rekomendasi)

- (kosong)

## KEPUTUSAN YANG SUDAH DIKUNCI (jangan tanya ulang)

- ADR-001 s.d. ADR-005 (docs/adr). Stack Next.js+Supabase, shared schema+RLS, region SG, reminder via pg_cron+queue, lock-in dimitigasi data portabel.
- Kunci jawaban tidak pernah ke client; penilaian server-side.
- Admin platform tanpa akses vault tenant kecuali break-glass.

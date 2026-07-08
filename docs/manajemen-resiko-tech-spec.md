# Tech Spec: Manajemen Resiko MVP (Fase 0 -> Fase 1)

Penulis: Kang Rangga (ranggairawan.com) · Tanggal: 8 Juli 2026 · Status: Draft untuk review
Rujukan: PRD v2.0 (Project knowledge 08), ADR-001 s.d. ADR-005 (dokumen 10), Manajemen Resiko Design System v5.2 (Project knowledge 09), threat model PRD bab 9.1.

## 1. Problem dan tujuan

Problem: membangun MVP Manajemen Resiko (F1-F6 PRD) dalam 6-8 minggu oleh tim kecil, dengan isolasi tenant yang dapat dibuktikan dan kontrol keamanan bab 9 PRD terpasang sejak commit pertama.

Tujuan terukur:
- Seluruh acceptance criteria F1-F6 dan SEC per fitur terpenuhi.
- Suite tes isolasi tenant: 100% lulus di CI, menjadi release gate.
- p95 halaman inti < 3 detik pada 4G; ekspor 1.000 baris < 30 detik.
- Reminder engine: 0 missed, 0 duplikat pada 30 hari pilot (dibuktikan dari tabel antrean).

Non-goals: semua non-goals PRD bab 4; ditambah: tidak ada microservices, tidak ada Kubernetes, tidak ada abstraksi multi-provider (ADR-005).

## 2. Batasan

- Stack: Next.js App Router (TypeScript) di Vercel + Supabase (Postgres 15, Auth, Storage, pg_cron, Edge Functions) region ap-southeast-1 (ADR-002, ADR-003).
- Email: Resend dengan domain SPF/DKIM/DMARC (SEC F5). Error monitoring: Sentry.
- UI: token dan komponen Manajemen Resiko Design System v5.2; Tailwind theme sebagai satu-satunya sumber nilai token.
- Kepatuhan: UU PDP (retensi, hak subjek data), evidence-ready untuk due diligence bank (PRD 9.7).
- Tim: 1-2 engineer + Claude Code; anggaran infra awal < USD 100/bulan.

## 3. Arsitektur tingkat tinggi

```
[Browser/PWA]
   |  HTTPS (TLS 1.2+)
[Next.js @ Vercel]
   |- Server Components / Route Handlers / Server Actions  <- semua logika sensitif
   |- next-pwa (installable, offline shell)
   |
   |--> [Supabase Auth]      login, magic link, MFA TOTP, session JWT
   |--> [Supabase Postgres]  RLS semua tabel; pg_cron; fungsi SQL reminder
   |--> [Supabase Storage]   bucket privat per-tenant path; signed URL pendek
   |--> [Supabase Edge Fn]   consumer antrean notifikasi -> Resend
   |--> [Sentry]             error + alert
```

Prinsip alur data:
1. Client tidak pernah memegang service role key; client memakai anon key + session, seluruh akses data dipagari RLS.
2. Operasi berhak-istimewa (undangan massal, ekspor, penerbitan signed URL, penilaian simulasi, admin) hanya lewat server (route handler/server action) yang memverifikasi role dari JWT lalu memakai service role secara terbatas.
3. Kunci jawaban tidak pernah dikirim ke client (SEC F3): penilaian dilakukan fungsi server; tabel jawaban benar tidak ter-expose lewat RLS mana pun ke role client.

## 4. Model data (skema inti)

Konvensi: semua tabel domain punya `tenant_id uuid not null` + index `(tenant_id, ...)`; `created_at/updated_at`; soft delete hanya bila dibutuhkan hukum. Konten master (milik platform, lintas tenant) TIDAK punya tenant_id dan hanya bisa ditulis admin_platform.

Identitas dan tenant:
- tenants(id, name, slug, logo_url, accent_color, settings jsonb, status)
- profiles(user_id pk -> auth.users, tenant_id, full_name, role enum[peserta|asesor|admin_tenant|admin_platform], job_title, unit_kerja, status)
- invitations(id, tenant_id, email, role, token_hash, expires_at, used_at, created_by)

Taksonomi konten (master, tanpa tenant_id):
- schemes(id, kkni_level int, is_fast_track bool)  -- 4,5,6,7 + FT 6,7
- tracks(id, code enum[konvensional|syariah])
- unit_kompetensi(id, kode_uk, judul, scheme_id)
- elemen(id, uk_id, judul); kuk(id, elemen_id, deskripsi)
- learning_paths(id, scheme_id, track_id, title, version, status)
- modules(id, path_id, order, title); units(id, module_id, order, type enum[rich_text|video|document|quiz], content_ref, version)

Bank soal (master; kelas data Internal-Manajemen Resiko):
- questions(id, kuk_id, track_id, difficulty, stem, explanation, status, version)
- question_options(id, question_id, label, body, is_correct)  -- is_correct TIDAK PERNAH terekspos ke client
- exam_blueprints(id, scheme_id, track_id, n_questions, duration_min)

Aktivitas belajar (per tenant):
- enrollments(id, tenant_id, user_id, path_id, mode enum[bebas|berurutan], assigned_by)
- unit_progress(id, tenant_id, user_id, unit_id, status, completed_at)
- attempts(id, tenant_id, user_id, blueprint_id, mode enum[latihan|simulasi], started_at, submitted_at, score, uk_breakdown jsonb, seed)
- attempt_answers(id, attempt_id, question_id, option_id, answered_at)  -- immutable setelah submit (trigger)

Vault dan refreshment (per tenant; kelas Rahasia):
- certificates(id, tenant_id, user_id, kind enum[smr_kkni|smr_tingkat_lama|asesor_bnsp|lainnya], jenjang int null, tingkat_lama int null, nomor_enc bytea, lsp_penerbit, issued_at date, expires_at date, status_penyetaraan enum, file_path, created_by)
- refreshment_logs(id, tenant_id, certificate_id, activity_date, bentuk enum[in_house|seminar|sosialisasi|workshop|lokakarya|elearning|portofolio], penyelenggara, bukti_path, source enum[manual|platform_auto], recognition_status enum[pembekalan|diakui_lsp])

Reminder (ADR-004):
- notification_queue(id, tenant_id, user_id, kind enum[cert_h90|cert_h60|cert_h30|cert_h0|refresh_m9], ref_id, dedupe_key unique, scheduled_on date, status enum[pending|sent|failed|skipped], attempts int, last_error, sent_at)
- notification_log immutable (append-only; trigger melarang UPDATE/DELETE)

Audit dan kepatuhan:
- audit_log(id, tenant_id null, actor_id, action, resource, resource_id, ip, user_agent, detail jsonb, at) -- append-only
- consents(id, user_id, doc_version, accepted_at, ip)
- export_jobs(id, tenant_id, requested_by, kind, filter jsonb, file_path, status)

Field terenkripsi kolom: certificates.nomor_enc via pgsodium/pgcrypto dengan kunci di Supabase Vault (PRD 9.2).

## 5. Kontrak API (permukaan server)

Gaya: server actions/route handlers Next.js; JSON; error model seragam `{error: {code, message}}` tanpa detail internal. Validasi zod di setiap input. Semua endpoint di bawah mensyaratkan sesi; kolom Role = role minimum.

| Endpoint | Method | Role | Catatan keamanan |
|---|---|---|---|
| /api/tenants | POST | admin_platform | buat tenant; audit |
| /api/invitations/bulk | POST | admin_tenant | CSV <= 2MB; rate limit; laporan per baris |
| /api/invitations/accept | POST | publik+token | token sekali pakai, hash disimpan, kedaluwarsa 7 hari |
| /api/enrollments | POST | admin_tenant | assign path ke user tenant sendiri (cek RLS + server) |
| /api/attempts | POST | peserta/asesor | mulai attempt; seed random server; soal diambil per halaman |
| /api/attempts/:id/answers | PUT | pemilik attempt | autosave; ditolak setelah submitted |
| /api/attempts/:id/submit | POST | pemilik attempt | skor dihitung server; jawaban dikunci |
| /api/certificates | POST/PATCH | pemilik / admin_tenant | metadata; perubahan expires_at memicu rebuild queue |
| /api/certificates/:id/file | POST | pemilik / admin_tenant | presigned upload; validasi magic bytes + scan async |
| /api/files/sign | POST | sesuai kepemilikan | signed URL <= 5 menit; audit read utk kelas Rahasia |
| /api/reports/compliance/export | POST | admin_tenant | async job; hasil via signed URL; audit |
| /api/admin/metrics | GET | admin_platform | agregat lintas tenant, tanpa PII |

Webhook/cron internal: `select cron.schedule('reminder-daily', '0 1 * * *', $$select fn_build_reminder_queue()$$);` lalu Edge Function `notify-consumer` dipicu tiap 5 menit memproses batch 100 baris pending.

## 6. Desain RLS (pola standar)

```sql
alter table certificates enable row level security;

-- helper: klaim dari JWT
create function auth_tenant_id() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claims', true)::jsonb->>'tenant_id','')::uuid $$;
create function auth_role() returns text language sql stable
  as $$ select current_setting('request.jwt.claims', true)::jsonb->>'user_role' $$;

-- baca: pemilik, atau admin_tenant pada tenant yang sama
create policy cert_read on certificates for select using (
  tenant_id = auth_tenant_id()
  and (user_id = auth.uid() or auth_role() = 'admin_tenant')
);
-- tulis: pemilik atau admin_tenant tenant sama; admin_platform TIDAK termasuk (break-glass lewat prosedur khusus)
```

Aturan baku:
1. RLS enabled + FORCE pada semua tabel domain; default tanpa policy = tertutup.
2. tenant_id dan role dibawa sebagai custom claims JWT (di-sync trigger dari profiles); tidak pernah dari parameter request.
3. Tabel master (schemes, questions, dst): select untuk authenticated (kecuali question_options yang tidak pernah di-select client; pengambilan soal lewat view tanpa is_correct), write hanya admin_platform.
4. Storage: kebijakan bucket mengikat prefix path `tenant_id/` ke klaim; penerbitan signed URL tetap lewat server + audit.
5. Setiap policy punya test isolasi (bagian 9).

## 7. Desain reminder engine (detail ADR-004)

fn_build_reminder_queue() (SQL, jalan 01:00 WIB):
1. Hitung kandidat: certificates aktif dengan expires_at - today anggota {90,60,30,0}; refreshment: user dengan sertifikat aktif tanpa refreshment_logs 12 bulan terakhir dan bulan berjalan >= bulan ke-9 siklus.
2. Insert ke notification_queue dengan dedupe_key = `cert:{certificate_id}:{milestone}` atau `refresh:{user_id}:{tahun_siklus}`; `on conflict do nothing` menjamin idempotensi.
3. Baris H-60 dan H-30 untuk milik non-admin juga menghasilkan baris tembusan admin_tenant.

notify-consumer (Edge Function, tiap 5 menit):
1. Ambil batch `pending` dengan `for update skip locked`.
2. Render template (tanpa nomor sertifikat penuh; link ke halaman login).
3. Kirim via Resend; sukses -> status sent + sent_at; gagal -> attempts+1, backoff, > 5 gagal -> failed + alert Sentry.

Observabilitas: metrik harian (pending>24h, failed, sent) di dashboard admin_platform; alert bila cron tidak menulis baris apa pun padahal ada kandidat (watchdog membandingkan kandidat vs antrean).

## 8. Keamanan aplikasi (implementasi bab 9 PRD, ringkas per lapisan)

- AuthN: Supabase Auth; password policy NIST (panjang >= 8 + cek bocor via HIBP k-anonymity di server action registrasi); Argon2id default penyedia; MFA TOTP diwajibkan saat login role admin (cek enrollment, paksa setup).
- Session: access token 1 jam, refresh dirotasi; revoke on password change; deprovision -> hapus sesi <= 5 menit (job).
- Rate limit: middleware per IP+akun untuk /login, /invitations, /attempts (soal), /files/sign; respons 429 seragam.
- Header: CSP (default-src 'self'; frame-ancestors 'none'; media/frame-src whitelist penyedia video), HSTS, nosniff, Referrer-Policy strict-origin-when-cross-origin.
- Upload: cek magic bytes server-side; strip EXIF; ClamAV (container kecil) atau layanan scan; file quarantine sampai scan lolos.
- Anti-scraping bank soal: pagination soal per item, rate limit, watermark overlay (nama+email samar) di komponen soal, pool > tayang, randomisasi via seed per attempt.
- CI/CD: GitHub Actions = typecheck, lint, unit test, tes isolasi RLS (bagian 9), SAST (semgrep), secret scanning (gitleaks), SCA (npm audit + Dependabot), claude-code-security-review per PR; branch protection wajib review.
- Checklist pre-ship (dari skill secure-code-review): secret, dependency, authz, transport, logging/PII, rate limit, header; dijalankan tiap rilis dan diarsipkan sebagai evidence.

## 9. Strategi pengujian

1. Unit: fungsi skor, kalkulasi milestone reminder, parser CSV.
2. Tes isolasi tenant (release gate): harness pgTAP/vitest yang membuat tenant A dan B + user tiap role, lalu untuk SETIAP tabel ber-RLS dan SETIAP endpoint mencoba: read silang, write silang, IDOR by-id, path storage silang. Ekspektasi: 0 kebocoran. Gagal satu = build merah.
3. E2E (Playwright): alur undangan -> onboarding -> belajar -> try-out -> vault -> reminder (dengan clock injection).
4. Beban ringan: k6 pada endpoint soal dan ekspor (target bagian 1).
5. Restore drill: backup -> restore ke Postgres kosong (sekali di Fase 1, membuktikan ADR-003/005).

## 10. Rollout dan rollback

- Lingkungan: dev (branch), staging (proyek Supabase terpisah + data sintetis), production. Tidak ada data produksi di staging.
- Migrasi: supabase migration files di repo; setiap migrasi punya down; perubahan RLS = PR terpisah dengan reviewer wajib.
- Rilis bertahap: tenant pilot dulu (feature flag per tenant di tenants.settings); kill switch reminder (berhenti kirim, antrean tetap terisi) untuk insiden email.
- Rollback: Vercel instant rollback untuk app; migrasi destruktif dilarang di minor release (expand-contract pattern).

## 11. Alternatif yang ditolak

- Backend Golang penuh sekarang: ditolak (ADR-002), dicatat sebagai jalur evolusi.
- Schema/DB per tenant: ditolak untuk MVP (ADR-001).
- Antrean eksternal: ditolak (ADR-004).
- Penyimpanan nomor sertifikat plaintext: ditolak; enkripsi kolom (bagian 4).

## 12. Risiko teknis dan mitigasi

- Policy RLS keliru -> test isolasi per policy + review khusus PR RLS.
- Timeout serverless pada ekspor besar -> job async + storage hasil + signed URL.
- Cold start/latency edge -> caching konten master (ISR) tanpa menyentuh data tenant.
- Scan malware menambah latensi upload -> quarantine async, file tampil setelah lolos.
- pg_cron di timezone UTC -> jadwal disimpan UTC, tampilan WIB, uji DST tidak relevan (WIB tanpa DST) tapi tetap uji batas hari.

## 13. Ukuran sukses spec

Fase 0 selesai bila: ADR 001-005 disetujui, skema bagian 4 termigrasi di staging, pola RLS bagian 6 terpasang dengan tes isolasi hijau untuk tabel pertama (certificates), pipeline CI dengan seluruh gate keamanan aktif, dan walkthrough threat model (PRD 9.1) tidak menemukan trust boundary tanpa kontrol.

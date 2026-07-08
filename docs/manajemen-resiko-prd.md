# PRD v2.0: Manajemen Resiko, Platform Training dan Pengelolaan Sertifikasi Manajemen Risiko Perbankan

Versi: 2.0 (menggantikan v1.0)
Tanggal: 8 Juli 2026
Pemilik produk: Kang Rangga
Perubahan utama dari v1.0: nama produk Manajemen Resiko final, acuan UI ke Manajemen Resiko Design System v5.2, bab keamanan dan kepatuhan diperluas menjadi requirement berstandar, kriteria penerimaan per fitur dipertajam, RBAC matrix dan klasifikasi data ditambahkan.

---

## 1. Ringkasan eksekutif

Manajemen Resiko adalah platform web (PWA, installable di mobile) untuk persiapan sertifikasi, refreshment tahunan, dan pengelolaan masa berlaku Sertifikat Manajemen Risiko (SMR) bagi SDM perbankan Indonesia, bank konvensional dan syariah, dengan arsitektur multi tenant.

Posisi dalam ekosistem: Training Provider Pembekalan dan (target jangka menengah) penyelenggara program pemeliharaan yang diakui LSP. Manajemen Resiko BUKAN LSP, tidak menyelenggarakan uji kompetensi resmi, dan tidak menerbitkan SMR.

Karena pelanggan utamanya bank, Manajemen Resiko diperlakukan sebagai vendor TI penyedia jasa bagi bank. Konsekuensinya: keamanan bukan fitur, melainkan syarat masuk pasar. PRD ini menetapkan baseline keamanan yang harus lulus due diligence vendor (TPRM) bank sejak tenant pertama.

## 2. Latar belakang dan dasar regulasi

Empat fakta regulasi yang menciptakan kebutuhan pasar (rujukan: Project knowledge 01 sampai 07):

1. SEOJK 28/SEOJK.03/2022 mewajibkan SMR yang masih berlaku bagi Direksi, Dewan Komisaris, Pejabat Eksekutif, dan pejabat pada satuan kerja manajemen risiko, kepatuhan, audit internal, perkreditan/pembiayaan, tresuri, TI, dan keuangan.
2. Masa berlaku SMR 3 tahun; refreshment wajib minimal 1x per tahun; bukti kepemilikan sertifikat dan keikutsertaan pemeliharaan wajib diadministrasikan; pejabat yang membiarkan sertifikat kedaluwarsa harus diganti bank paling lambat 6 bulan.
3. E-learning diakui sebagai bentuk refreshment yang sah dengan syarat program dan penyelenggara diakui LSP sektor perbankan.
4. LSP dilarang memberikan jasa pendidikan/pelatihan bagi peserta sertifikasi, sehingga pasar pembekalan dan pemeliharaan harus diisi pihak ketiga seperti Manajemen Resiko.

Regulasi yang membentuk requirement keamanan (bukan pasar):

5. UU Nomor 27 Tahun 2022 tentang Perlindungan Data Pribadi (UU PDP): dasar seluruh requirement privasi di bab 10.
6. POJK tentang penyelenggaraan teknologi informasi oleh bank umum (POJK 11/POJK.03/2022, pembaruan dari POJK 38/2016): bank tenant tunduk pada ketentuan kerja sama dengan penyedia jasa TI, sehingga Manajemen Resiko harus siap dengan dokumen dan kontrol yang bank butuhkan untuk patuh (hak audit, lokasi data, exit plan). Detail pasal diverifikasi dari dokumen asli saat menyusun kontrak tenant, jangan dikutip buta.

## 3. Problem statement

- Peserta: materi pembekalan per jenjang KKNI tersebar dan tidak terstruktur, tidak ada ukuran kesiapan sebelum uji kompetensi, tenggat refreshment tahunan dan kedaluwarsa 3 tahunan mudah terlewat.
- HC/bank: pemantauan keberlakuan SMR ribuan pejabat dilakukan manual di spreadsheet, bukti refreshment tercecer, berisiko temuan audit dan kewajiban mengganti pejabat.
- Ekosistem: belum ada platform yang menggabungkan pembekalan terstruktur, refreshment terdokumentasi, dan vault kepatuhan dalam satu produk multi tenant yang lulus standar keamanan perbankan.

## 4. Tujuan dan ukuran sukses

Tujuan bisnis 12 bulan:
- 3 sampai 5 tenant berbayar; 1.000 MAU; proses pengakuan LSP dimulai; 1 due diligence vendor bank terlewati tanpa temuan blocker.

Metrik produk:
- Aktivasi: >= 60% user terundang menyelesaikan onboarding plus 1 modul.
- Kesiapan: rata-rata skor try-out naik >= 20 poin dari percobaan pertama ke terakhir.
- Kepatuhan tenant: >= 90% sertifikat di vault berisi tanggal kedaluwarsa; 0 sertifikat kedaluwarsa tanpa reminder terkirim (diukur dari log).
- Keamanan: 0 insiden data lintas tenant; 100% temuan pen-test kritikal/tinggi ditutup sebelum go-live.
- Retensi: churn tenant tahunan < 10%.

Non-goals (v1): tidak menyelenggarakan asesmen resmi (APL/MAPA/IA) dan tidak menerbitkan SMR; tidak ada aplikasi native terpisah (cukup PWA); tidak ada marketplace kelas publik lintas tenant; tidak ada deployment on-premise.

## 5. Persona dan role (RBAC)

Empat role MVP dengan matrix hak akses:

| Kemampuan | Peserta | Asesor | Admin Tenant | Admin Platform |
|---|---|---|---|---|
| Akses materi/try-out sesuai assignment | Ya | Ya | Ya (preview) | Ya |
| Lihat progres dan skor | Milik sendiri | Milik sendiri | Seluruh tenant | Lintas tenant (agregat) |
| Vault sertifikat: buat/ubah | Milik sendiri | Milik sendiri | Seluruh user tenant | Tidak (kecuali support dengan consent) |
| Vault sertifikat: lihat | Milik sendiri | Milik sendiri | Seluruh tenant | Tidak default; akses support harus melalui prosedur break-glass yang tercatat |
| Kelola user dan undangan | Tidak | Tidak | Tenant sendiri | Semua tenant |
| Kelola konten master dan bank soal | Tidak | Tidak | Tidak | Ya |
| Konfigurasi reminder tenant | Tidak | Tidak | Ya | Ya |
| Ekspor laporan kepatuhan | Tidak | Tidak | Tenant sendiri | Agregat non-PII |

Prinsip: least privilege, deny by default, setiap kombinasi role x resource di luar tabel berarti ditolak. Role tambahan v2 (Content Author, Reviewer) sudah diantisipasi di desain skema.

## 6. Arsitektur informasi produk

- Skema (mengikuti skema LSP): KKNI Kualifikasi 4, 5, 6, 7 plus jalur tanpa berjenjang 6 dan 7.
- Track: Konvensional (POJK 18/2016, 8 risiko) dan Syariah (POJK 65/2016, 10 risiko); materi dasar dipakai bersama dengan flag track; terminologi mengikuti glossary dwibahasa (pembiayaan/kredit, imbal hasil/bunga, NPF/NPL).
- Taksonomi: Skema -> Unit Kompetensi -> Elemen -> KUK (SKKNI 218/2020, KKNI KEP-18/D.02/2021). Materi terpeta ke UK, soal terpeta ke KUK.
- Konten wajib mencakup risiko terkini arahan regulator: risiko siber dan risiko iklim.
- UI: 100% mengikuti Manajemen Resiko Design System v5.2 (Project knowledge 09), Bahasa Indonesia, istilah regulasi tidak diterjemahkan. Status sertifikat memakai token semantik: aktif = success, < 90 hari = warning, kedaluwarsa = danger, penyetaraan = info.

Dependensi data: ekstraksi daftar UK per jenjang dari PDF SKKNI/KKNI (blocker konten, bukan blocker platform).

## 7. Spesifikasi fitur MVP (Fase 1)

### F1. Autentikasi dan multi tenant
Requirement:
- Login email + password dan magic link; SSO Google/Microsoft di Fase 2.
- MFA TOTP wajib untuk admin_tenant dan admin_platform, opsional untuk peserta/asesor.
- Satu user milik tepat satu tenant; role: peserta, asesor, admin_tenant, admin_platform.
- Onboarding: admin_platform membuat tenant; admin_tenant mengundang via email atau CSV (validasi format, dedup, laporan gagal per baris).
- Branding tenant: logo dan override warna aksen terbatas via theming layer design system.

Kriteria penerimaan:
- Undangan CSV 500 baris selesai < 5 menit dengan laporan hasil per baris.
- Percobaan login user tenant A ke resource tenant B menghasilkan 404/403, dibuktikan automated test isolasi (lihat 10.3).

### F2. Learning path dan materi
- Learning path per kombinasi skema x track; modul berisi unit teks/rich content, video embed, dokumen, kuis formatif.
- Progres per unit, agregat per UK, mode bebas atau berurutan per kebijakan tenant.

Kriteria penerimaan: menyelesaikan semua unit menandai modul complete; progres UK tampil sebagai persentase; halaman materi termuat < 3 detik di 4G.

### F3. Bank soal dan try-out
- Soal pilihan ganda terpeta ke KUK, punya tingkat kesulitan, flag track, pembahasan.
- Mode latihan (feedback langsung) dan mode simulasi (durasi dan jumlah soal meniru uji kompetensi, skor akhir, peta kekuatan/kelemahan per UK).
- Integritas: randomisasi urutan soal dan opsi, pool > tampilan, watermark identitas user pada tampilan soal, autosave jawaban tahan koneksi putus, timer server-side (bukan hanya client).

Kriteria penerimaan: dua peserta pada simulasi yang sama menerima urutan berbeda; koneksi putus 60 detik tidak menghilangkan jawaban; skor final dihitung server-side.

### F4. Certificate vault
- Upload sertifikat (PDF/JPG/PNG, maksimal 10 MB) + metadata: jenis (SMR jenjang 4-7, tingkat lama 1-5, sertifikat asesor BNSP, lainnya), nomor, LSP penerbit, tanggal terbit, tanggal kedaluwarsa, status penyetaraan.
- Log refreshment per sertifikat: tanggal, bentuk kegiatan (sesuai daftar SEOJK: in-house training, seminar, sosialisasi, workshop, lokakarya, e-learning, portofolio), penyelenggara, bukti.
- Aktivitas e-learning Manajemen Resiko otomatis tercatat sebagai kandidat bukti dengan label status: "pembekalan" atau "refreshment diakui LSP" (label kedua hanya aktif setelah pengakuan LSP diperoleh; dikontrol feature flag di level platform).
- File tervalidasi tipe (magic bytes, bukan hanya ekstensi), dipindai malware, disimpan di path per tenant dengan akses signed URL berumur pendek.

Kriteria penerimaan: file dengan ekstensi dipalsukan ditolak; URL file tidak bisa diakses tanpa sesi valid dan keanggotaan tenant; setiap perubahan metadata tercatat di audit trail.

### F5. Reminder engine
- Kedaluwarsa sertifikat: H-90, H-60, H-30, hari-H ke pemilik; tembusan admin_tenant mulai H-60.
- Siklus refreshment: peringatan mulai bulan ke-9 jika belum ada aktivitas refreshment tercatat dalam 12 bulan berjalan.
- Kanal email (wajib) dan push PWA (opt-in). Isi notifikasi TIDAK memuat data sensitif (tanpa nomor sertifikat lengkap), hanya ajakan login.
- Reliabilitas: job harian idempotent, retry dengan backoff, dead-letter log, alert ke admin_platform jika job gagal atau 0 email terkirim padahal antrean ada. Log pengiriman immutable untuk audit.

Kriteria penerimaan: simulasi tanggal menunjukkan 4 reminder terkirim tepat jadwal; kegagalan provider email memicu retry dan alert; tidak ada reminder duplikat pada re-run job.

### F6. Dashboard dan laporan
- Peserta: progres, skor per UK, countdown sertifikat, riwayat refreshment.
- Admin tenant: heatmap kepatuhan (aktif/akan kedaluwarsa/kedaluwarsa), completion per angkatan, daftar "at risk", ekspor XLSX/PDF laporan realisasi pengembangan SDM (bukti kepatuhan POJK 24/2022).
- Admin platform: metrik lintas tenant agregat (tanpa PII lintas tenant), kesehatan reminder engine.

Kriteria penerimaan: angka dashboard konsisten dengan query sumber (uji rekonsiliasi); ekspor 5.000 baris < 30 detik; file ekspor diberi penanda tenant dan timestamp.

## 8. Fase 2 dan seterusnya (ringkas)

- Fase 2: paket refreshment tahunan terkurasi, sertifikat digital keikutsertaan ber-QR verifikasi publik, kalender program, SSO enterprise, mulai proses pengakuan LSP.
- Fase 3: billing per tenant (Midtrans/Xendit), custom domain per tenant, analitik lanjutan, API/HRIS integrasi, offline mode PWA penuh.
- Fase 4 (opsional): dukungan administrasi pra-asesmen, ekspansi bidang kompetensi lain (payung POJK 24/2022), segmen BPR/BPRS (POJK 44/POJK.03/2015).

## 9. Kebutuhan non-fungsional umum

- Ketersediaan: uptime 99,5%; jam kerja WIB kritikal; status page sederhana.
- Kinerja: p95 halaman inti < 3 detik di 4G; try-out tetap berjalan saat koneksi tidak stabil.
- Kapasitas awal: 10 tenant, 20.000 user terdaftar, 5.000 MAU, tanpa redesign.
- Aksesibilitas: WCAG AA sesuai seksi Aksesibilitas design system.
- Auditability: perubahan data sertifikat, hasil try-out, dan aksi admin tercatat append-only (siapa, kapan, apa, dari mana).

## 10. Keamanan dan kepatuhan (requirement, bukan aspirasi)

Baseline yang diadopsi: OWASP ASVS 4.x Level 2 sebagai standar verifikasi aplikasi, OWASP Top 10 sebagai checklist minimum per rilis, UU PDP 27/2022 untuk privasi, dan kesiapan due diligence vendor bank. Target sertifikasi ISO/IEC 27001 pada tahun ke-2 (pra-syarat menembus bank besar); sebelum itu, kontrol di bawah ini yang menjadi jawaban due diligence.

### 10.1 Identity dan access management
- Password: minimal 12 karakter, dicek terhadap daftar password bocor, hashing oleh Supabase Auth (bcrypt) tanpa implementasi kripto sendiri.
- MFA TOTP wajib untuk semua role admin; enforcement di level policy, bukan imbauan.
- Sesi: token berumur pendek dengan refresh; logout semua perangkat; sesi admin idle timeout 15 menit; re-auth untuk aksi sensitif (ubah email, ekspor massal, hapus data).
- Rate limiting login dan lockout progresif; notifikasi email pada login perangkat baru.
- Akses internal (tim Manajemen Resiko) ke production: SSO + MFA, least privilege, tidak ada shared account, akses database production hanya via prosedur tercatat.

### 10.2 Tenant isolation (kontrol paling kritikal produk ini)
- Semua tabel domain memuat tenant_id NOT NULL; Row Level Security aktif di SEMUA tabel tanpa kecuali; kebijakan default deny.
- tenant_id diambil dari klaim sesi di sisi server, tidak pernah dari input klien.
- Storage: bucket dengan path {tenant_id}/{user_id}/..., akses hanya via signed URL berumur <= 5 menit yang diterbitkan server setelah cek keanggotaan.
- Larangan query lintas tenant di kode aplikasi; fitur agregat lintas tenant hanya lewat view/fungsi khusus admin_platform yang mengembalikan agregat non-PII.
- Uji isolasi otomatis di CI: suite test yang mencoba akses silang antar 2 tenant fixture untuk setiap endpoint dan setiap policy; rilis diblokir jika ada satu saja yang lolos.

### 10.3 Application security (SDLC)
- Secure SDLC: setiap PR melewati review dengan sudut keamanan (authz, input validation, secret, injection); temuan diberi severity; blocker menahan merge.
- Validasi input server-side untuk semua endpoint; output encoding; proteksi standar OWASP Top 10 (injection, broken access control, SSRF, dst).
- Header keamanan: CSP ketat, HSTS, X-Content-Type-Options, Referrer-Policy, frame-ancestors none (kecuali kebutuhan embed yang di-whitelist).
- Upload: validasi magic bytes, batas ukuran, scan malware, simpan di luar web root, sajikan dengan content-disposition dan content-type eksplisit.
- Dependency: SCA otomatis (npm audit/Dependabat setara) di CI; patch kerentanan kritikal <= 7 hari, tinggi <= 30 hari.
- Secrets: hanya di environment variable terkelola (Vercel/Supabase); tidak pernah di repo; rotasi saat personel keluar; scanning secret di CI.
- Pen-test pihak ketiga sebelum go-live tenant bank pertama, lalu tahunan; temuan kritikal/tinggi wajib tutup sebelum rilis berikutnya.

### 10.4 Data protection dan kriptografi
- Klasifikasi data: (a) Rahasia: file sertifikat, nomor sertifikat, identitas pemegang, log refreshment; (b) Internal: progres belajar, skor; (c) Publik: katalog konten. Kontrol mengikuti kelas tertinggi yang disentuh.
- Enkripsi in transit TLS 1.2+ di semua jalur; enkripsi at rest AES-256 (default Supabase/penyedia); tidak ada kripto custom.
- Minimisasi: tidak mengumpulkan NIK atau data biometrik di MVP; field data pribadi dibatasi yang perlu untuk fungsi (nama, email korporat, jabatan, unit kerja, data sertifikat).
- Backup harian terenkripsi, uji restore per kuartal, RPO <= 24 jam, RTO <= 8 jam.
- Retensi: data user dihapus/dianonimkan <= 30 hari setelah permintaan valid atau akhir kontrak tenant (sesuai kontrak dan kewajiban hukum); kebijakan retensi tertulis per kategori data.

### 10.5 Privasi (UU PDP 27/2022)
- Dasar pemrosesan dan persetujuan tercatat saat onboarding; kebijakan privasi berbahasa Indonesia yang jelas.
- Hak subjek data dilayani: akses, perbaikan, penghapusan, penarikan persetujuan; SLA respons 3x24 jam untuk permintaan, sesuai praktik yang dipersyaratkan UU PDP.
- Notifikasi kegagalan perlindungan data pribadi: tertulis paling lambat 3x24 jam kepada subjek data dan lembaga sesuai UU PDP; template dan runbook disiapkan sebelum go-live.
- Peran: tentukan posisi Manajemen Resiko sebagai prosesor untuk data yang dikelola atas instruksi tenant dan pengendali untuk data akun; tuangkan dalam DPA (data processing agreement) standar di kontrak tenant.
- Residensi data: pilih region penyimpanan terdekat (Singapura bila region Indonesia belum tersedia di penyedia) dan nyatakan transparan di DPA; siapkan opsi migrasi region bila tenant bank mensyaratkan lokasi di Indonesia. Ini keputusan ADR tersendiri di Fase 0 dan poin negosiasi kontrak, jangan dijanjikan sebelum diverifikasi ke penyedia.

### 10.6 Logging, monitoring, dan respons insiden
- Audit trail append-only untuk: autentikasi, perubahan role, akses/ubah data vault, ekspor laporan, aksi admin_platform; retensi log minimal 12 bulan.
- Log tidak memuat password, token, atau isi dokumen; PII di log diminimalkan/dimasking.
- Monitoring error (Sentry) dan alerting job reminder; metrik keamanan dasar: login gagal beruntun, lonjakan 403, anomali ekspor.
- Incident response plan tertulis: severity level, eskalasi, komunikasi ke tenant, timeline notifikasi PDP 3x24 jam, post-mortem wajib untuk severity tinggi.
- Prosedur break-glass: akses darurat admin_platform ke data tenant harus dengan tiket, alasan, durasi terbatas, dan tercatat; direview bulanan.

### 10.7 Kesiapan due diligence vendor bank (paket TPRM)
Disiapkan sejak Fase 1 sebagai dokumen hidup: ringkasan arsitektur dan aliran data, kebijakan keamanan informasi, hasil pen-test terakhir, DPA standar, SLA, BCP/DR dan hasil uji restore, matrix subprosesor (Supabase, Vercel, penyedia email) beserta lokasi datanya, klausul hak audit tenant, dan exit plan (ekspor seluruh data tenant dalam format terbuka <= 30 hari setelah terminasi). Paket ini juga menjawab kebutuhan bank patuh pada ketentuan OJK tentang penyelenggaraan TI dan kerja sama pihak ketiga.

## 11. Risiko dan mitigasi

1. Aktivitas platform belum diakui LSP sebagai refreshment -> label status tegas di produk (10.4/F4), workstream pengakuan LSP berjalan paralel sejak Fase 1, marketing tidak menjanjikan perpanjangan sertifikat sebelum pengakuan ada.
2. Kebocoran lintas tenant -> kontrol 10.2 plus uji isolasi otomatis di CI sebagai release gate.
3. Daftar UK/KUK belum terekstrak -> tugas pertama fase konten; skema database jalan duluan.
4. Regulasi berubah (SEOJK/POJK baru, Basel 3.1, aturan turunan PDP) -> konten dan kebijakan berversi, review regulasi per semester.
5. Kebocoran bank soal -> kontrol integritas F3; terima bahwa deterrent tidak sempurna, pool dirotasi berkala.
6. Ketergantungan penyedia (Supabase/Vercel) -> backup portabel, infrastruktur didefinisikan sebagai kode, exit plan di 10.7.
7. Font display Creato Display belum berlisensi -> beli lisensi sebelum produksi atau aktifkan fallback resmi PJS 700-800 (Project knowledge 09).

## 12. Asumsi yang perlu validasi

- A1: model harga per-seat per tahun diterima bank (validasi ke 2-3 calon tenant).
- A2: email cukup untuk reminder MVP; WhatsApp Business API menyusul bila tervalidasi.
- A3: video embed tanpa DRM cukup untuk MVP.
- A4: satu user satu tenant cukup untuk MVP.
- A5: region data Singapura diterima tenant awal dengan DPA transparan (bila tidak, evaluasi penyedia region Indonesia sebelum kontrak).

## 13. Rencana rilis

- Fase 0 (2 minggu): Tech Spec + ADR (multi tenant, skema database, kontrak API, reminder engine, residensi data), threat model ringkas (aset, trust boundary, STRIDE), setup repo/CI dengan gate keamanan (lint, test, SCA, secret scan, uji isolasi tenant).
- Fase 1 (6-8 minggu): F1-F6 + kontrol bab 10, konten pilot KKNI 5 Konvensional, UAT tenant pilot, pen-test pihak ketiga, perbaikan temuan.
- Fase 2 (4 minggu): refreshment terkurasi, sertifikat digital QR, SSO; mulai proses pengakuan LSP; susun paket TPRM final.
- Fase 3: monetisasi dan skala.

Gate go-live tenant bank pertama: seluruh kriteria penerimaan F1-F6 lulus, uji isolasi tenant 100% hijau, temuan pen-test kritikal/tinggi tertutup, runbook insiden dan template notifikasi PDP siap, DPA ditandatangani.

## 14. Pertanyaan terbuka

1. Model bisnis: per-seat, flat per tenant, atau freemium individu?
2. Sumber konten awal: internal, kerja sama SME, atau lisensi lembaga training?
3. Entitas hukum penyelenggara untuk pengajuan pengakuan LSP: sudah ada atau dibentuk?
4. Tenant pilot pertama: bank yang sudah ada akses, atau lembaga training mitra?
5. Apakah ada calon tenant yang mensyaratkan data residensi di Indonesia sejak awal? Jawaban menentukan ADR pemilihan region/penyedia di Fase 0.

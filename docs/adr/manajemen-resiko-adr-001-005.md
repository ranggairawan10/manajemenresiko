# ADR Manajemen Resiko: Kumpulan Keputusan Arsitektur (Fase 0)

Format mengikuti template ADR standar. Status semua: Diusulkan (menunggu persetujuan Kang Rangga). Tanggal: 8 Juli 2026.

---

## ADR-001: Model multi tenant = shared database, shared schema, RLS per tenant_id

### Konteks
Manajemen Resiko melayani banyak tenant (bank/lembaga training) dengan data sangat sensitif. Kegagalan isolasi tenant adalah risiko produk nomor satu (PRD 9.1). Perlu model isolasi yang aman namun terkelola oleh tim kecil.

### Opsi
A. Shared schema + kolom tenant_id + Row Level Security (RLS) Postgres.
   Kelebihan: satu database, migrasi sekali, biaya rendah, RLS ditegakkan di lapisan database (bukan hanya aplikasi), pola paling matang di Supabase.
   Kekurangan: satu bug kebijakan RLS berdampak lintas tenant; noisy neighbor pada beban ekstrem.
   Risiko: kesalahan penulisan policy. Dimitigasi test isolasi otomatis di CI (PRD 9.1 risiko 3).
B. Schema-per-tenant.
   Kelebihan: isolasi logis lebih tegas.
   Kekurangan: migrasi N kali, tooling Supabase tidak dirancang untuk ini, kompleksitas operasional tinggi untuk tim kecil.
C. Database-per-tenant.
   Kelebihan: isolasi terkuat, mudah memenuhi tuntutan residensi per tenant.
   Kekurangan: biaya dan operasional meledak; tidak masuk akal sebelum ada tenant enterprise yang membayarnya.

### Keputusan
Opsi A. Alasan dominan: keseimbangan keamanan-operasional terbaik untuk 50 tenant pertama, dengan penegakan di database dan jaring pengaman test isolasi di CI.

### Konsekuensi
Lebih mudah: pengembangan, migrasi, agregasi metrik platform.
Lebih sulit: setiap tabel dan storage path wajib disiplin tenant_id; review policy jadi ritual rilis.
Langkah lanjut: definisikan pola policy standar (lihat Tech Spec bagian 6), bangun suite tes isolasi sebelum fitur pertama; opsi C dicatat sebagai jalur upgrade bila ada tenant yang mensyaratkan dedicated instance (dijual sebagai tier enterprise).

---

## ADR-002: Stack aplikasi = Next.js (Vercel) + Supabase, bukan backend Golang custom

### Konteks
Standar pribadi Kang Rangga adalah Golang + React + PostgreSQL. Namun MVP Manajemen Resiko dikerjakan tim sangat kecil dengan target 6-8 minggu, dan kebutuhan MVP (auth, CRUD, storage, cron, RLS) adalah komoditas.

### Opsi
A. Next.js full-stack di Vercel + Supabase (Postgres, Auth, Storage, RLS, pg_cron).
   Kelebihan: kecepatan membangun tertinggi; Auth + RLS + Storage sudah teraudit pasar; PWA first-class; satu bahasa (TypeScript) ujung ke ujung; biaya awal rendah.
   Kekurangan: vendor coupling (dimitigasi ADR-005); logika berat berjalan di serverless dengan batas eksekusi.
B. Backend Golang (chi/fiber) + React terpisah + Postgres managed + worker cron sendiri.
   Kelebihan: kontrol penuh, sesuai keahlian utama, performa; tidak terikat BaaS.
   Kekurangan: membangun sendiri auth, MFA, storage signed URL, audit, admin, deployment; menambah minimal 3-4 minggu dan permukaan risiko keamanan buatan sendiri.
C. Hybrid: A untuk MVP + service Golang khusus untuk beban spesifik nanti (mis. scoring massal, integrasi HRIS).
   Kelebihan: cepat sekarang, jalur skala jelas.
   Kekurangan: dua stack saat service kedua lahir.

### Keputusan
Opsi A sekarang, dengan C sebagai jalur evolusi resmi. Alasan dominan: waktu ke tenant pilot adalah variabel paling berharga, dan komponen keamanan yang dibeli jadi (auth, RLS, storage) lebih aman daripada yang ditulis terburu-buru.

### Konsekuensi
Lebih mudah: MVP 6-8 minggu realistis; fokus energi ke domain (konten, vault, reminder).
Lebih sulit: debug di batas serverless; disiplin agar logika bisnis tidak tercecer di client.
Langkah lanjut: semua logika sensitif (skor, penerbitan signed URL, mutasi vault) hanya di server (route handler/server action/Edge Function), tidak pernah di client.

---

## ADR-003: Region data = Supabase Singapore (ap-southeast-1), dengan exit plan residensi Indonesia

### Konteks
Supabase belum punya region Indonesia. UU PDP mengizinkan transfer lintas negara dengan syarat perlindungan setara dan transparansi; sebagian bank bisa mensyaratkan data onshore (PRD 9.7, pertanyaan terbuka 5).

### Opsi
A. Supabase cloud Singapore.
   Kelebihan: jarak jaringan dekat, operasional nol, semua fitur (RLS, Auth, pg_cron) tersedia.
   Kekurangan: data di luar Indonesia; beberapa tenant bisa menolak.
B. Self-host Supabase / Postgres di cloud region Indonesia (GCP Jakarta / AWS Jakarta).
   Kelebihan: data onshore.
   Kekurangan: tim kecil menanggung ops database, auth, patching; menghapus sebagian besar nilai ADR-002.
C. Mulai A, siapkan migrasi ke B sebagai tier untuk tenant yang mensyaratkan onshore.
   Kelebihan: cepat sekarang, jawaban jelas saat ditanya bank.
   Kekurangan: janji migrasi harus benar-benar bisa dieksekusi (backup portabel, IaC).

### Keputusan
Opsi C (operasional = A). Alasan dominan: jangan bayar biaya onshore sebelum ada tenant yang mensyaratkannya secara kontraktual; tapi jangan pula tanpa jawaban.

### Konsekuensi
Lebih mudah: go-live cepat; DPA menyatakan lokasi data secara jujur.
Lebih sulit: pipeline backup/restore lintas penyedia harus diuji sejak awal (bukan teori).
Langkah lanjut: cantumkan lokasi data + subprosesor di DPA; uji restore ke Postgres region Jakarta 1x di Fase 1 sebagai pembuktian exit plan.

---

## ADR-004: Penjadwalan reminder = pg_cron di database + tabel antrean + Edge Function pengirim

### Konteks
Reminder adalah fitur kepatuhan (PRD F5): wajib idempotent, teraudit, dan tahan gagal. Pilihan scheduler menentukan keandalan.

### Opsi
A. pg_cron menjalankan fungsi SQL harian yang MENGISI tabel antrean notifications (dedupe by unique key), lalu Edge Function/worker mengonsumsi antrean dan mengirim via Resend; status tercatat per baris.
   Kelebihan: keputusan "siapa harus diingatkan" dihitung di dekat data (transaksional), antrean = audit log alami, retry per baris, idempotensi lewat unique constraint.
   Kekurangan: dua komponen (cron + consumer).
B. Vercel Cron memanggil satu route yang menghitung dan langsung mengirim email.
   Kelebihan: paling sederhana.
   Kekurangan: timeout serverless membatasi volume; gagal di tengah = sebagian terkirim tanpa jejak; idempotensi harus dibuat manual.
C. Layanan antrean eksternal (Upstash QStash dsb).
   Kelebihan: fitur antrean lengkap. Kekurangan: subprosesor baru untuk masalah yang bisa diselesaikan Postgres.

### Keputusan
Opsi A. Alasan dominan: idempotensi dan auditability datang gratis dari desain berbasis tabel antrean + unique constraint.

### Konsekuensi
Lebih mudah: bukti "0 reminder terlewat" (metrik PRD) tinggal query.
Lebih sulit: perlu monitoring antrean (baris stuck) sejak awal.
Langkah lanjut: definisikan unique key (certificate_id, milestone) dan (user_id, cycle_year, jenis) di Tech Spec bagian 7.

---

## ADR-005: Mitigasi vendor lock-in = kontrak data portabel, bukan abstraksi prematur

### Konteks
ADR-002 dan 003 menciptakan ketergantungan pada Supabase/Vercel. Risiko PRD 11 nomor 6.

### Opsi
A. Bangun abstraction layer di atas semua API Supabase sejak awal.
   Kelebihan: teori portabilitas. Kekurangan: biaya nyata sekarang untuk manfaat hipotetis; abstraksi bocor.
B. Terima coupling, tapi jaga aset yang benar-benar penting tetap portabel: skema SQL murni (migrasi versi di repo), data (backup harian + uji restore lintas penyedia), file (bucket S3-compatible), auth (ekspor user + hash), IaC/konfigurasi terdokumentasi.
   Kelebihan: murah, menjawab kebutuhan riil (exit plan due diligence bank).
   Kekurangan: migrasi tetap proyek berminggu-minggu bila terjadi.

### Keputusan
Opsi B. Alasan dominan: yang diminta bank (dan akal sehat) adalah exit plan yang terbukti, bukan kode yang provider-agnostic.

### Konsekuensi
Langkah lanjut: jadikan "uji restore lintas penyedia" tugas berulang kuartalan (selaras PRD 9.6).

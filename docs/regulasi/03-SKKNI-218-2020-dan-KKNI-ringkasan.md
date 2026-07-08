# SKKNI Nomor 218 Tahun 2020 dan KKNI Bidang Manajemen Risiko Perbankan

## Identitas dokumen (terverifikasi)

1. SKKNI: Keputusan Menteri Ketenagakerjaan RI Nomor 218 Tahun 2020 tentang Penetapan SKKNI Kategori Aktivitas Keuangan dan Asuransi, Golongan Pokok Aktivitas Jasa Keuangan Bukan Asuransi dan Dana Pensiun, Bidang Manajemen Risiko Perbankan.
2. KKNI: Keputusan Anggota Dewan Komisioner OJK Nomor KEP-18/D.02/2021 tentang Kerangka Kualifikasi Nasional Indonesia Bidang Manajemen Risiko Perbankan.

Keduanya dirujuk eksplisit oleh SEOJK 28/2022 sebagai acuan unit kompetensi dan jenjang kualifikasi Sertifikasi Manajemen Risiko.

## Fungsi dalam arsitektur produk

- SKKNI 218/2020 berisi daftar Unit Kompetensi (UK), Elemen Kompetensi, dan Kriteria Unjuk Kerja (KUK). Ini menjadi TAKSONOMI KONTEN platform: setiap modul materi, soal try-out, dan laporan progres dipetakan ke kode UK dan KUK.
- KKNI menetapkan jenjang kualifikasi 4, 5, 6, 7 bidang manajemen risiko perbankan dan paket UK per jenjang. Ini menjadi struktur LEARNING PATH platform: satu learning path per jenjang.
- Sertifikasi harus disesuaikan dengan kegiatan usaha bank: konvensional, syariah, konvensional dengan UUS, dan entitas utama konglomerasi keuangan. Artinya konten per jenjang perlu varian track konvensional dan syariah.

## Skema database yang diturunkan dari dokumen ini

- tabel skema_sertifikasi (jenjang KKNI, track konvensional/syariah)
- tabel unit_kompetensi (kode UK, judul, jenjang)
- tabel elemen_kuk (elemen, KUK, relasi ke UK)
- relasi materi -> UK, soal -> KUK, progres user -> UK

## CATATAN: perlu dilengkapi dari PDF asli

Yang WAJIB diekstrak dari PDF SKKNI 218/2020 dan KKNI KEP-18/D.02/2021 di Drive TIER 1 (belum diverifikasi, jangan dikarang):

- Daftar lengkap kode dan judul semua Unit Kompetensi.
- Pemaketan UK per jenjang kualifikasi 4, 5, 6, dan 7.
- Rumusan Elemen dan KUK per UK (untuk pemetaan bank soal).

Setelah PDF terbaca, buat file terpisah 03a-daftar-UK-per-jenjang.md berisi tabel lengkapnya.

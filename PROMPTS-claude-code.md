# PROMPTS-claude-code.md - Template Prompt Sesi Claude Code Nuvy

Simpan file ini di root repo (atau di catatan pribadi). Copy-paste sesuai jenis sesi. Semua prompt mengasumsikan CLAUDE.md dan TASKS.md ada di root repo, dan docs/ berisi prd.md, tech-spec.md, adr/.

---

## P1. Sesi perdana (supervised, mulai T-001)

Pakai untuk 2-3 task pertama, mode didampingi.

```
Baca CLAUDE.md dan TASKS.md sampai selesai, lalu konfirmasi dalam 5 poin:
(1) tujuan produk, (2) aturan keamanan yang paling mengikat,
(3) loop kerja yang akan kamu jalankan, (4) definisi selesai,
(5) task pertama yang akan kamu ambil dan rencananya.

Setelah saya jawab "lanjut", kerjakan T-001 saja. Mode supervised:
jelaskan rencana singkat sebelum menulis kode, tunjukkan struktur folder
yang akan dibuat, dan berhenti untuk konfirmasi sebelum commit pertama.
Jangan lanjut ke T-002 tanpa persetujuan saya.
```

## P2. Sesi autonomous harian (mode utama)

Pakai setelah kalibrasi selesai.

```
Baca CLAUDE.md dan TASKS.md. Jalankan loop kerja autonomous:
kerjakan task berstatus [ ] berurutan mulai dari yang paling atas yang
dependensinya sudah [x], maksimal sampai akhir EPIC yang sedang berjalan.

Aturan sesi ini:
- Patuhi seluruh CLAUDE.md, terutama aturan keamanan dan definisi selesai.
- Satu task = satu branch = satu PR. Update status di TASKS.md setiap selesai.
- Kalau buntu atau butuh keputusan manusia: tandai [!], tulis di bagian
  BLOCKED dengan format yang ditentukan, lalu lanjut ke task lain yang
  tidak tergantung. Jangan menunggu saya.
- Di akhir sesi, tulis ringkasan: task selesai (dengan nomor PR), task
  blocked beserta pertanyaannya, dan task berikutnya di antrean.
Mulai sekarang.
```

## P3. Sesi lanjutan / resume

Pakai saat membuka sesi baru di tengah pekerjaan.

```
Baca CLAUDE.md, lalu TASKS.md. Laporkan dulu status ringkas:
berapa task [x], apakah ada [~] yang tertinggal dari sesi sebelumnya,
dan apakah ada [!] di BLOCKED.

Jika ada [~] tertinggal: periksa branch-nya, selesaikan atau bersihkan
dulu sebelum ambil task baru. Jika ada [!] yang jawabannya sudah saya
tulis di bawah barisnya, proses jawaban itu dan lanjutkan task tersebut.
Setelah itu masuk loop autonomous seperti biasa.
```

## P4. Menjawab BLOCKED

Pakai saat Anda sudah mengetik jawaban di bagian BLOCKED pada TASKS.md.

```
Saya sudah menjawab item BLOCKED di TASKS.md. Baca jawabannya,
konfirmasi pemahamanmu dalam 1-2 kalimat per item, terapkan keputusannya,
kembalikan status task terkait dari [!] ke [~], selesaikan, lalu lanjut
loop autonomous.
```

## P5. Sesi review keamanan (jalankan tiap akhir epic)

```
Jangan menulis fitur baru di sesi ini. Lakukan review keamanan atas
seluruh perubahan sejak tag/commit terakhir yang saya sebutkan:
1) Threat model mini: apakah ada trust boundary baru yang belum ada kontrolnya?
2) Periksa terhadap aturan keamanan CLAUDE.md butir 1-8 satu per satu,
   sebutkan bukti (file:baris) untuk setiap butir.
3) Jalankan test:isolation dan laporkan hasilnya.
4) Daftar temuan dengan severity (Blocker/Major/Minor/Nit) + saran perbaikan.
Temuan Blocker/Major: buat task perbaikan baru di TASKS.md di posisi paling
atas epic berjalan. Jangan memperbaiki langsung tanpa task.
```

## P6. Sesi konten/seed (non-fitur)

```
Baca CLAUDE.md. Sesi ini khusus data seed, bukan fitur.
Kerjakan task seed yang saya sebut (mis. T-084). Aturan tambahan:
konten regulasi hanya boleh diambil dari docs/ dan file yang saya
sediakan; jika sumber tidak ada, tulis placeholder bertanda
"PERLU-VERIFIKASI" dan catat di BLOCKED. Dilarang mengarang isi
regulasi, nomor peraturan, atau kode UK/KUK.
```

---

## Tips pemakaian

- Mulai hari dengan P3, bukan P2, supaya sisa sesi kemarin dibereskan dulu.
- Jadwalkan P5 setiap akhir epic (bukan hanya di akhir proyek); temuan lebih murah diperbaiki dini.
- Setiap kali Anda mengoreksi gaya/keputusan Claude lebih dari sekali untuk hal yang sama, tambahkan aturannya ke CLAUDE.md, bukan diulang di prompt.
- Simpan ringkasan akhir sesi (output P2/P3) di docs/worklog/ sebagai jejak audit pengembangan; berguna juga untuk evidence due diligence.
```

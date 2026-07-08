# Manajemen Resiko Design System v5.2 dan Font: Acuan UI Platform

Sumber kebenaran: file `manajemen-resiko-design-system.html` (dokumen interaktif lengkap berisi 27 seksi: Prinsip, Logo & Merek, Warna, Tipografi, Spacing & Grid, Radius & Elevasi, Motion, Ikon, Aksesibilitas, Voice & Konten, komponen Tombol sampai Kartu & KPI, Pola Inti, Permukaan, Tema & Token, Tata Kelola). File HTML asli dan font disimpan di repo/Drive; file ini adalah ringkasan token untuk rujukan cepat saat menulis kode dan konten.

Nama brand produk: Manajemen Resiko.

## 1. Font

- Font utama (body dan UI): Plus Jakarta Sans, dimuat sebagai font-family 'PJS', variable font weight 200 sampai 800, format woff2, font-display swap. Fallback: system-ui, sans-serif.
- Aset tersedia di `Plus_Jakarta_Sans.zip`: variable font (normal dan italic) plus static TTF ExtraLight sampai ExtraBold beserta italic. Lisensi SIL Open Font License (OFL.txt disertakan), aman dipakai komersial, embed di web, dan PWA.
- Font display (judul besar, angka KPI): 'Creato Display', fallback ke 'PJS'. PENTING: Creato Display adalah font komersial dan TIDAK disertakan dalam aset. Sebelum produksi, beli lisensi webfont Creato Display atau fallback resmi ke Plus Jakarta Sans weight 700-800 dengan letter-spacing -0.03em.
- Monospace (kode, nomor sertifikat): ui-monospace, SFMono-Regular, Menlo, Consolas, monospace.
- Karakter tipografi: ukuran UI cenderung kompak (10.5 sampai 16px pada dokumen), heading memakai letter-spacing negatif (-.03em), label kecil uppercase memakai letter-spacing .06em.

## 2. Warna inti (CSS custom properties)

Brand:
- --navy: #0A3D62 (warna ink utama), --navy-700: #082B47
- --teal: #0FA3B1 (primary action), --teal-600: #0C8593, --teal-700: #0B6B77
- --cyan: #1ECAD3 (aksen), --cyan-600: #14A7B0, --cyan-700: #11868E
- Alpha tint: --teal-10/16/24, --cyan-04/08/12/16/24 (rgba dari warna induk)

Teks (ink):
- --ink: #0A3D62, --ink-2: #3E5A6E, --ink-3: #7C93A1

Netral: --n0 #fff, --n50 #F9FAFB, --n100 #EEF3F5, --n200 #E3EAEE, --n300 #D2DDE2, --n400 #AAB9C0, --n500 #88979F, --n600 #61727A, --n700 #455257, --n800 #2A3338, --n900 #161D21

Permukaan: --surface #fff, --surface-2 #F9FAFB, --surface-3 #EEF3F5

Semantik (masing-masing punya -tint untuk latar dan -deep untuk teks di atas tint):
- --success: #1E9E6A (tint #E7F6EF, deep #15784F)
- --warning: #D9920E (tint #FBF0D8, deep #A06B07)
- --danger: #DA3B34 (tint #FBEAE8, deep #AE2A24)
- --info: #2D6FE0 (tint #E8F0FD, deep #1E54B4)
- --purple: #6D4AED (tint #EEEBFD, deep #5436C4)
- --slate: #64748B (tint #EEF1F4, deep #475063)

Gradien:
- --grad-hero: 135deg #0A3D62 0% -> #0E7E96 40% -> #0FA3B1 64% -> #1ECAD3 100%
- --grad-vivid: 120deg #0FA3B1 -> #1ECAD3
- --grad-deep: 160deg #072B47 -> #0A3D62 48% -> #0FA3B1
- --grad-soft: 135deg rgba(30,202,211,.14) -> rgba(15,163,177,.10)

## 3. Radius, elevasi, motion, layout

Radius: --r-xs 6px, --r-sm 9px, --r-md 13px, --r-lg 18px, --r-xl 26px, --r-full 999px.

Elevasi (shadow, semua berbasis navy rgba(10,61,98,x)):
- --e1: 0 1px 2px .06 + 0 1px 3px .05 (resting)
- --e2: 0 6px 16px -6px .16 + 0 2px 6px .06 (hover/dropdown)
- --e3: 0 16px 36px -12px .22 + 0 3px 10px .06 (modal/popover)
- --e-cyan: 0 10px 26px -8px rgba(18,163,180,.45) (glow untuk CTA primer)

Motion: --ease cubic-bezier(.22,.61,.36,1) untuk transisi umum; --spring cubic-bezier(.34,1.42,.64,1) untuk elemen playful (toggle, chip).

Layout: --maxw 1200px (lebar konten maksimum), --rail 288px (lebar sidebar/rail navigasi).

## 4. Inventori komponen yang sudah didefinisikan di dokumen

Tombol (primary teal, secondary, ghost, danger), Form & Input (input group, switch, radio, segmented control), Badge/Tag/Chip, Avatar, Tooltip & Menu, Alert & Toast (4 varian semantik), Navigasi (appbar, rail), Tabs/Breadcrumb/Stepper, Progress & Skeleton, Accordion, Tabel & Empty State, Kartu & KPI (termasuk ring progress SVG). Gunakan kelas dan pola dari dokumen HTML, jangan mendesain ulang komponen yang sudah ada.

## 5. Aturan pakai untuk platform Manajemen Resiko (training SMR)

- Teal #0FA3B1 hanya untuk aksi primer dan status aktif; navy #0A3D62 untuk teks utama dan header; cyan untuk aksen dekoratif dan gradien, bukan teks.
- Status sertifikat di certificate vault dipetakan ke token semantik: aktif = success, akan kedaluwarsa (< 90 hari) = warning, kedaluwarsa = danger, dalam proses penyetaraan = info.
- Kontras: teks di atas tint memakai varian -deep, bukan warna dasar. Ikuti seksi Aksesibilitas dokumen (target WCAG AA).
- Semua UI berbahasa Indonesia mengikuti seksi Voice & Konten; istilah regulasi (SMR, UK, KUK, KKNI) tidak diterjemahkan.
- Multi tenant: branding tenant (logo, warna aksen) meng-override token terbatas (--teal dan turunannya) lewat theming layer di seksi Tema & Token, komponen lain tetap.

## 6. Implementasi teknis (Next.js/Tailwind)

- Muat Plus Jakarta Sans via next/font/local dari file variable TTF di repo (subset latin), expose sebagai CSS variable --font, jangan pakai base64 inline seperti di dokumen HTML (itu hanya untuk portabilitas dokumen).
- Terjemahkan token di atas ke Tailwind theme (colors, borderRadius, boxShadow, transitionTimingFunction) satu kali di `tailwind.config`/`globals.css`, jadikan satu-satunya sumber nilai; dilarang hardcode hex di komponen.
- Simpan `manajemen-resiko-design-system.html` di repo (folder /docs/design) sebagai living reference; perubahan token harus lewat file itu dulu (sesuai seksi Tata Kelola).

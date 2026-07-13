# Test E2E (Playwright) — rencana

Belum dijalankan di CI (butuh app berjalan + user tenant tersemai + Supabase
Auth). Ditambahkan bersama harness Playwright pada iterasi berikutnya.

## Skenario wajib (T-024 & tech-spec §9)

1. **Isolasi lintas tenant → 404/403**: user tenant A membuka resource milik
   tenant B (mis. `/admin/tenants/<id-B>/edit`, halaman sertifikat) harus
   menerima 404 (`notFound()`, tidak membocorkan eksistensi) — bukan data.
2. **Guard peran**: `peserta`/`asesor` membuka `/admin/*` → 403 (`forbidden()`).
   Tanpa sesi → redirect `/login`. Admin tanpa AAL2 → dipaksa `/mfa/*`.
3. Alur penuh: undangan → onboarding → belajar → try-out → vault → reminder
   (dengan clock injection).

## Cakupan saat ini (sudah otomatis)

- **RLS lintas tenant** dibuktikan oleh `tests/isolation/*` (pglite) — dasar dari
  perilaku 404: query lintas tenant mengembalikan 0 baris → halaman `notFound()`.
- **Logika guard peran** diuji unit: `tests/unit/guard.test.ts` (`roleAllowed`).
- Pola halaman: `app/not-found.tsx` (404) & `app/forbidden.tsx` (403) seragam.

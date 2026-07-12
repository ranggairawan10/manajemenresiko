import { defineConfig } from 'vitest/config';

/**
 * Konfigurasi terpisah untuk test isolasi tenant (T-005). Dijalankan sebagai
 * gate tersendiri (`pnpm test:isolation`) dan job CI terpisah `test-isolation`.
 * Memakai pglite (Postgres WASM in-process) — tanpa Docker/Postgres eksternal.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/isolation/**/*.test.ts'],
    // pglite berjalan lebih andal di satu proses fork.
    pool: 'forks',
  },
});

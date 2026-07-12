import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyMigration,
  createIsolationDb,
  makeTenantFixtures,
  type IsolationDb,
  type TenantFixtures,
} from './helpers';

/**
 * T-011: tabel taksonomi master tidak punya tenant_id. Pola RLS: SELECT untuk
 * semua authenticated, tulis hanya admin_platform. Seed 6 skema + 2 track wajib
 * idempotent. Test menerapkan migrasi identity (menyediakan auth_role() &
 * set_updated_at) lalu taxonomy, memakai klaim JWT dari fixtures.
 */

let db: IsolationDb;
let fx: TenantFixtures;

beforeEach(async () => {
  db = await createIsolationDb();
  fx = makeTenantFixtures();
  await applyMigration(db, 'identity');
  await applyMigration(db, 'taxonomy');
});

afterEach(async () => {
  await db.close();
});

describe('seed master taksonomi (DoD idempotent)', () => {
  it('menghasilkan 6 skema + 2 track', async () => {
    const s = await db.query<{ n: number }>('select count(*)::int as n from public.schemes');
    const t = await db.query<{ n: number }>('select count(*)::int as n from public.tracks');
    expect(s.rows[0]?.n).toBe(6);
    expect(t.rows[0]?.n).toBe(2);
  });

  it('seed dijalankan ulang tidak menduplikasi (idempotent)', async () => {
    await db.exec('select public.seed_master_taxonomy();');
    await db.exec('select public.seed_master_taxonomy();');
    const s = await db.query<{ n: number }>('select count(*)::int as n from public.schemes');
    const t = await db.query<{ n: number }>('select count(*)::int as n from public.tracks');
    expect(s.rows[0]?.n).toBe(6);
    expect(t.rows[0]?.n).toBe(2);
  });

  it('memuat KKNI 4-7 reguler + FT 6,7', async () => {
    const r = await db.query<{ kkni_level: number; is_fast_track: boolean }>(
      'select kkni_level, is_fast_track from public.schemes order by kkni_level, is_fast_track',
    );
    expect(r.rows).toEqual([
      { kkni_level: 4, is_fast_track: false },
      { kkni_level: 5, is_fast_track: false },
      { kkni_level: 6, is_fast_track: false },
      { kkni_level: 6, is_fast_track: true },
      { kkni_level: 7, is_fast_track: false },
      { kkni_level: 7, is_fast_track: true },
    ]);
  });
});

describe('RLS master: baca authenticated', () => {
  it('peserta (tenant apa pun) dapat membaca skema & track', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const s = await query<{ n: number }>('select count(*)::int as n from public.schemes');
      const t = await query<{ n: number }>('select count(*)::int as n from public.tracks');
      expect(s.rows[0]?.n).toBe(6);
      expect(t.rows[0]?.n).toBe(2);
    });
  });

  it('asesor dapat membaca unit_kompetensi/modules/units (kosong, tanpa error)', async () => {
    await db.asUser(fx.usersB.asesor, async ({ query }) => {
      const uk = await query('select 1 from public.unit_kompetensi');
      const u = await query('select 1 from public.units');
      expect(uk.rows.length).toBe(0);
      expect(u.rows.length).toBe(0);
    });
  });
});

describe('RLS master: tulis hanya admin_platform', () => {
  it('peserta TIDAK bisa menulis skema', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      await expect(
        query('insert into public.schemes (kkni_level, is_fast_track) values (8, false)'),
      ).rejects.toThrow();
    });
  });

  it('admin_tenant TIDAK bisa menulis skema', async () => {
    await db.asUser(fx.usersA.admin_tenant, async ({ query }) => {
      await expect(
        query('insert into public.schemes (kkni_level, is_fast_track) values (8, false)'),
      ).rejects.toThrow();
    });
  });

  it('admin_platform bisa menulis skema & unit_kompetensi', async () => {
    // scheme_id acuan diambil sebagai superuser.
    const scheme = await db.query<{ id: string }>(
      'select id from public.schemes where kkni_level = 5 and is_fast_track = false',
    );
    const schemeId = scheme.rows[0]!.id;

    await db.asUser(fx.usersA.admin_platform, async ({ query }) => {
      const ins = await query(
        'insert into public.schemes (kkni_level, is_fast_track) values (8, false)',
      );
      expect(ins.affectedRows).toBe(1);

      const uk = await query(
        'insert into public.unit_kompetensi (scheme_id, kode_uk, judul) values ($1, $2, $3)',
        [schemeId, 'UK.SMR.001', 'Menerapkan Kerangka Manajemen Risiko'],
      );
      expect(uk.affectedRows).toBe(1);
    });
  });

  it('admin_platform dapat memperbarui seluruh skema (master global, bukan per-tenant)', async () => {
    await db.asUser(fx.usersB.admin_platform, async ({ query }) => {
      const upd = await query('update public.schemes set is_fast_track = is_fast_track');
      expect(upd.affectedRows).toBe(6);
    });
  });
});

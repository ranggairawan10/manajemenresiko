import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assertCrossTenantDenied,
  createIsolationDb,
  makeTenantFixtures,
  USER_ROLES,
  type IsolationDb,
  type TenantFixtures,
} from './helpers';

/**
 * Tabel contoh untuk membuktikan mekanisme harness (DoD T-005: "harness jalan
 * terhadap tabel contoh"). Pola RLS-nya identik dengan yang akan dipakai tabel
 * domain di T-010+ : RLS enabled + FORCE, isolasi via auth_tenant() dari klaim.
 */
const SAMPLE_DDL = `
  create table sample_documents (
    id         uuid primary key default gen_random_uuid(),
    tenant_id  uuid not null,
    owner_id   uuid not null default auth.uid(),
    body       text not null
  );
  alter table sample_documents enable row level security;
  alter table sample_documents force row level security;
  grant select, insert, update, delete on sample_documents to authenticated;

  create policy sample_tenant_isolation on sample_documents
    for all
    using (tenant_id = auth_tenant())
    with check (tenant_id = auth_tenant());
`;

const ROW_A = 'aaaa0000-0000-4000-8000-0000000000aa';
const ROW_B = 'bbbb0000-0000-4000-8000-0000000000bb';

let db: IsolationDb;
let fx: TenantFixtures;

beforeEach(async () => {
  db = await createIsolationDb();
  fx = makeTenantFixtures();
  await db.exec(SAMPLE_DDL);
  // Seed sebagai superuser (BYPASSRLS): satu dokumen per tenant.
  await db.query(
    'insert into sample_documents (id, tenant_id, owner_id, body) values ($1,$2,$3,$4)',
    [ROW_A, fx.tenantA, fx.usersA.peserta.id, 'dokumen milik tenant A'],
  );
  await db.query(
    'insert into sample_documents (id, tenant_id, owner_id, body) values ($1,$2,$3,$4)',
    [ROW_B, fx.tenantB, fx.usersB.peserta.id, 'dokumen milik tenant B'],
  );
});

afterEach(async () => {
  await db.close();
});

describe('isolasi tenant pada sample_documents', () => {
  it('setiap role tenant A hanya melihat baris tenant A', async () => {
    for (const role of USER_ROLES) {
      await db.asUser(fx.usersA[role], async ({ query }) => {
        const r = await query<{ tenant_id: string }>('select tenant_id from sample_documents');
        expect(r.rows.length, `role ${role} harus lihat tepat 1 baris`).toBe(1);
        expect(r.rows[0]?.tenant_id).toBe(fx.tenantA);
      });
    }
  });

  it('setiap role tenant B hanya melihat baris tenant B', async () => {
    for (const role of USER_ROLES) {
      await db.asUser(fx.usersB[role], async ({ query }) => {
        const r = await query<{ tenant_id: string }>('select tenant_id from sample_documents');
        expect(r.rows.length).toBe(1);
        expect(r.rows[0]?.tenant_id).toBe(fx.tenantB);
      });
    }
  });

  it('user dapat menulis di dalam tenant sendiri', async () => {
    await db.asUser(fx.usersA.admin_tenant, async ({ query }) => {
      const ins = await query('insert into sample_documents (tenant_id, body) values ($1,$2)', [
        fx.tenantA,
        'dokumen baru A',
      ]);
      expect(ins.affectedRows).toBe(1);
      const upd = await query('update sample_documents set body = $1 where id = $2', [
        'diperbarui',
        ROW_A,
      ]);
      expect(upd.affectedRows).toBe(1);
      const all = await query('select 1 from sample_documents');
      expect(all.rows.length, 'tetap hanya lihat baris tenant sendiri (2 setelah insert)').toBe(2);
    });
  });

  it('assertCrossTenantDenied: tiap role tenant A ditolak atas baris tenant B', async () => {
    for (const role of USER_ROLES) {
      await assertCrossTenantDenied(db, fx.usersA[role], {
        tenantId: fx.tenantB,
        rowId: ROW_B,
      });
    }
  });

  it('assertCrossTenantDenied: tiap role tenant B ditolak atas baris tenant A', async () => {
    for (const role of USER_ROLES) {
      await assertCrossTenantDenied(db, fx.usersB[role], {
        tenantId: fx.tenantA,
        rowId: ROW_A,
      });
    }
  });

  it('admin_platform tetap terpagari RLS tenant (akses lintas tenant hanya break-glass server-side)', async () => {
    await db.asUser(fx.usersA.admin_platform, async ({ query }) => {
      const r = await query('select 1 from sample_documents where tenant_id = $1', [fx.tenantB]);
      expect(r.rows.length, 'admin_platform tenant A TIDAK boleh lihat data tenant B via RLS').toBe(
        0,
      );
    });
  });

  it('tanpa klaim (anon/tak set) tidak melihat baris apa pun', async () => {
    // Tidak memakai asUser: set role authenticated tanpa klaim tenant.
    await db.exec("select set_config('request.jwt.claims', '{}', false); set role authenticated;");
    const r = await db.query('select 1 from sample_documents');
    await db.exec('reset role;');
    expect(r.rows.length, 'tanpa tenant_id di klaim, RLS menolak semua').toBe(0);
  });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyMigration,
  createIsolationDb,
  makeTenantFixtures,
  type IsolationDb,
  type TenantFixtures,
} from './helpers';

/**
 * T-014: certificate vault (kelas Rahasia) + refreshment_logs + audit_log
 * append-only + consents. Menguji isolasi tenant/kepemilikan, admin_platform
 * TIDAK punya akses vault via RLS, dan sifat append-only audit_log.
 */

let db: IsolationDb;
let fx: TenantFixtures;
let certA: string;

async function scalar(sql: string, params?: unknown[]): Promise<string> {
  const r = await db.query<{ id: string }>(sql, params);
  return r.rows[0]!.id;
}

beforeEach(async () => {
  db = await createIsolationDb();
  fx = makeTenantFixtures();
  await applyMigration(db, 'identity');
  await applyMigration(db, 'vault');

  await db.query('insert into public.tenants (id, name, slug) values ($1,$2,$3),($4,$5,$6)', [
    fx.tenantA,
    'Tenant A',
    'tenant-a',
    fx.tenantB,
    'Tenant B',
    'tenant-b',
  ]);
  for (const u of fx.allUsers) {
    await db.query('insert into auth.users (id, email) values ($1,$2)', [u.id, `${u.id}@x.test`]);
  }

  // Sertifikat milik peserta A dan peserta B (nomor_enc = ciphertext placeholder).
  certA = await scalar(
    "insert into public.certificates (tenant_id, user_id, kind, nomor_enc) values ($1,$2,'smr_kkni','\\xDEADBEEF'::bytea) returning id",
    [fx.tenantA, fx.usersA.peserta.id],
  );
  await db.query(
    "insert into public.certificates (tenant_id, user_id, kind, nomor_enc) values ($1,$2,'smr_kkni','\\xCAFE'::bytea)",
    [fx.tenantB, fx.usersB.peserta.id],
  );
});

afterEach(async () => {
  await db.close();
});

describe('RLS certificates (vault)', () => {
  it('peserta melihat sertifikat sendiri, bukan tenant lain', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const r = await query<{ tenant_id: string }>('select tenant_id from public.certificates');
      expect(r.rows.length).toBe(1);
      expect(r.rows[0]?.tenant_id).toBe(fx.tenantA);
    });
  });

  it('admin_tenant melihat sertifikat tenantnya, bukan tenant lain', async () => {
    await db.asUser(fx.usersA.admin_tenant, async ({ query }) => {
      const own = await query('select 1 from public.certificates');
      expect(own.rows.length).toBe(1);
      const other = await query('select 1 from public.certificates where tenant_id = $1', [
        fx.tenantB,
      ]);
      expect(other.rows.length).toBe(0);
    });
  });

  it('admin_platform TIDAK mengakses vault via RLS (break-glass terpisah)', async () => {
    await db.asUser(fx.usersA.admin_platform, async ({ query }) => {
      const r = await query('select 1 from public.certificates');
      expect(r.rows.length).toBe(0);
    });
  });

  it('peserta B tidak dapat membaca nomor_enc milik A', async () => {
    await db.asUser(fx.usersB.peserta, async ({ query }) => {
      const r = await query('select nomor_enc from public.certificates where id = $1', [certA]);
      expect(r.rows.length).toBe(0);
    });
  });

  it('peserta tidak bisa membuat sertifikat untuk tenant lain', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const ok = await query(
        "insert into public.certificates (tenant_id, user_id, kind) values ($1,$2,'lainnya')",
        [fx.tenantA, fx.usersA.peserta.id],
      );
      expect(ok.affectedRows).toBe(1);
      await expect(
        query(
          "insert into public.certificates (tenant_id, user_id, kind) values ($1,$2,'lainnya')",
          [fx.tenantB, fx.usersB.peserta.id],
        ),
      ).rejects.toThrow();
    });
  });
});

describe('audit_log append-only', () => {
  beforeEach(async () => {
    await db.query(
      "insert into public.audit_log (tenant_id, actor_id, action, resource) values ($1,$2,'login','auth'),($3,$4,'export','report')",
      [fx.tenantA, fx.usersA.peserta.id, fx.tenantB, fx.usersB.peserta.id],
    );
  });

  it('UPDATE dan DELETE ditolak (bahkan sebagai superuser/server)', async () => {
    await expect(db.query("update public.audit_log set action = 'x'")).rejects.toThrow();
    await expect(db.query('delete from public.audit_log')).rejects.toThrow();
  });

  it('admin_tenant membaca audit tenantnya saja; peserta tidak membaca', async () => {
    await db.asUser(fx.usersA.admin_tenant, async ({ query }) => {
      const r = await query<{ tenant_id: string }>('select tenant_id from public.audit_log');
      expect(r.rows.length).toBe(1);
      expect(r.rows[0]?.tenant_id).toBe(fx.tenantA);
    });
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const r = await query('select 1 from public.audit_log');
      expect(r.rows.length).toBe(0);
    });
  });

  it('admin_platform membaca seluruh audit lintas tenant', async () => {
    await db.asUser(fx.usersA.admin_platform, async ({ query }) => {
      const r = await query('select 1 from public.audit_log');
      expect(r.rows.length).toBe(2);
    });
  });
});

describe('consents (milik sendiri)', () => {
  it('user menyimpan & melihat consent sendiri; tak melihat milik lain', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const ins = await query(
        "insert into public.consents (user_id, doc_version) values ($1,'v1')",
        [fx.usersA.peserta.id],
      );
      expect(ins.affectedRows).toBe(1);
      const own = await query('select 1 from public.consents');
      expect(own.rows.length).toBe(1);
    });
    await db.asUser(fx.usersB.peserta, async ({ query }) => {
      const r = await query('select 1 from public.consents');
      expect(r.rows.length).toBe(0);
    });
  });

  it('user tidak bisa menyimpan consent atas nama user lain', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      await expect(
        query("insert into public.consents (user_id, doc_version) values ($1,'v1')", [
          fx.usersB.peserta.id,
        ]),
      ).rejects.toThrow();
    });
  });
});

describe('refreshment_logs', () => {
  beforeEach(async () => {
    await db.query(
      "insert into public.refreshment_logs (tenant_id, certificate_id, activity_date, bentuk) values ($1,$2, current_date, 'seminar')",
      [fx.tenantA, certA],
    );
  });

  it('pemilik sertifikat melihat log refreshmentnya; tenant lain tidak', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const r = await query('select 1 from public.refreshment_logs');
      expect(r.rows.length).toBe(1);
    });
    await db.asUser(fx.usersB.peserta, async ({ query }) => {
      const r = await query('select 1 from public.refreshment_logs');
      expect(r.rows.length).toBe(0);
    });
  });
});

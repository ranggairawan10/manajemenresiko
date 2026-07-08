import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyMigration,
  createIsolationDb,
  makeTenantFixtures,
  type IsolationDb,
  type TenantFixtures,
} from './helpers';

/**
 * Test isolasi untuk migrasi identitas nyata (T-010): tenants, profiles,
 * invitations, custom_access_token_hook. Menerapkan file migrasi asli ke pglite
 * lalu memverifikasi RLS lintas tenant, guard eskalasi hak, dan hook klaim JWT.
 */

const SPARE_USER = 'cccccccc-0000-4000-8000-000000000001';

let db: IsolationDb;
let fx: TenantFixtures;

beforeEach(async () => {
  db = await createIsolationDb();
  fx = makeTenantFixtures();
  await applyMigration(db, 'identity');

  // Seed sebagai superuser (bypass RLS + guard).
  await db.query('insert into public.tenants (id, name, slug) values ($1,$2,$3),($4,$5,$6)', [
    fx.tenantA,
    'Tenant A',
    'tenant-a',
    fx.tenantB,
    'Tenant B',
    'tenant-b',
  ]);

  for (const u of fx.allUsers) {
    await db.query('insert into auth.users (id, email) values ($1,$2)', [
      u.id,
      `${u.role}@${u.tenantId === fx.tenantA ? 'a' : 'b'}.test`,
    ]);
    await db.query(
      'insert into public.profiles (user_id, tenant_id, role, full_name) values ($1,$2,$3,$4)',
      [u.id, u.tenantId, u.role, `${u.role} ${u.tenantId === fx.tenantA ? 'A' : 'B'}`],
    );
  }
  // User cadangan tanpa profil (untuk uji insert lintas tenant tanpa gagal FK).
  await db.query('insert into auth.users (id, email) values ($1,$2)', [SPARE_USER, 'spare@x.test']);

  await db.query(
    `insert into public.invitations (tenant_id, email, role, token_hash, expires_at) values
       ($1,$2,'peserta',$3, now() + interval '7 days'),
       ($4,$5,'peserta',$6, now() + interval '7 days')`,
    [fx.tenantA, 'undang-a@x.test', 'hash-a', fx.tenantB, 'undang-b@x.test', 'hash-b'],
  );
});

afterEach(async () => {
  await db.close();
});

describe('custom_access_token_hook (DoD: klaim muncul di JWT)', () => {
  async function runHook(userId: string): Promise<Record<string, unknown>> {
    await db.exec('set role supabase_auth_admin;');
    try {
      const res = await db.query<{ out: { claims: Record<string, unknown> } }>(
        'select public.custom_access_token_hook($1::jsonb) as out',
        [JSON.stringify({ user_id: userId, claims: {} })],
      );
      return res.rows[0]!.out.claims;
    } finally {
      await db.exec('reset role;');
    }
  }

  it('menyuntik tenant_id & user_role top-level dari profiles', async () => {
    const claims = await runHook(fx.usersA.asesor.id);
    expect(claims.tenant_id).toBe(fx.tenantA);
    expect(claims.user_role).toBe('asesor');
  });

  it('user tanpa profil tidak memperoleh klaim tenant', async () => {
    const claims = await runHook(SPARE_USER);
    expect(claims.tenant_id).toBeUndefined();
    expect(claims.user_role).toBeUndefined();
  });
});

describe('RLS profiles', () => {
  it('peserta hanya melihat profil sendiri', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const r = await query<{ user_id: string }>('select user_id from public.profiles');
      expect(r.rows.length).toBe(1);
      expect(r.rows[0]?.user_id).toBe(fx.usersA.peserta.id);
    });
  });

  it('admin_tenant melihat semua profil tenantnya (4), bukan tenant lain', async () => {
    await db.asUser(fx.usersA.admin_tenant, async ({ query }) => {
      const own = await query('select 1 from public.profiles');
      expect(own.rows.length).toBe(4);
      const other = await query('select 1 from public.profiles where tenant_id = $1', [fx.tenantB]);
      expect(other.rows.length).toBe(0);
    });
  });

  it('admin_tenant A tidak bisa membaca/mengubah/menyisipkan profil tenant B', async () => {
    await db.asUser(fx.usersA.admin_tenant, async ({ query }) => {
      const sel = await query('select 1 from public.profiles where user_id = $1', [
        fx.usersB.peserta.id,
      ]);
      expect(sel.rows.length).toBe(0);

      const upd = await query("update public.profiles set full_name = 'x' where user_id = $1", [
        fx.usersB.peserta.id,
      ]);
      expect(upd.affectedRows).toBe(0);

      await expect(
        query('insert into public.profiles (user_id, tenant_id, role) values ($1,$2,$3)', [
          SPARE_USER,
          fx.tenantB,
          'peserta',
        ]),
      ).rejects.toThrow();
    });
  });

  it('peserta bisa memperbarui profil sendiri (kolom non-privileged)', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const upd = await query(
        "update public.profiles set job_title = 'Analis' where user_id = $1",
        [fx.usersA.peserta.id],
      );
      expect(upd.affectedRows).toBe(1);
    });
  });

  it('peserta TIDAK bisa menaikkan role sendiri (guard eskalasi)', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      await expect(
        query("update public.profiles set role = 'admin_tenant' where user_id = $1", [
          fx.usersA.peserta.id,
        ]),
      ).rejects.toThrow();
    });
  });

  it('peserta TIDAK bisa memindahkan tenant sendiri (guard)', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      await expect(
        query('update public.profiles set tenant_id = $1 where user_id = $2', [
          fx.tenantB,
          fx.usersA.peserta.id,
        ]),
      ).rejects.toThrow();
    });
  });

  it('admin_tenant bisa ubah role anggota, tapi TIDAK ke admin_platform', async () => {
    await db.asUser(fx.usersA.admin_tenant, async ({ query }) => {
      const ok = await query("update public.profiles set role = 'asesor' where user_id = $1", [
        fx.usersA.peserta.id,
      ]);
      expect(ok.affectedRows).toBe(1);

      await expect(
        query("update public.profiles set role = 'admin_platform' where user_id = $1", [
          fx.usersA.peserta.id,
        ]),
      ).rejects.toThrow();
    });
  });
});

describe('RLS invitations', () => {
  it('admin_tenant mengelola undangan tenantnya', async () => {
    await db.asUser(fx.usersA.admin_tenant, async ({ query }) => {
      const sel = await query('select 1 from public.invitations');
      expect(sel.rows.length).toBe(1);
      const ins = await query(
        `insert into public.invitations (tenant_id, email, role, token_hash, expires_at)
           values ($1, 'baru@x.test', 'peserta', 'hash-baru', now() + interval '7 days')`,
        [fx.tenantA],
      );
      expect(ins.affectedRows).toBe(1);
    });
  });

  it('peserta tidak melihat undangan sama sekali', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const r = await query('select 1 from public.invitations');
      expect(r.rows.length).toBe(0);
    });
  });

  it('admin_tenant A tidak melihat / membuat undangan tenant B', async () => {
    await db.asUser(fx.usersA.admin_tenant, async ({ query }) => {
      const sel = await query('select 1 from public.invitations where tenant_id = $1', [
        fx.tenantB,
      ]);
      expect(sel.rows.length).toBe(0);

      await expect(
        query(
          `insert into public.invitations (tenant_id, email, role, token_hash, expires_at)
             values ($1, 'jahat@x.test', 'peserta', 'hash-jahat', now() + interval '7 days')`,
          [fx.tenantB],
        ),
      ).rejects.toThrow();
    });
  });
});

describe('RLS tenants', () => {
  it('anggota melihat tenant sendiri saja', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const own = await query<{ id: string }>('select id from public.tenants');
      expect(own.rows.length).toBe(1);
      expect(own.rows[0]?.id).toBe(fx.tenantA);
    });
  });

  it('admin_platform melihat semua tenant', async () => {
    await db.asUser(fx.usersA.admin_platform, async ({ query }) => {
      const r = await query('select 1 from public.tenants');
      expect(r.rows.length).toBe(2);
    });
  });

  it('admin_tenant TIDAK bisa menulis tenant; admin_platform bisa', async () => {
    await db.asUser(fx.usersA.admin_tenant, async ({ query }) => {
      const upd = await query("update public.tenants set name = 'Ubah' where id = $1", [
        fx.tenantA,
      ]);
      expect(upd.affectedRows).toBe(0);
      await expect(
        query("insert into public.tenants (name, slug) values ('X', 'x')"),
      ).rejects.toThrow();
    });

    await db.asUser(fx.usersA.admin_platform, async ({ query }) => {
      const ins = await query("insert into public.tenants (name, slug) values ('Baru', 'baru')");
      expect(ins.affectedRows).toBe(1);
    });
  });
});

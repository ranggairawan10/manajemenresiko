import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { expect } from 'vitest';

/**
 * Harness test isolasi tenant (T-005).
 *
 * Menjalankan Postgres asli (WASM) via pglite di dalam proses — tanpa Docker.
 * Meniru environment RLS Supabase: role `authenticated`, custom claim JWT
 * (`request.jwt.claims`), dan fungsi `auth.uid()` / `auth_role()` /
 * `auth_tenant()` sesuai tech-spec, sehingga policy yang ditulis di sini identik
 * dengan yang dipakai migrasi domain nyata (T-010+).
 *
 * Aturan (CLAUDE.md): tenant_id & role HANYA dari klaim JWT, tidak pernah dari
 * parameter request. Harness menyuntikkan klaim lalu `SET ROLE authenticated`
 * agar RLS (dengan FORCE) benar-benar dievaluasi.
 */

export const USER_ROLES = ['peserta', 'asesor', 'admin_tenant', 'admin_platform'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface TestUser {
  id: string;
  tenantId: string;
  role: UserRole;
}

export interface TenantFixtures {
  tenantA: string;
  tenantB: string;
  /** user per role untuk tenant A */
  usersA: Record<UserRole, TestUser>;
  /** user per role untuk tenant B */
  usersB: Record<UserRole, TestUser>;
  /** seluruh 8 user (2 tenant x 4 role) */
  allUsers: TestUser[];
}

export interface QueryResult<T> {
  rows: T[];
  affectedRows: number;
}

export interface UserContext {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

export interface IsolationDb {
  readonly pg: PGlite;
  /** DDL/seed sebagai superuser (BYPASSRLS). */
  exec(sql: string): Promise<void>;
  /** Query berparameter sebagai superuser. */
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  /** Jalankan fn dalam konteks satu user: set klaim JWT + SET ROLE authenticated. */
  asUser<T>(user: TestUser, fn: (ctx: UserContext) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const AUTH_BOOTSTRAP = `
  create schema if not exists auth;

  create or replace function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  $$;

  create or replace function auth.uid() returns uuid language sql stable as $$
    select nullif(auth.jwt() ->> 'sub', '')::uuid;
  $$;

  create or replace function auth.role() returns text language sql stable as $$
    select auth.jwt() ->> 'role';
  $$;

  -- Sesuai tech-spec: user_role & tenant_id dibawa sebagai custom claim.
  create or replace function auth_role() returns text language sql stable as $$
    select auth.jwt() ->> 'user_role';
  $$;

  create or replace function auth_tenant() returns uuid language sql stable as $$
    select nullif(auth.jwt() ->> 'tenant_id', '')::uuid;
  $$;

  -- Role standar yang disediakan platform Supabase (bukan dibuat migrasi kita).
  do $$
  declare r text;
  begin
    foreach r in array array['anon', 'authenticated', 'service_role', 'supabase_auth_admin']
    loop
      if not exists (select 1 from pg_roles where rolname = r) then
        execute format('create role %I nologin noinherit', r);
      end if;
    end loop;
  end $$;

  -- Stub minimal auth.users (di platform nyata disediakan Supabase Auth).
  create table if not exists auth.users (
    id                 uuid primary key,
    email              text,
    raw_app_meta_data  jsonb not null default '{}'::jsonb,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at         timestamptz not null default now()
  );

  grant usage on schema auth to anon, authenticated, service_role, supabase_auth_admin;
`;

export async function createIsolationDb(): Promise<IsolationDb> {
  const pg = await PGlite.create();
  await pg.exec(AUTH_BOOTSTRAP);

  const query = async <T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> => {
    const r = await pg.query<T>(text, params);
    return { rows: r.rows, affectedRows: r.affectedRows ?? 0 };
  };

  return {
    pg,
    async exec(sql: string) {
      await pg.exec(sql);
    },
    query,
    async asUser<T>(user: TestUser, fn: (ctx: UserContext) => Promise<T>): Promise<T> {
      const claims = JSON.stringify({
        sub: user.id,
        tenant_id: user.tenantId,
        user_role: user.role,
        role: 'authenticated',
      });
      await pg.query("select set_config('request.jwt.claims', $1, false)", [claims]);
      await pg.exec('set role authenticated;');
      try {
        return await fn({ query });
      } finally {
        await pg.exec('reset role;');
        await pg.query("select set_config('request.jwt.claims', '', false)");
      }
    },
    async close() {
      await pg.close();
    },
  };
}

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

function usersFor(tenantId: string, prefix: string): Record<UserRole, TestUser> {
  const entries = USER_ROLES.map((role, i) => {
    const id = `${prefix}-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
    return [role, { id, tenantId, role }] as const;
  });
  return Object.fromEntries(entries) as Record<UserRole, TestUser>;
}

/**
 * Terapkan file migrasi domain nyata dari supabase/migrations ke harness.
 * `suffix` mencocokkan akhiran nama file, mis. 'identity' untuk
 * `<timestamp>_identity.sql`. Ini memastikan test menguji artefak migrasi yang
 * benar-benar di-push ke Supabase, bukan salinan yang mudah menyimpang.
 */
export async function applyMigration(db: IsolationDb, suffix: string): Promise<void> {
  const dir = join(process.cwd(), 'supabase', 'migrations');
  const file = readdirSync(dir).find((f) => f.endsWith(`_${suffix}.sql`));
  if (!file) {
    throw new Error(`Migrasi *_${suffix}.sql tidak ditemukan di ${dir}`);
  }
  await db.exec(readFileSync(join(dir, file), 'utf8'));
}

export function makeTenantFixtures(): TenantFixtures {
  const usersA = usersFor(TENANT_A, 'aaaaaaaa');
  const usersB = usersFor(TENANT_B, 'bbbbbbbb');
  return {
    tenantA: TENANT_A,
    tenantB: TENANT_B,
    usersA,
    usersB,
    allUsers: [...Object.values(usersA), ...Object.values(usersB)],
  };
}

/**
 * Assertion inti yang dipakai lintas tabel ber-RLS: seorang `intruder` dari
 * tenant lain TIDAK boleh membaca, mengubah, menghapus baris milik `victim`,
 * maupun menyisipkan baris atas nama tenant korban.
 *
 * Mengasumsikan konvensi kolom (id uuid, tenant_id uuid, <bodyColumn> text) —
 * konvensi yang dipakai tabel domain sejak T-010.
 */
export async function assertCrossTenantDenied(
  db: IsolationDb,
  intruder: TestUser,
  victim: { tenantId: string; rowId: string },
  opts: { table?: string; bodyColumn?: string } = {},
): Promise<void> {
  const table = opts.table ?? 'sample_documents';
  const body = opts.bodyColumn ?? 'body';
  if (intruder.tenantId === victim.tenantId) {
    throw new Error('assertCrossTenantDenied: intruder dan victim berada di tenant yang sama');
  }

  await db.asUser(intruder, async ({ query }) => {
    const sel = await query(`select 1 from ${table} where id = $1`, [victim.rowId]);
    expect(sel.rows.length, `SELECT lintas tenant harus 0 baris (${table})`).toBe(0);

    const upd = await query(`update ${table} set ${body} = 'diretas' where id = $1`, [
      victim.rowId,
    ]);
    expect(upd.affectedRows, `UPDATE lintas tenant harus 0 baris (${table})`).toBe(0);

    const del = await query(`delete from ${table} where id = $1`, [victim.rowId]);
    expect(del.affectedRows, `DELETE lintas tenant harus 0 baris (${table})`).toBe(0);

    await expect(
      query(`insert into ${table} (tenant_id, ${body}) values ($1, 'selundupan')`, [
        victim.tenantId,
      ]),
      `INSERT atas nama tenant lain harus ditolak WITH CHECK (${table})`,
    ).rejects.toThrow();
  });
}

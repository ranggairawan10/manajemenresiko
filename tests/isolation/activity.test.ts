import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyMigration,
  createIsolationDb,
  makeTenantFixtures,
  type IsolationDb,
  type TenantFixtures,
} from './helpers';

/**
 * T-013: aktivitas belajar per tenant. Menguji isolasi tenant + kepemilikan,
 * immutability attempt_answers setelah submit, dan guard anti-cheat skor.
 */

let db: IsolationDb;
let fx: TenantFixtures;
let pathId: string;
let unitId: string;
let blueprintId: string;
let questionId: string;
let optionId: string;

async function scalar(sql: string, params?: unknown[]): Promise<string> {
  const r = await db.query<{ id: string }>(sql, params);
  return r.rows[0]!.id;
}

beforeEach(async () => {
  db = await createIsolationDb();
  fx = makeTenantFixtures();
  await applyMigration(db, 'identity');
  await applyMigration(db, 'taxonomy');
  await applyMigration(db, 'question_bank');
  await applyMigration(db, 'activity');

  // Seed sebagai superuser.
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

  const schemeId = await scalar(
    'select id from public.schemes where kkni_level = 5 and is_fast_track = false',
  );
  const trackId = await scalar("select id from public.tracks where code = 'konvensional'");
  pathId = await scalar(
    "insert into public.learning_paths (scheme_id, track_id, title, status) values ($1,$2,'Path 1','published') returning id",
    [schemeId, trackId],
  );
  const moduleId = await scalar(
    "insert into public.modules (path_id, ordinal, title) values ($1,1,'Modul 1') returning id",
    [pathId],
  );
  unitId = await scalar(
    "insert into public.units (module_id, ordinal, type) values ($1,1,'rich_text') returning id",
    [moduleId],
  );
  blueprintId = await scalar(
    'insert into public.exam_blueprints (scheme_id, track_id, n_questions, duration_min) values ($1,$2,10,60) returning id',
    [schemeId, trackId],
  );
  const ukId = await scalar(
    "insert into public.unit_kompetensi (scheme_id, kode_uk, judul) values ($1,'UK.01','UK 1') returning id",
    [schemeId],
  );
  const elemenId = await scalar(
    "insert into public.elemen (uk_id, judul) values ($1,'E1') returning id",
    [ukId],
  );
  const kukId = await scalar(
    "insert into public.kuk (elemen_id, deskripsi) values ($1,'KUK 1') returning id",
    [elemenId],
  );
  questionId = await scalar(
    "insert into public.questions (kuk_id, track_id, stem, status) values ($1,$2,'Soal','published') returning id",
    [kukId, trackId],
  );
  optionId = await scalar(
    "insert into public.question_options (question_id, label, body, is_correct) values ($1,'A','A',true) returning id",
    [questionId],
  );
});

afterEach(async () => {
  await db.close();
});

async function startAttempt(user = fx.usersA.peserta): Promise<string> {
  return db.asUser(user, async ({ query }) => {
    const r = await query<{ id: string }>(
      "insert into public.attempts (tenant_id, user_id, blueprint_id, mode) values ($1,$2,$3,'latihan') returning id",
      [user.tenantId, user.id, blueprintId],
    );
    return r.rows[0]!.id;
  });
}

describe('RLS isolasi per-tenant', () => {
  it('unit_progress: pemilik kelola sendiri, tenant lain ditolak', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const ins = await query(
        "insert into public.unit_progress (tenant_id, user_id, unit_id, status) values ($1,$2,$3,'selesai')",
        [fx.tenantA, fx.usersA.peserta.id, unitId],
      );
      expect(ins.affectedRows).toBe(1);
    });
    // peserta B tidak melihat progress tenant A.
    await db.asUser(fx.usersB.peserta, async ({ query }) => {
      const r = await query('select 1 from public.unit_progress');
      expect(r.rows.length).toBe(0);
    });
  });

  it('unit_progress: user tidak bisa menulis progress atas nama user lain', async () => {
    await db.asUser(fx.usersA.asesor, async ({ query }) => {
      await expect(
        query(
          "insert into public.unit_progress (tenant_id, user_id, unit_id, status) values ($1,$2,$3,'selesai')",
          [fx.tenantA, fx.usersA.peserta.id, unitId],
        ),
      ).rejects.toThrow();
    });
  });

  it('enrollments: admin_tenant assign di tenantnya, tak bisa lintas tenant', async () => {
    await db.asUser(fx.usersA.admin_tenant, async ({ query }) => {
      const ok = await query(
        'insert into public.enrollments (tenant_id, user_id, path_id, assigned_by) values ($1,$2,$3,$4)',
        [fx.tenantA, fx.usersA.peserta.id, pathId, fx.usersA.admin_tenant.id],
      );
      expect(ok.affectedRows).toBe(1);

      await expect(
        query('insert into public.enrollments (tenant_id, user_id, path_id) values ($1,$2,$3)', [
          fx.tenantB,
          fx.usersB.peserta.id,
          pathId,
        ]),
      ).rejects.toThrow();
    });
  });

  it('attempts: peserta tenant lain tidak melihat attempt milik A', async () => {
    await startAttempt(fx.usersA.peserta);
    await db.asUser(fx.usersB.peserta, async ({ query }) => {
      const r = await query('select 1 from public.attempts');
      expect(r.rows.length).toBe(0);
    });
  });

  it('attempt_answers: user lain tidak bisa menyisipkan/melihat jawaban attempt A', async () => {
    const attemptId = await startAttempt(fx.usersA.peserta);
    await db.asUser(fx.usersB.peserta, async ({ query }) => {
      await expect(
        query(
          'insert into public.attempt_answers (attempt_id, question_id, option_id) values ($1,$2,$3)',
          [attemptId, questionId, optionId],
        ),
      ).rejects.toThrow();
      const sel = await query('select 1 from public.attempt_answers where attempt_id = $1', [
        attemptId,
      ]);
      expect(sel.rows.length).toBe(0);
    });
  });
});

describe('immutability attempt_answers setelah submit', () => {
  it('bisa insert/update sebelum submit, ditolak setelah submit', async () => {
    const attemptId = await startAttempt(fx.usersA.peserta);

    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const ins = await query(
        'insert into public.attempt_answers (attempt_id, question_id, option_id) values ($1,$2,$3)',
        [attemptId, questionId, optionId],
      );
      expect(ins.affectedRows).toBe(1);
      const upd = await query(
        'update public.attempt_answers set option_id = $1 where attempt_id = $2',
        [optionId, attemptId],
      );
      expect(upd.affectedRows).toBe(1);

      // Submit (klien boleh set submitted_at, bukan score).
      const sub = await query('update public.attempts set submitted_at = now() where id = $1', [
        attemptId,
      ]);
      expect(sub.affectedRows).toBe(1);

      // Setelah submit: semua mutasi jawaban ditolak.
      await expect(
        query('update public.attempt_answers set option_id = $1 where attempt_id = $2', [
          optionId,
          attemptId,
        ]),
      ).rejects.toThrow();
      await expect(
        query('delete from public.attempt_answers where attempt_id = $1', [attemptId]),
      ).rejects.toThrow();
      await expect(
        query(
          'insert into public.attempt_answers (attempt_id, question_id, option_id) values ($1,$2,$3)',
          [attemptId, questionId, optionId],
        ),
      ).rejects.toThrow();
    });
  });
});

describe('guard anti-cheat: skor', () => {
  it('klien tidak bisa menetapkan score saat insert attempt', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      await expect(
        query(
          "insert into public.attempts (tenant_id, user_id, blueprint_id, mode, score) values ($1,$2,$3,'simulasi',99)",
          [fx.tenantA, fx.usersA.peserta.id, blueprintId],
        ),
      ).rejects.toThrow();
    });
  });

  it('klien tidak bisa mengubah score attempt sendiri', async () => {
    const attemptId = await startAttempt(fx.usersA.peserta);
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      await expect(
        query('update public.attempts set score = 100 where id = $1', [attemptId]),
      ).rejects.toThrow();
    });
  });

  it('server (bypass) dapat menetapkan score', async () => {
    const attemptId = await startAttempt(fx.usersA.peserta);
    const upd = await db.query('update public.attempts set score = 85.5 where id = $1', [
      attemptId,
    ]);
    expect(upd.affectedRows).toBe(1);
  });
});

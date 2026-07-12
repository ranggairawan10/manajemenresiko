import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyMigration,
  createIsolationDb,
  makeTenantFixtures,
  type IsolationDb,
  type TenantFixtures,
} from './helpers';

/**
 * T-012 (aturan keamanan #4): question_options.is_correct TIDAK PERNAH bisa
 * diakses role klien. questions & question_options adalah tabel server-only;
 * klien hanya lewat view aman tanpa is_correct/explanation. Test membuktikan:
 * (a) klien ditolak akses tabel dasar, (b) view tak memuat is_correct,
 * (c) server (bypass RLS) tetap membaca is_correct untuk penilaian.
 */

let db: IsolationDb;
let fx: TenantFixtures;
let questionId: string;
let draftQuestionId: string;
let schemeId: string;
let trackId: string;

beforeEach(async () => {
  db = await createIsolationDb();
  fx = makeTenantFixtures();
  await applyMigration(db, 'identity');
  await applyMigration(db, 'taxonomy');
  await applyMigration(db, 'question_bank');

  // Seed taksonomi turunan + soal, sebagai superuser (bypass RLS).
  schemeId = (
    await db.query<{ id: string }>(
      'select id from public.schemes where kkni_level = 5 and is_fast_track = false',
    )
  ).rows[0]!.id;
  trackId = (
    await db.query<{ id: string }>("select id from public.tracks where code = 'konvensional'")
  ).rows[0]!.id;

  const ukId = (
    await db.query<{ id: string }>(
      'insert into public.unit_kompetensi (scheme_id, kode_uk, judul) values ($1,$2,$3) returning id',
      [schemeId, 'UK.SMR.01', 'Kerangka Manajemen Risiko'],
    )
  ).rows[0]!.id;
  const elemenId = (
    await db.query<{ id: string }>(
      'insert into public.elemen (uk_id, judul) values ($1,$2) returning id',
      [ukId, 'Mengidentifikasi risiko'],
    )
  ).rows[0]!.id;
  const kukId = (
    await db.query<{ id: string }>(
      'insert into public.kuk (elemen_id, deskripsi) values ($1,$2) returning id',
      [elemenId, 'Risiko diidentifikasi sesuai prosedur'],
    )
  ).rows[0]!.id;

  questionId = (
    await db.query<{ id: string }>(
      "insert into public.questions (kuk_id, track_id, stem, explanation, status) values ($1,$2,$3,$4,'published') returning id",
      [kukId, trackId, 'Manakah definisi risiko?', 'Pembahasan rahasia'],
    )
  ).rows[0]!.id;
  await db.query(
    `insert into public.question_options (question_id, label, body, is_correct) values
       ($1,'A','Opsi A benar', true),
       ($1,'B','Opsi B', false),
       ($1,'C','Opsi C', false),
       ($1,'D','Opsi D', false)`,
    [questionId],
  );

  draftQuestionId = (
    await db.query<{ id: string }>(
      "insert into public.questions (kuk_id, track_id, stem, status) values ($1,$2,'Soal draft','draft') returning id",
      [kukId, trackId],
    )
  ).rows[0]!.id;
  await db.query(
    "insert into public.question_options (question_id, label, body, is_correct) values ($1,'A','x',true)",
    [draftQuestionId],
  );
});

afterEach(async () => {
  await db.close();
});

describe('kunci jawaban server-only (rule #4)', () => {
  it('semua role klien DITOLAK SELECT question_options', async () => {
    for (const role of ['peserta', 'asesor', 'admin_tenant', 'admin_platform'] as const) {
      await db.asUser(fx.usersA[role], async ({ query }) => {
        await expect(query('select is_correct from public.question_options')).rejects.toThrow();
      });
    }
  });

  it('klien DITOLAK SELECT tabel questions (dasar)', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      await expect(query('select * from public.questions')).rejects.toThrow();
    });
  });

  it('view aman tidak memiliki kolom is_correct', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      await expect(query('select is_correct from public.v_question_options')).rejects.toThrow();
    });
  });
});

describe('view aman untuk klien', () => {
  it('v_question_options mengembalikan hanya kolom aman (tanpa is_correct)', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const r = await query<Record<string, unknown>>(
        'select * from public.v_question_options where question_id = $1 order by label',
        [questionId],
      );
      expect(r.rows.length).toBe(4);
      expect(r.rows[0]).toHaveProperty('label');
      expect(r.rows[0]).toHaveProperty('body');
      expect(r.rows[0]).not.toHaveProperty('is_correct');
    });
  });

  it('v_questions memuat stem tanpa explanation, hanya soal published', async () => {
    await db.asUser(fx.usersB.peserta, async ({ query }) => {
      const r = await query<Record<string, unknown>>('select * from public.v_questions');
      expect(r.rows.length).toBe(1);
      expect(r.rows[0]).toHaveProperty('stem');
      expect(r.rows[0]).not.toHaveProperty('explanation');
      expect(r.rows[0]?.id).toBe(questionId);
    });
  });

  it('view tidak mengekspos opsi soal non-published', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const r = await query('select 1 from public.v_question_options where question_id = $1', [
        draftQuestionId,
      ]);
      expect(r.rows.length).toBe(0);
    });
  });
});

describe('server (service_role) membaca kunci jawaban', () => {
  it('server-side (bypass RLS) melihat is_correct untuk penilaian', async () => {
    // Superuser mewakili batas server (service_role) yang bypass RLS.
    const r = await db.query<{ n: number }>(
      'select count(*) filter (where is_correct) as n from public.question_options where question_id = $1',
      [questionId],
    );
    expect(Number(r.rows[0]?.n)).toBe(1);
  });
});

describe('exam_blueprints (master: baca authenticated, tulis admin_platform)', () => {
  beforeEach(async () => {
    await db.query(
      'insert into public.exam_blueprints (scheme_id, track_id, n_questions, duration_min) values ($1,$2,20,90)',
      [schemeId, trackId],
    );
  });

  it('peserta dapat membaca blueprint', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      const r = await query('select 1 from public.exam_blueprints');
      expect(r.rows.length).toBe(1);
    });
  });

  it('peserta TIDAK dapat menulis blueprint', async () => {
    await db.asUser(fx.usersA.peserta, async ({ query }) => {
      await expect(
        query(
          'insert into public.exam_blueprints (scheme_id, track_id, n_questions, duration_min) values ($1,$2,10,60)',
          [schemeId, trackId],
        ),
      ).rejects.toThrow();
    });
  });

  it('admin_platform dapat menulis blueprint', async () => {
    await db.asUser(fx.usersA.admin_platform, async ({ query }) => {
      const ins = await query(
        'insert into public.exam_blueprints (scheme_id, track_id, n_questions, duration_min) values ($1,$2,30,120)',
        [schemeId, trackId],
      );
      expect(ins.affectedRows).toBe(1);
    });
  });
});

-- =============================================================================
-- T-012 Bank soal: questions, question_options (is_correct), exam_blueprints.
-- =============================================================================
-- KEAMANAN (CLAUDE.md aturan #4 — tidak bisa dinegosiasikan):
--   question_options.is_correct TIDAK PERNAH melewati batas server. questions &
--   question_options adalah tabel SERVER-ONLY: RLS enabled + FORCE, seluruh hak
--   dicabut dari anon/authenticated. Hanya service_role (server) yang mengakses
--   untuk penilaian & authoring. Klien membaca lewat VIEW aman tanpa is_correct
--   (dan tanpa explanation/pembahasan — hanya diberikan setelah menjawab, T-040).
--   exam_blueprints memakai pola master (baca authenticated, tulis admin_platform).
-- Bergantung: identity (auth_role) + taxonomy (kuk, tracks, schemes).
-- Down migration: supabase/down/20260709001902_question_bank.sql
-- =============================================================================

create type public.question_difficulty as enum ('mudah', 'sedang', 'sulit');

-- ========================= QUESTIONS (server-only) =========================
create table public.questions (
  id          uuid primary key default gen_random_uuid(),
  kuk_id      uuid not null references public.kuk (id) on delete restrict,
  track_id    uuid not null references public.tracks (id) on delete restrict,
  difficulty  public.question_difficulty not null default 'sedang',
  stem        text not null,
  explanation text,
  status      text not null default 'draft' check (status in ('draft', 'review', 'published', 'retired')),
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index questions_kuk_idx on public.questions (kuk_id);
create index questions_track_idx on public.questions (track_id);
alter table public.questions enable row level security;
alter table public.questions force row level security;
create trigger questions_set_updated_at before update on public.questions
  for each row execute function public.set_updated_at();

-- ==================== QUESTION_OPTIONS (server-only, kunci jawaban) ====================
create table public.question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  label       text not null,
  body        text not null,
  is_correct  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (question_id, label)
);
create index question_options_question_idx on public.question_options (question_id);
alter table public.question_options enable row level security;
alter table public.question_options force row level security;

-- Kunci total dari klien: cabut semua hak dari anon & authenticated. Tanpa
-- policy apa pun -> default tertutup. service_role (server) bypass RLS.
revoke all on public.questions from anon, authenticated;
revoke all on public.question_options from anon, authenticated;

-- ==================== VIEW AMAN UNTUK KLIEN ====================
-- View owner-rights (bukan security_invoker): membaca tabel server-only sebagai
-- pemilik dan hanya mengekspos kolom aman. is_correct & explanation TIDAK ada.
create view public.v_questions as
  select id, kuk_id, track_id, difficulty, stem, status, version
  from public.questions
  where status = 'published';

create view public.v_question_options as
  select qo.id, qo.question_id, qo.label, qo.body
  from public.question_options qo
  join public.questions q on q.id = qo.question_id
  where q.status = 'published';

grant select on public.v_questions to authenticated;
grant select on public.v_question_options to authenticated;

-- ========================= EXAM_BLUEPRINTS (master) =========================
create table public.exam_blueprints (
  id           uuid primary key default gen_random_uuid(),
  scheme_id    uuid not null references public.schemes (id) on delete restrict,
  track_id     uuid not null references public.tracks (id) on delete restrict,
  n_questions  int not null check (n_questions > 0),
  duration_min int not null check (duration_min > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index exam_blueprints_scheme_track_idx on public.exam_blueprints (scheme_id, track_id);
alter table public.exam_blueprints enable row level security;
alter table public.exam_blueprints force row level security;
create trigger exam_blueprints_set_updated_at before update on public.exam_blueprints
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.exam_blueprints to authenticated;
create policy exam_blueprints_read on public.exam_blueprints for select
  to authenticated using (true);
create policy exam_blueprints_write on public.exam_blueprints for all
  to authenticated
  using (public.auth_role() = 'admin_platform')
  with check (public.auth_role() = 'admin_platform');

-- =============================================================================
-- T-013 Aktivitas belajar (per tenant): enrollments, unit_progress, attempts,
-- attempt_answers. RLS + FORCE, isolasi tenant + kepemilikan user.
-- =============================================================================
-- Integritas (anti-cheat):
--   * attempt_answers IMMUTABLE setelah attempt disubmit (trigger tolak
--     insert/update/delete bila attempts.submitted_at not null).
--   * score & uk_breakdown hanya boleh ditetapkan server (service_role);
--     klien tidak bisa memanipulasi skor.
-- Bergantung: identity (auth helpers, auth.users), taxonomy (learning_paths,
-- units), question_bank (questions, question_options, exam_blueprints).
-- Down migration: supabase/down/20260709005030_activity.sql
-- =============================================================================

create type public.enrollment_mode as enum ('bebas', 'berurutan');
create type public.attempt_mode as enum ('latihan', 'simulasi');
create type public.progress_status as enum ('belum', 'sedang', 'selesai');

-- ========================= ENROLLMENTS =========================
create table public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  path_id     uuid not null references public.learning_paths (id) on delete restrict,
  mode        public.enrollment_mode not null default 'berurutan',
  assigned_by uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, user_id, path_id)
);
create index enrollments_user_idx on public.enrollments (tenant_id, user_id);
alter table public.enrollments enable row level security;
alter table public.enrollments force row level security;

-- ========================= UNIT_PROGRESS =========================
create table public.unit_progress (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  unit_id      uuid not null references public.units (id) on delete cascade,
  status       public.progress_status not null default 'belum',
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (tenant_id, user_id, unit_id)
);
create index unit_progress_user_idx on public.unit_progress (tenant_id, user_id);
alter table public.unit_progress enable row level security;
alter table public.unit_progress force row level security;
create trigger unit_progress_set_updated_at before update on public.unit_progress
  for each row execute function public.set_updated_at();

-- ========================= ATTEMPTS =========================
create table public.attempts (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  blueprint_id uuid not null references public.exam_blueprints (id) on delete restrict,
  mode         public.attempt_mode not null,
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  score        numeric(6, 2),
  uk_breakdown jsonb,
  seed         bigint,
  created_at   timestamptz not null default now()
);
create index attempts_user_idx on public.attempts (tenant_id, user_id);
alter table public.attempts enable row level security;
alter table public.attempts force row level security;

-- Guard skor: klien tak boleh menetapkan/mengubah score & uk_breakdown.
create or replace function public.attempts_guard_scoring() returns trigger language plpgsql as $$
begin
  if current_user not in ('service_role', 'supabase_admin', 'postgres') then
    if tg_op = 'INSERT' and (new.score is not null or new.uk_breakdown is not null) then
      raise exception 'score/uk_breakdown hanya ditetapkan server' using errcode = '42501';
    elsif tg_op = 'UPDATE'
      and (new.score is distinct from old.score or new.uk_breakdown is distinct from old.uk_breakdown)
    then
      raise exception 'score/uk_breakdown hanya ditetapkan server' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger attempts_guard_scoring before insert or update on public.attempts
  for each row execute function public.attempts_guard_scoring();

-- ========================= ATTEMPT_ANSWERS =========================
create table public.attempt_answers (
  id          uuid primary key default gen_random_uuid(),
  attempt_id  uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete restrict,
  option_id   uuid references public.question_options (id) on delete restrict,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);
create index attempt_answers_attempt_idx on public.attempt_answers (attempt_id);
alter table public.attempt_answers enable row level security;
alter table public.attempt_answers force row level security;

-- Helper isolasi: attempt_answers tak punya tenant_id; kepemilikan diturunkan
-- dari attempts. SECURITY DEFINER agar tak bergantung RLS attempts.
create or replace function public.attempt_belongs_to_caller(p_attempt uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.attempts a
    where a.id = p_attempt
      and a.tenant_id = public.auth_tenant_id()
      and a.user_id = auth.uid()
  );
$$;

-- Immutability: setelah attempt disubmit, jawaban tak bisa berubah (semua role).
create or replace function public.attempt_answers_guard_immutable() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_submitted timestamptz;
begin
  select submitted_at into v_submitted
  from public.attempts where id = coalesce(new.attempt_id, old.attempt_id);
  if v_submitted is not null then
    raise exception 'attempt sudah disubmit: attempt_answers immutable' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger attempt_answers_immutable
  before insert or update or delete on public.attempt_answers
  for each row execute function public.attempt_answers_guard_immutable();

-- ========================= GRANTS =========================
grant select, insert, update, delete
  on public.enrollments, public.unit_progress, public.attempts, public.attempt_answers
  to authenticated;
grant execute on function public.attempt_belongs_to_caller(uuid) to authenticated;

-- ========================= POLICIES =========================
-- enrollments: anggota lihat sendiri / admin_tenant lihat tenant; tulis admin_tenant.
create policy enrollments_select on public.enrollments for select using (
  tenant_id = public.auth_tenant_id()
  and (user_id = auth.uid() or public.auth_role() = 'admin_tenant')
);
create policy enrollments_write on public.enrollments for all
  using (tenant_id = public.auth_tenant_id() and public.auth_role() = 'admin_tenant')
  with check (tenant_id = public.auth_tenant_id() and public.auth_role() = 'admin_tenant');

-- unit_progress: pemilik kelola progres sendiri; admin_tenant baca.
create policy unit_progress_select on public.unit_progress for select using (
  tenant_id = public.auth_tenant_id()
  and (user_id = auth.uid() or public.auth_role() = 'admin_tenant')
);
create policy unit_progress_write on public.unit_progress for all
  using (tenant_id = public.auth_tenant_id() and user_id = auth.uid())
  with check (tenant_id = public.auth_tenant_id() and user_id = auth.uid());

-- attempts: pemilik kelola; admin_tenant baca. Hapus tidak diizinkan klien.
create policy attempts_select on public.attempts for select using (
  tenant_id = public.auth_tenant_id()
  and (user_id = auth.uid() or public.auth_role() = 'admin_tenant')
);
create policy attempts_insert on public.attempts for insert with check (
  tenant_id = public.auth_tenant_id() and user_id = auth.uid()
);
create policy attempts_update on public.attempts for update
  using (tenant_id = public.auth_tenant_id() and user_id = auth.uid())
  with check (tenant_id = public.auth_tenant_id() and user_id = auth.uid());

-- attempt_answers: hanya pemilik attempt (isolasi via helper definer).
create policy attempt_answers_select on public.attempt_answers for select
  using (public.attempt_belongs_to_caller(attempt_id));
create policy attempt_answers_insert on public.attempt_answers for insert
  with check (public.attempt_belongs_to_caller(attempt_id));
create policy attempt_answers_update on public.attempt_answers for update
  using (public.attempt_belongs_to_caller(attempt_id))
  with check (public.attempt_belongs_to_caller(attempt_id));
create policy attempt_answers_delete on public.attempt_answers for delete
  using (public.attempt_belongs_to_caller(attempt_id));

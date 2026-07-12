-- =============================================================================
-- T-011 Taksonomi konten master (tanpa tenant_id).
-- =============================================================================
-- Pola RLS master (tech-spec 6 aturan 3): SELECT untuk authenticated, tulis
-- hanya admin_platform. RLS enabled + FORCE pada semua tabel. Seed 6 skema +
-- 2 track, idempotent (fungsi seed_master_taxonomy, on conflict do nothing).
-- Bergantung pada migrasi identity (auth_role(), set_updated_at, role platform).
-- Down migration: supabase/down/20260708224036_taxonomy.sql
-- =============================================================================

-- ========================= ENUM =========================
create type public.track_code as enum ('konvensional', 'syariah');
create type public.unit_type as enum ('rich_text', 'video', 'document', 'quiz');

-- ========================= TABEL =========================
-- schemes: 4,5,6,7 (reguler) + FT 6,7 (fast track). Kunci alami (level, ft).
create table public.schemes (
  id            uuid primary key default gen_random_uuid(),
  kkni_level    int not null check (kkni_level between 1 and 9),
  is_fast_track boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (kkni_level, is_fast_track)
);

create table public.tracks (
  id         uuid primary key default gen_random_uuid(),
  code       public.track_code not null unique,
  created_at timestamptz not null default now()
);

create table public.unit_kompetensi (
  id         uuid primary key default gen_random_uuid(),
  scheme_id  uuid not null references public.schemes (id) on delete cascade,
  kode_uk    text not null,
  judul      text not null,
  created_at timestamptz not null default now(),
  unique (scheme_id, kode_uk)
);

create table public.elemen (
  id         uuid primary key default gen_random_uuid(),
  uk_id      uuid not null references public.unit_kompetensi (id) on delete cascade,
  judul      text not null,
  created_at timestamptz not null default now()
);

create table public.kuk (
  id         uuid primary key default gen_random_uuid(),
  elemen_id  uuid not null references public.elemen (id) on delete cascade,
  deskripsi  text not null,
  created_at timestamptz not null default now()
);

create table public.learning_paths (
  id         uuid primary key default gen_random_uuid(),
  scheme_id  uuid not null references public.schemes (id) on delete restrict,
  track_id   uuid not null references public.tracks (id) on delete restrict,
  title      text not null,
  version    int not null default 1,
  status     text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index learning_paths_scheme_track_idx on public.learning_paths (scheme_id, track_id);
create trigger learning_paths_set_updated_at before update on public.learning_paths
  for each row execute function public.set_updated_at();

-- "order" adalah kata kunci SQL -> kolom dinamai ordinal.
create table public.modules (
  id         uuid primary key default gen_random_uuid(),
  path_id    uuid not null references public.learning_paths (id) on delete cascade,
  ordinal    int not null,
  title      text not null,
  created_at timestamptz not null default now(),
  unique (path_id, ordinal)
);

create table public.units (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references public.modules (id) on delete cascade,
  ordinal     int not null,
  type        public.unit_type not null,
  content_ref text,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  unique (module_id, ordinal)
);

-- ========================= RLS + POLICIES =========================
-- Pola sama untuk 8 tabel master: baca authenticated, tulis admin_platform.
do $$
declare t text;
begin
  foreach t in array array[
    'schemes','tracks','unit_kompetensi','elemen','kuk',
    'learning_paths','modules','units'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy %1$s_read on public.%1$I for select to authenticated using (true)', t);
    execute format(
      'create policy %1$s_write on public.%1$I for all to authenticated '
      'using (public.auth_role() = ''admin_platform'') '
      'with check (public.auth_role() = ''admin_platform'')', t);
  end loop;
end $$;

-- ========================= SEED (idempotent) =========================
create or replace function public.seed_master_taxonomy() returns void language plpgsql as $$
begin
  insert into public.schemes (kkni_level, is_fast_track) values
    (4, false), (5, false), (6, false), (7, false), (6, true), (7, true)
  on conflict (kkni_level, is_fast_track) do nothing;

  insert into public.tracks (code) values ('konvensional'), ('syariah')
  on conflict (code) do nothing;
end;
$$;

select public.seed_master_taxonomy();

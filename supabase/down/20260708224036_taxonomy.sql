-- =============================================================================
-- DOWN migration untuk 20260708224036_taxonomy.sql (T-011).
-- =============================================================================
-- Rollback manual (bukan dijalankan `supabase db push`). Urutan terbalik.
-- =============================================================================

drop function if exists public.seed_master_taxonomy();

drop table if exists public.units cascade;
drop table if exists public.modules cascade;
drop table if exists public.learning_paths cascade;
drop table if exists public.kuk cascade;
drop table if exists public.elemen cascade;
drop table if exists public.unit_kompetensi cascade;
drop table if exists public.tracks cascade;
drop table if exists public.schemes cascade;

drop type if exists public.unit_type;
drop type if exists public.track_code;

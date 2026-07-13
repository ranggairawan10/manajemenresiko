-- =============================================================================
-- DOWN migration untuk 20260709005030_activity.sql (T-013).
-- =============================================================================
-- Rollback manual (bukan dijalankan `supabase db push`). Urutan terbalik.
-- =============================================================================

drop table if exists public.attempt_answers cascade;
drop table if exists public.attempts cascade;
drop table if exists public.unit_progress cascade;
drop table if exists public.enrollments cascade;

drop function if exists public.attempt_answers_guard_immutable();
drop function if exists public.attempt_belongs_to_caller(uuid);
drop function if exists public.attempts_guard_scoring();

drop type if exists public.progress_status;
drop type if exists public.attempt_mode;
drop type if exists public.enrollment_mode;

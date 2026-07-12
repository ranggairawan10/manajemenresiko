-- =============================================================================
-- DOWN migration untuk 20260709001902_question_bank.sql (T-012).
-- =============================================================================
-- Rollback manual (bukan dijalankan `supabase db push`). Urutan terbalik.
-- =============================================================================

drop view if exists public.v_question_options;
drop view if exists public.v_questions;

drop table if exists public.question_options cascade;
drop table if exists public.questions cascade;
drop table if exists public.exam_blueprints cascade;

drop type if exists public.question_difficulty;

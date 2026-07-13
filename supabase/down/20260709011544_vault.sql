-- =============================================================================
-- DOWN migration untuk 20260709011544_vault.sql (T-014).
-- =============================================================================
-- Rollback manual (bukan dijalankan `supabase db push`). Urutan terbalik.
-- =============================================================================

drop table if exists public.consents cascade;
drop table if exists public.audit_log cascade;
drop table if exists public.refreshment_logs cascade;
drop table if exists public.certificates cascade;

drop function if exists public.reject_mutation();

drop type if exists public.recognition_status;
drop type if exists public.refreshment_source;
drop type if exists public.refreshment_bentuk;
drop type if exists public.penyetaraan_status;
drop type if exists public.cert_kind;

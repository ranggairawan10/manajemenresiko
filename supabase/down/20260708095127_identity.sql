-- =============================================================================
-- DOWN migration untuk 20260708095127_identity.sql (T-010).
-- =============================================================================
-- Rollback manual (bukan dijalankan oleh `supabase db push`). Urutan terbalik.
-- Jalankan mis. via: psql "$DB_URL" -f supabase/down/20260708095127_identity.sql
-- =============================================================================

drop function if exists public.custom_access_token_hook(jsonb);

-- Tabel (beserta policy, index, trigger-nya) dihapus cascade.
drop table if exists public.invitations cascade;
drop table if exists public.profiles cascade;
drop table if exists public.tenants cascade;

drop function if exists public.profiles_guard_privileged();
drop function if exists public.set_updated_at();
drop function if exists public.auth_role();
drop function if exists public.auth_tenant_id();

drop type if exists public.user_role;

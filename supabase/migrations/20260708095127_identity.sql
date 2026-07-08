-- =============================================================================
-- T-010 Identitas: tenants, profiles, invitations + custom access token hook.
-- =============================================================================
-- Aturan (CLAUDE.md / tech-spec bab 6):
--   * RLS enabled + FORCE pada semua tabel domain; default tertutup.
--   * tenant_id & user_role HANYA dari klaim JWT (top-level), disuntik oleh
--     custom_access_token_hook dari profiles. Tidak pernah dari request body.
--   * admin_platform TIDAK mengakses data tenant lewat RLS (break-glass terpisah).
-- Down migration: supabase/down/20260708095127_identity.sql
-- =============================================================================

-- ========================= ENUM ROLE =========================
create type public.user_role as enum ('peserta', 'asesor', 'admin_tenant', 'admin_platform');

-- ==================== HELPER KLAIM (tech-spec 6) ====================
create or replace function public.auth_tenant_id() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::uuid;
$$;

create or replace function public.auth_role() returns text language sql stable as $$
  select current_setting('request.jwt.claims', true)::jsonb ->> 'user_role';
$$;

-- ==================== updated_at otomatis ====================
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ========================= TENANTS =========================
create table public.tenants (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  logo_url     text,
  accent_color text,
  settings     jsonb not null default '{}'::jsonb,
  status       text not null default 'active' check (status in ('active', 'suspended')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.tenants enable row level security;
alter table public.tenants force row level security;
create trigger tenants_set_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();

-- ========================= PROFILES =========================
create table public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  tenant_id  uuid not null references public.tenants (id) on delete restrict,
  full_name  text,
  role       public.user_role not null default 'peserta',
  job_title  text,
  unit_kerja text,
  status     text not null default 'active' check (status in ('active', 'suspended', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_tenant_id_idx on public.profiles (tenant_id);
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Guard eskalasi hak: role/tenant_id tidak bisa diubah sembarang oleh non-admin.
create or replace function public.profiles_guard_privileged() returns trigger language plpgsql as $$
begin
  if current_user not in ('service_role', 'supabase_admin', 'postgres') then
    if new.tenant_id is distinct from old.tenant_id then
      raise exception 'tenant_id profil tidak boleh diubah' using errcode = '42501';
    end if;
    if new.role is distinct from old.role then
      if public.auth_role() <> 'admin_tenant' then
        raise exception 'perubahan role hanya oleh admin_tenant' using errcode = '42501';
      end if;
      if new.role = 'admin_platform' then
        raise exception 'admin_tenant tidak boleh menetapkan admin_platform' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard_privileged();

-- ========================= INVITATIONS =========================
create table public.invitations (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  email      text not null,
  role       public.user_role not null default 'peserta',
  token_hash text not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index invitations_tenant_id_idx on public.invitations (tenant_id);
create unique index invitations_token_hash_idx on public.invitations (token_hash);
alter table public.invitations enable row level security;
alter table public.invitations force row level security;

-- ========================= GRANTS DASAR =========================
-- Kapabilitas tabel untuk role klien; baris tetap difilter RLS di bawah.
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.tenants to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.invitations to authenticated;

-- ========================= POLICIES =========================
-- tenants: anggota lihat tenant sendiri; hanya admin_platform yang menulis.
create policy tenants_select on public.tenants for select using (
  id = public.auth_tenant_id() or public.auth_role() = 'admin_platform'
);
create policy tenants_write on public.tenants for all
  using (public.auth_role() = 'admin_platform')
  with check (public.auth_role() = 'admin_platform');

-- profiles: pemilik, atau admin_tenant pada tenant yang sama.
create policy profiles_select on public.profiles for select using (
  user_id = auth.uid()
  or (tenant_id = public.auth_tenant_id() and public.auth_role() = 'admin_tenant')
);
create policy profiles_insert on public.profiles for insert with check (
  tenant_id = public.auth_tenant_id() and public.auth_role() = 'admin_tenant'
);
create policy profiles_update on public.profiles for update
  using (
    user_id = auth.uid()
    or (tenant_id = public.auth_tenant_id() and public.auth_role() = 'admin_tenant')
  )
  with check (tenant_id = public.auth_tenant_id());
create policy profiles_delete on public.profiles for delete using (
  tenant_id = public.auth_tenant_id() and public.auth_role() = 'admin_tenant'
);

-- invitations: hanya admin_tenant mengelola undangan pada tenant-nya.
create policy invitations_all on public.invitations for all
  using (tenant_id = public.auth_tenant_id() and public.auth_role() = 'admin_tenant')
  with check (tenant_id = public.auth_tenant_id() and public.auth_role() = 'admin_tenant');

-- ==================== CUSTOM ACCESS TOKEN HOOK ====================
-- Menyuntik tenant_id & user_role (top-level) ke klaim JWT dari profiles.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  v_tenant uuid;
  v_role   public.user_role;
  claims   jsonb;
begin
  select tenant_id, role into v_tenant, v_role
  from public.profiles
  where user_id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);
  if v_tenant is not null then
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(v_tenant::text));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role::text));
  end if;
  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Hanya supabase_auth_admin yang boleh mengeksekusi hook.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- Hook membaca profiles saat penerbitan token; beri jalur baca khusus untuk
-- supabase_auth_admin (FORCE RLS menutup akses default).
grant select on public.profiles to supabase_auth_admin;
create policy profiles_auth_admin_read on public.profiles for select
  to supabase_auth_admin using (true);

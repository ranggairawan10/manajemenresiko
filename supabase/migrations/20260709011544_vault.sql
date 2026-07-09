-- =============================================================================
-- T-014 Certificate vault & refreshment (per tenant; kelas Rahasia) + audit_log
-- append-only + consents.
-- =============================================================================
-- Enkripsi nomor sertifikat:
--   certificates.nomor_enc menyimpan CIPHERTEXT (bytea). Enkripsi/dekripsi
--   dilakukan di SERVER memakai kunci di Supabase Vault (library, bukan kripto
--   custom — PRD 9 / ADR: logika sensitif hanya di server). Migrasi ini tidak
--   memuat kripto agar bebas ekstensi & teruji isolasi; CRUD server (T-050/051)
--   mengisi nomor_enc sebagai ciphertext.
-- RLS: pemilik atau admin_tenant tenant sama. admin_platform TIDAK mengakses
--   vault via RLS (PRD 6: break-glass terpisah & ter-consent).
-- audit_log: APPEND-ONLY (trigger menolak UPDATE/DELETE untuk semua role).
-- Bergantung: identity (auth helpers, auth.users, tenants).
-- Down migration: supabase/down/20260709011544_vault.sql
-- =============================================================================

create type public.cert_kind as enum ('smr_kkni', 'smr_tingkat_lama', 'asesor_bnsp', 'lainnya');
create type public.penyetaraan_status as enum ('tidak_diajukan', 'dalam_proses', 'setara', 'ditolak');
create type public.refreshment_bentuk as enum (
  'in_house', 'seminar', 'sosialisasi', 'workshop', 'lokakarya', 'elearning', 'portofolio'
);
create type public.refreshment_source as enum ('manual', 'platform_auto');
create type public.recognition_status as enum ('pembekalan', 'diakui_lsp');

-- ========================= CERTIFICATES =========================
create table public.certificates (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id) on delete cascade,
  user_id            uuid not null references auth.users (id) on delete cascade,
  kind               public.cert_kind not null,
  jenjang            int,
  tingkat_lama       int,
  nomor_enc          bytea, -- ciphertext (server-side, kunci Supabase Vault)
  lsp_penerbit       text,
  issued_at          date,
  expires_at         date,
  status_penyetaraan public.penyetaraan_status not null default 'tidak_diajukan',
  file_path          text,
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index certificates_owner_idx on public.certificates (tenant_id, user_id);
create index certificates_expires_idx on public.certificates (expires_at);
alter table public.certificates enable row level security;
alter table public.certificates force row level security;
create trigger certificates_set_updated_at before update on public.certificates
  for each row execute function public.set_updated_at();

-- ========================= REFRESHMENT_LOGS =========================
create table public.refreshment_logs (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants (id) on delete cascade,
  certificate_id     uuid references public.certificates (id) on delete cascade,
  activity_date      date not null,
  bentuk             public.refreshment_bentuk not null,
  penyelenggara      text,
  bukti_path         text,
  source             public.refreshment_source not null default 'manual',
  recognition_status public.recognition_status not null default 'pembekalan',
  created_by         uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index refreshment_logs_tenant_idx on public.refreshment_logs (tenant_id, certificate_id);
alter table public.refreshment_logs enable row level security;
alter table public.refreshment_logs force row level security;

-- ========================= AUDIT_LOG (append-only) =========================
create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references public.tenants (id) on delete set null,
  actor_id    uuid,
  action      text not null,
  resource    text not null,
  resource_id text,
  ip          inet,
  user_agent  text,
  detail      jsonb not null default '{}'::jsonb,
  at          timestamptz not null default now()
);
create index audit_log_tenant_idx on public.audit_log (tenant_id, at);
alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;

-- Append-only: tolak UPDATE/DELETE untuk SEMUA role (termasuk service_role).
create or replace function public.reject_mutation() returns trigger language plpgsql as $$
begin
  raise exception 'tabel append-only: % ditolak', tg_op using errcode = '42501';
end;
$$;
create trigger audit_log_append_only before update or delete on public.audit_log
  for each row execute function public.reject_mutation();

-- ========================= CONSENTS =========================
create table public.consents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  doc_version text not null,
  accepted_at timestamptz not null default now(),
  ip          inet,
  created_at  timestamptz not null default now(),
  unique (user_id, doc_version)
);
alter table public.consents enable row level security;
alter table public.consents force row level security;

-- ========================= GRANTS =========================
grant select, insert, update, delete on public.certificates to authenticated;
grant select, insert, update, delete on public.refreshment_logs to authenticated;
grant select on public.audit_log to authenticated; -- tulis hanya server (service_role)
grant select, insert on public.consents to authenticated;

-- ========================= POLICIES =========================
-- certificates: pemilik atau admin_tenant tenant sama (admin_platform TIDAK).
create policy certificates_select on public.certificates for select using (
  tenant_id = public.auth_tenant_id()
  and (user_id = auth.uid() or public.auth_role() = 'admin_tenant')
);
create policy certificates_write on public.certificates for all
  using (
    tenant_id = public.auth_tenant_id()
    and (user_id = auth.uid() or public.auth_role() = 'admin_tenant')
  )
  with check (
    tenant_id = public.auth_tenant_id()
    and (user_id = auth.uid() or public.auth_role() = 'admin_tenant')
  );

-- refreshment_logs: admin_tenant tenant sama, atau pemilik sertifikat terkait.
create policy refreshment_select on public.refreshment_logs for select using (
  tenant_id = public.auth_tenant_id()
  and (
    public.auth_role() = 'admin_tenant'
    or exists (
      select 1 from public.certificates c
      where c.id = refreshment_logs.certificate_id and c.user_id = auth.uid()
    )
  )
);
create policy refreshment_write on public.refreshment_logs for all
  using (tenant_id = public.auth_tenant_id())
  with check (tenant_id = public.auth_tenant_id());

-- audit_log: baca oleh admin_tenant (tenant sendiri) atau admin_platform.
create policy audit_log_select on public.audit_log for select using (
  (tenant_id = public.auth_tenant_id() and public.auth_role() = 'admin_tenant')
  or public.auth_role() = 'admin_platform'
);

-- consents: pemilik kelola miliknya sendiri.
create policy consents_select on public.consents for select using (user_id = auth.uid());
create policy consents_insert on public.consents for insert with check (user_id = auth.uid());

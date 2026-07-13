-- =============================================================================
-- T-015 Storage: bucket privat `vault` + RLS storage.objects path
-- {tenant_id}/{user_id}/... .
-- =============================================================================
-- Catatan: schema `storage` disediakan Supabase (tidak ada di harness pglite),
-- jadi policy ini diverifikasi di staging; logika kepemilikan path yang dipakai
-- endpoint /api/files/sign diuji unit (tests/unit/vault-path.test.ts).
-- Penerbitan signed URL tetap lewat server (aturan #5). Bergantung: identity
-- (auth_tenant_id, auth_role).
-- Down migration: supabase/down/20260709071413_storage.sql
-- =============================================================================

-- Bucket privat.
insert into storage.buckets (id, name, public)
values ('vault', 'vault', false)
on conflict (id) do nothing;

-- Prefix path: segmen folder [1] = tenant_id, [2] = user_id.
create policy "vault_select" on storage.objects for select to authenticated using (
  bucket_id = 'vault'
  and (storage.foldername(name))[1] = public.auth_tenant_id()::text
  and (
    (storage.foldername(name))[2] = auth.uid()::text
    or public.auth_role() = 'admin_tenant'
  )
);

create policy "vault_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'vault'
  and (storage.foldername(name))[1] = public.auth_tenant_id()::text
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "vault_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'vault'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'vault'
    and (storage.foldername(name))[1] = public.auth_tenant_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "vault_delete" on storage.objects for delete to authenticated using (
  bucket_id = 'vault'
  and (storage.foldername(name))[1] = public.auth_tenant_id()::text
  and (
    (storage.foldername(name))[2] = auth.uid()::text
    or public.auth_role() = 'admin_tenant'
  )
);

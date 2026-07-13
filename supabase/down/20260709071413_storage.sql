-- =============================================================================
-- DOWN migration untuk 20260709071413_storage.sql (T-015).
-- =============================================================================
-- Rollback manual (bukan dijalankan `supabase db push`).
-- =============================================================================

drop policy if exists "vault_select" on storage.objects;
drop policy if exists "vault_insert" on storage.objects;
drop policy if exists "vault_update" on storage.objects;
drop policy if exists "vault_delete" on storage.objects;

-- Objek harus dikosongkan sebelum menghapus bucket.
delete from storage.objects where bucket_id = 'vault';
delete from storage.buckets where id = 'vault';

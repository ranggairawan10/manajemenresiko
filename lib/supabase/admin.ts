import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Klien service-role Supabase — HANYA server (aturan keamanan #3). Import
 * `server-only` membuat build gagal bila modul ini terbawa ke bundle client.
 * Melewati RLS; pakai seminimal mungkin dan selalu setelah otorisasi eksplisit.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

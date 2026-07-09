import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Klien Supabase terikat sesi user (anon key + cookie). Dipakai di server
 * (route handler / server action) untuk memverifikasi sesi via getUser().
 * Tidak pernah memakai service role.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diset');
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Dipanggil dari Server Component tanpa akses tulis cookie — abaikan;
          // refresh sesi ditangani middleware.
        }
      },
    },
  });
}

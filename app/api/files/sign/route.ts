import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { decodeClaims } from '@/lib/supabase/claims';
import { canAccessVaultPath, SIGNED_URL_TTL_SECONDS, VAULT_BUCKET } from '@/lib/storage/vault-path';

export const runtime = 'nodejs';

const BodySchema = z.object({
  path: z.string().min(1).max(1024),
});

type ErrorBody = { error: { code: string; message: string } };

function fail(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } } satisfies ErrorBody, { status });
}

/**
 * POST /api/files/sign — menerbitkan signed URL (<= 5 menit) untuk objek di
 * bucket privat `vault`, hanya setelah memverifikasi kepemilikan path dari klaim
 * JWT. Setiap penerbitan ditulis ke audit_log. Tidak pernah membocorkan isi
 * dokumen atau URL ke log.
 */
export async function POST(req: Request): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('unauthorized', 'Sesi tidak ditemukan', 401);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const claims = session ? decodeClaims(session.access_token) : null;
  if (!claims?.tenantId) return fail('forbidden', 'Klaim tenant tidak lengkap', 403);

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return fail('bad_request', 'Body tidak valid', 400);
  }

  if (
    !canAccessVaultPath(body.path, {
      tenantId: claims.tenantId,
      userId: user.id,
      role: claims.role,
    })
  ) {
    return fail('forbidden', 'Tidak berhak mengakses berkas ini', 403);
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(VAULT_BUCKET)
    .createSignedUrl(body.path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return fail('sign_failed', 'Gagal menerbitkan tautan', 500);

  await admin.from('audit_log').insert({
    tenant_id: claims.tenantId,
    actor_id: user.id,
    action: 'file.sign',
    resource: 'storage',
    resource_id: body.path,
  });

  return Response.json({ url: data.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
}

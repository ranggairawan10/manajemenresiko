'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminPlatform } from '@/lib/auth/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { emptyToUndefined, tenantCreateSchema, tenantUpdateSchema } from '@/lib/tenant/schema';

export async function createTenant(formData: FormData): Promise<void> {
  await requireAdminPlatform();

  const parsed = tenantCreateSchema.safeParse({
    name: emptyToUndefined(formData.get('name')),
    slug: emptyToUndefined(formData.get('slug')),
    accent_color: emptyToUndefined(formData.get('accent_color')),
    logo_url: emptyToUndefined(formData.get('logo_url')),
  });
  if (!parsed.success) redirect('/admin/tenants?error=invalid');

  // Klien sesi (authenticated) — RLS tenants_write menegakkan admin_platform.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('tenants').insert(parsed.data);
  if (error) {
    const code = error.code === '23505' ? 'duplicate' : 'save';
    redirect(`/admin/tenants?error=${code}`);
  }

  revalidatePath('/admin/tenants');
  redirect('/admin/tenants?created=1');
}

export async function updateTenant(formData: FormData): Promise<void> {
  await requireAdminPlatform();

  const id = String(formData.get('id') ?? '');
  if (!id) redirect('/admin/tenants?error=invalid');

  const parsed = tenantUpdateSchema.safeParse({
    name: emptyToUndefined(formData.get('name')),
    slug: emptyToUndefined(formData.get('slug')),
    accent_color: emptyToUndefined(formData.get('accent_color')),
    logo_url: emptyToUndefined(formData.get('logo_url')),
    status: emptyToUndefined(formData.get('status')),
  });
  if (!parsed.success) redirect(`/admin/tenants/${id}/edit?error=invalid`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('tenants').update(parsed.data).eq('id', id);
  if (error) redirect(`/admin/tenants/${id}/edit?error=save`);

  revalidatePath('/admin/tenants');
  redirect('/admin/tenants?updated=1');
}

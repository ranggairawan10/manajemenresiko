import { z } from 'zod';

/** Skema validasi tenant (T-022). Dipakai server actions CRUD admin_platform. */

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'Slug minimal 2 karakter')
  .max(48, 'Slug terlalu panjang')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya huruf kecil, angka, dan tanda hubung');

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, 'Warna harus format hex, mis. #0FA3B1');

const optionalHex = hexColorSchema.optional();
const optionalUrl = z.string().url('URL logo tidak valid').max(2048).optional();

export const tenantCreateSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120),
  slug: slugSchema,
  accent_color: optionalHex,
  logo_url: optionalUrl,
});

export const tenantUpdateSchema = tenantCreateSchema.partial().extend({
  status: z.enum(['active', 'suspended']).optional(),
});

export type TenantCreateInput = z.infer<typeof tenantCreateSchema>;
export type TenantUpdateInput = z.infer<typeof tenantUpdateSchema>;

/** Ubah field form kosong ('') menjadi undefined agar optional bekerja. */
export function emptyToUndefined(v: FormDataEntryValue | null): string | undefined {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length === 0 ? undefined : s;
}

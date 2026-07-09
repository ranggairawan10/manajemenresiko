import { accentThemeVars } from '@/lib/theme/color';

/**
 * Menyuntik override token warna aksen tenant (--color-teal + turunan) sebagai
 * <style> pada scope :root. Dipasang di root layout tenant. Bila aksen kosong/
 * invalid, tidak merender apa pun -> token default Design System dipakai.
 * Nilai berasal dari hex tervalidasi (accentThemeVars), aman untuk inline CSS.
 */
export function TenantTheme({ accent }: { accent: string | null }) {
  const vars = accentThemeVars(accent);
  if (!vars) return null;
  const css = `:root{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

/**
 * Theming layer tenant (Design System v5.2 §5): warna aksen tenant meng-override
 * token --color-teal dan turunannya. Fungsi murni (mudah diuji); derivasi shade
 * -600/-700 lewat penggelapan sederhana pada ruang RGB.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hex: string): Rgb | null {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function darken(rgb: Rgb, factor: number): Rgb {
  const f = Math.max(0, Math.min(1, factor));
  return { r: rgb.r * f, g: rgb.g * f, b: rgb.b * f };
}

/**
 * Peta override CSS var dari warna aksen, atau null bila aksen kosong/invalid
 * (jatuh ke token default). Kunci sengaja dibatasi ke --color-teal dan turunan.
 */
export function accentThemeVars(accent: string | null | undefined): Record<string, string> | null {
  if (!accent) return null;
  const rgb = parseHex(accent);
  if (!rgb) return null;
  return {
    '--color-teal': toHex(rgb),
    '--color-teal-600': toHex(darken(rgb, 0.85)),
    '--color-teal-700': toHex(darken(rgb, 0.72)),
  };
}

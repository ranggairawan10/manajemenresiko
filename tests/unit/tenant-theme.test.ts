import { describe, expect, it } from 'vitest';
import { accentThemeVars, darken, parseHex, toHex } from '@/lib/theme/color';
import { slugSchema, tenantCreateSchema } from '@/lib/tenant/schema';

describe('parseHex / toHex', () => {
  it('mem-parse 6 & 3 digit', () => {
    expect(parseHex('#0FA3B1')).toEqual({ r: 15, g: 163, b: 177 });
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('null untuk hex invalid', () => {
    expect(parseHex('0FA3B1')).toBeNull();
    expect(parseHex('#xyz')).toBeNull();
  });
  it('round-trip toHex', () => {
    expect(toHex({ r: 15, g: 163, b: 177 })).toBe('#0fa3b1');
  });
});

describe('darken', () => {
  it('menggelapkan proporsional dan clamp', () => {
    expect(toHex(darken({ r: 200, g: 100, b: 50 }, 0.5))).toBe('#643219');
    expect(toHex(darken({ r: 255, g: 255, b: 255 }, 0))).toBe('#000000');
  });
});

describe('accentThemeVars', () => {
  it('menghasilkan override teal + turunan untuk hex valid', () => {
    const v = accentThemeVars('#0FA3B1');
    expect(v).not.toBeNull();
    expect(v?.['--color-teal']).toBe('#0fa3b1');
    expect(v?.['--color-teal-600']).toBeDefined();
    expect(v?.['--color-teal-700']).toBeDefined();
  });
  it('null untuk aksen kosong/invalid (jatuh ke default)', () => {
    expect(accentThemeVars(null)).toBeNull();
    expect(accentThemeVars('')).toBeNull();
    expect(accentThemeVars('bukan-hex')).toBeNull();
  });
});

describe('tenant schema', () => {
  it('slug hanya huruf kecil/angka/dash', () => {
    expect(slugSchema.safeParse('bank-abc').success).toBe(true);
    expect(slugSchema.safeParse('Bank ABC').success).toBe(false);
    expect(slugSchema.safeParse('-x-').success).toBe(false);
  });
  it('tenantCreate memvalidasi name+slug, aksen opsional', () => {
    expect(tenantCreateSchema.safeParse({ name: 'Bank ABC', slug: 'bank-abc' }).success).toBe(true);
    expect(
      tenantCreateSchema.safeParse({ name: 'Bank ABC', slug: 'bank-abc', accent_color: '#123456' })
        .success,
    ).toBe(true);
    expect(
      tenantCreateSchema.safeParse({ name: 'B', slug: 'bank-abc' }).success, // nama terlalu pendek
    ).toBe(false);
    expect(
      tenantCreateSchema.safeParse({ name: 'Bank', slug: 'bank', accent_color: 'red' }).success,
    ).toBe(false);
  });
});

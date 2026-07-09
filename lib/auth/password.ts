import { z } from 'zod';

/**
 * Kebijakan kredensial (tech-spec: NIST, panjang >= 12; cek bocor HIBP
 * ditambahkan di registrasi T-023). Skema dipakai bersama oleh login &
 * registrasi agar konsisten.
 */
export const MIN_PASSWORD_LENGTH = 12;

export const emailSchema = z.string().trim().toLowerCase().email('Email tidak valid').max(254);

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Kata sandi minimal ${MIN_PASSWORD_LENGTH} karakter`)
  .max(128, 'Kata sandi terlalu panjang');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;

import localFont from 'next/font/local';

/**
 * Plus Jakarta Sans (variable font) dimuat via next/font/local dari aset di
 * public/fonts. Di-expose sebagai CSS variable `--font` sesuai Design System
 * v5.2 §6; globals.css memetakan `--font-sans` -> var(--font).
 * Lisensi SIL Open Font License (lihat public/fonts/OFL.txt).
 */
export const plusJakartaSans = localFont({
  src: [
    {
      path: '../public/fonts/PlusJakartaSans-VariableFont_wght.ttf',
      weight: '200 800',
      style: 'normal',
    },
    {
      path: '../public/fonts/PlusJakartaSans-Italic-VariableFont_wght.ttf',
      weight: '200 800',
      style: 'italic',
    },
  ],
  variable: '--font',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

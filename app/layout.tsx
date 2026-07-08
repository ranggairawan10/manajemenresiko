import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { plusJakartaSans } from './fonts';

export const metadata: Metadata = {
  title: 'Manajemen Resiko',
  description: 'Platform pembekalan sertifikasi & pengelolaan SMR perbankan Indonesia.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={plusJakartaSans.variable}>
      <body>{children}</body>
    </html>
  );
}

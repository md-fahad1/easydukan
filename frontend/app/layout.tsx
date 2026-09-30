import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Hind_Siliguri } from 'next/font/google';

const font = Hind_Siliguri({ subsets: ['bengali', 'latin'], weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = { title: 'ইজিদোকান — দোকানের হিসাব, একদম সহজে', description: 'দোকানের হিসাব, একদম সহজে।' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#059669' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <body className={font.className}>{children}</body>
    </html>
  );
}

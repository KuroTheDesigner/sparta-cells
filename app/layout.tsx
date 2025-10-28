import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';
import { Inter } from 'next/font/google';

export const metadata: Metadata = {
  title: 'Sparta Cells — Phone Comparison',
  description: 'Premium phone comparison by Sparta Cells',
  metadataBase: new URL('https://sparta-cells.local'),
};

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

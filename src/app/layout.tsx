import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';
import { StudioDataProvider } from '@/context/StudioDataContext';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FFFFFF',
};

export const metadata: Metadata = {
  title: 'Studio H — QG Créatif Publicitaire & UGC IA Europe',
  description:
    'Plateforme interne privée Studio H pour la gestion de clients européens, production UGC IA, prévisualisation Google Drive et trésorerie EUR / FCFA.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans bg-[#F8F9FA] text-zinc-900 antialiased overflow-x-hidden w-full max-w-full">
        <ToastProvider>
          <StudioDataProvider>
            <AppShell>{children}</AppShell>
          </StudioDataProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

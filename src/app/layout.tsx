import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'SkyBook - Flight Booking',
  description: 'Book and manage your flights',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SkyBook',
  },
  icons: {
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a1628',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 antialiased text-slate-900 min-h-screen">
        <div className="w-full overflow-x-hidden">
          <Providers>
            <Navbar />
            {children}
          </Providers>
        </div>
      </body>
    </html>
  );
}

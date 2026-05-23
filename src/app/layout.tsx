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
    statusBarStyle: 'default',
    title: 'SkyBook',
  },
};

export const viewport = {
  themeColor: '#0f172a',
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

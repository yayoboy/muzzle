import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Muzzle',
  description: 'Terminal session manager',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-muzzle-bg">
      <body className="font-mono bg-muzzle-bg text-muzzle-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

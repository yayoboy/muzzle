import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Muzzle',
  description: 'Terminal session manager',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-muzzle-bg">
      <body className="font-mono bg-muzzle-bg text-muzzle-text antialiased">
        {children}
      </body>
    </html>
  );
}

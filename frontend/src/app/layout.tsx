import './globals.css';
import type { Metadata } from 'next';
import AppShell from './components/AppShell';

export const metadata: Metadata = {
  title: "NOVERA '26 — Official Voting System | AIESEC in CINEC",
  description: 'Official voting platform for NOVERA ’26 Modeling & Personality Development Workshop. Vote for Best Male Model and Best Female Model.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-novera-paper text-novera-ink flex flex-col min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Vote, ShieldCheck, Sparkles, Lock } from 'lucide-react';

export const metadata: Metadata = {
  title: "NOVERA '26 — Official Voting System | AIESEC in CINEC",
  description: 'Official voting platform for NOVERA ’26 Modeling & Personality Development Workshop. Vote for Best Male Model and Best Female Model.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-novera-paper text-novera-ink flex flex-col min-h-screen">
        {/* Editorial Top Marquee / Banner */}
        <div className="bg-novera-ink text-novera-paper text-xs uppercase tracking-widest py-2 px-4 flex justify-between items-center border-b border-novera-charcoal/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-novera-gold animate-pulse" />
            <span>AIESEC in CINEC Presents &middot; NOVERA &rsquo;26</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[11px] text-novera-silver">
            <span>MODELING &amp; PERSONALITY DEVELOPMENT</span>
            <span>&bull;</span>
            <span className="text-novera-gold">STRICT 1 BOY + 1 GIRL BALLOT</span>
          </div>
        </div>

        {/* Main Navigation - Audience Focused */}
        <header className="sticky top-0 z-50 bg-novera-paper/95 backdrop-blur-md border-b border-novera-ink/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <Link href="/" className="group flex flex-col">
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-novera-ink group-hover:text-novera-foil transition-colors">
                NOVERA <span className="text-novera-foil">&rsquo;26</span>
              </span>
              <span className="text-[10px] tracking-[0.25em] text-novera-charcoal uppercase">
                Official Runway Ballot
              </span>
            </Link>

            <nav className="flex items-center gap-3">
              <Link
                href="/vote"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wider uppercase bg-novera-foil text-novera-paper hover:bg-novera-ink transition-all shadow-sm"
              >
                <Vote className="w-4 h-4" />
                <span>Cast Vote</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-grow">{children}</main>

        {/* Footer */}
        <footer className="bg-novera-ink text-novera-paper-dim border-t border-novera-foil/30 py-8 px-4 text-center text-xs tracking-wider">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-novera-silver">
              <ShieldCheck className="w-4 h-4 text-novera-foil" />
              <span>Verified Single-Vote Integrity System &bull; NOVERA &rsquo;26</span>
            </div>
            <div className="flex items-center gap-4 text-novera-charcoal text-[11px]">
              <p>&copy; 2026 AIESEC in CINEC. All rights reserved.</p>
              <span className="text-novera-charcoal/40">&bull;</span>
              <Link
                href="/admin"
                className="text-novera-charcoal/60 hover:text-novera-foil flex items-center gap-1 transition-colors"
                title="Organizer Portal"
              >
                <Lock className="w-3 h-3" />
                <span>Portal</span>
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}


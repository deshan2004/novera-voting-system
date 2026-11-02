import Link from 'next/link';
import { QrCode, Vote, BarChart3, Users, CheckCircle2, Award, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-novera-paper-dim border border-novera-foil/30 text-xs tracking-[0.2em] uppercase text-novera-charcoal">
            <span className="w-2 h-2 rounded-full bg-novera-foil animate-ping" />
            <span>Live Runway Voting Portal</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-novera-ink leading-[1.1]">
            Vote for the Faces of <span className="gold-gradient-text">NOVERA ’26</span>
          </h1>

          <p className="text-base sm:text-lg text-novera-charcoal leading-relaxed max-w-2xl mx-auto">
            A new era of runway poise, styling, and presence. Scan the live event QR code to cast your votes.
            Each attendee is granted <strong className="text-novera-ink underline decoration-novera-foil underline-offset-4">one vote for Best Male Model (Boy)</strong> and <strong className="text-novera-ink underline decoration-novera-foil underline-offset-4">one vote for Best Female Model (Girl)</strong>.
          </p>

          {/* Quick Action Buttons */}
          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link
              href="/vote"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-novera-ink text-novera-paper text-sm font-semibold tracking-wider hover:bg-novera-foil hover:text-novera-paper transition-all duration-300 shadow-editorial group"
            >
              <span>Go to Voting Ballot</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/qr"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white border border-novera-ink/15 text-novera-ink text-sm font-semibold tracking-wider hover:border-novera-foil hover:text-novera-foil transition-all shadow-sm"
            >
              <QrCode className="w-4 h-4 text-novera-foil" />
              <span>Display Stage QR</span>
            </Link>

            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-novera-paper-dim text-novera-charcoal hover:text-novera-ink text-sm font-semibold tracking-wider border border-transparent hover:border-novera-charcoal/20 transition-all"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Admin Leaderboard</span>
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: QR Display */}
          <div className="p-8 rounded-2xl bg-white border border-novera-ink/10 shadow-editorial hover:shadow-luxury hover:border-novera-foil/50 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-novera-paper-dim flex items-center justify-center mb-6">
                <QrCode className="w-6 h-6 text-novera-foil" />
              </div>
              <span className="text-xs uppercase tracking-widest text-novera-silver font-semibold">Step 01 &bull; Stage Projection</span>
              <h3 className="font-serif text-2xl font-bold text-novera-ink mt-2 mb-3">Live QR Code Display</h3>
              <p className="text-sm text-novera-charcoal leading-relaxed">
                Project the branded QR code on workshop screens or venue displays. Audience members simply point their phone camera to instantly load the ballot.
              </p>
            </div>
            <Link
              href="/qr"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-novera-foil hover:text-novera-ink transition-colors"
            >
              <span>Launch QR Screen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: 1 Boy + 1 Girl Ballot */}
          <div className="p-8 rounded-2xl bg-white border-2 border-novera-foil/40 shadow-luxury flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-novera-foil text-novera-paper text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-bl-lg">
              Rule Enforced
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-novera-paper-dim flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-novera-foil" />
              </div>
              <span className="text-xs uppercase tracking-widest text-novera-silver font-semibold">Step 02 &bull; Ballot Engine</span>
              <h3 className="font-serif text-2xl font-bold text-novera-ink mt-2 mb-3">Separate Boy &amp; Girl Votes</h3>
              <p className="text-sm text-novera-charcoal leading-relaxed">
                Vote separately for Best Male Model and Best Female Model. The system strictly restricts each attendee to 1 boy vote and 1 girl vote with real-time voter fingerprinting.
              </p>
            </div>
            <Link
              href="/vote"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-novera-foil hover:text-novera-ink transition-colors"
            >
              <span>Vote Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Admin Leaderboard & Bar Chart */}
          <div className="p-8 rounded-2xl bg-white border border-novera-ink/10 shadow-editorial hover:shadow-luxury hover:border-novera-foil/50 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-novera-paper-dim flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-novera-foil" />
              </div>
              <span className="text-xs uppercase tracking-widest text-novera-silver font-semibold">Step 03 &bull; Real-Time Analytics</span>
              <h3 className="font-serif text-2xl font-bold text-novera-ink mt-2 mb-3">Leaderboard &amp; Bar Charts</h3>
              <p className="text-sm text-novera-charcoal leading-relaxed">
                Watch votes update in real time with synchronized bar charts, category winner highlights, candidate rankings, and administrative controls.
              </p>
            </div>
            <Link
              href="/admin"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-novera-foil hover:text-novera-ink transition-colors"
            >
              <span>View Leaderboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Voting Rules Guarantee */}
        <div className="mt-16 p-6 rounded-2xl bg-novera-paper-dim border border-novera-ink/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-novera-foil/20 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-novera-foil" />
            </div>
            <div>
              <h4 className="font-bold text-novera-ink text-sm sm:text-base">Anti-Fraud &amp; Single-Vote Policy</h4>
              <p className="text-xs text-novera-charcoal">
                Each attendee device is assigned an encrypted voter session token. Once you vote for a category, that category is locked permanently.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full shrink-0 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>Strict 1 Person = 1 Boy + 1 Girl</span>
          </div>
        </div>
      </section>
    </div>
  );
}


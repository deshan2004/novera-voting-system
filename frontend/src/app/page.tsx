import Link from 'next/link';
import { Vote, Users, CheckCircle2, Award, ArrowRight, ShieldCheck, Sparkles, QrCode } from 'lucide-react';
import RunwayStageBackground from '@/app/components/RunwayStageBackground';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[#070605] text-white overflow-hidden">
      {/* Runway Stage Animation */}
      <RunwayStageBackground />

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/20 text-xs tracking-[0.25em] uppercase text-novera-gold shadow-md">
            <span className="w-2 h-2 rounded-full bg-novera-gold animate-ping" />
            <span>Official Runway Voting Portal</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] drop-shadow-md">
            Vote for the Faces of <span className="gold-gradient-text drop-shadow-[0_0_25px_rgba(203,167,95,0.4)]">NOVERA ’26</span>
          </h1>

          <p className="text-sm sm:text-lg text-zinc-300 leading-relaxed max-w-2xl mx-auto px-2 font-light">
            A new era of runway poise, styling, and presence. Cast your vote for the King &amp; Queen of the Runway.
            Each attendee is granted <strong className="text-white underline decoration-novera-gold underline-offset-4">one vote for Best Male Model (Boy)</strong> and <strong className="text-white underline decoration-novera-gold underline-offset-4">one vote for Best Female Model (Girl)</strong>.
          </p>

          {/* Quick Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
            <Link
              href="/vote"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11] text-[#070605] text-sm sm:text-base font-extrabold tracking-wider uppercase hover:brightness-110 transition-all duration-300 shadow-[0_0_30px_rgba(212,175,55,0.4)] group"
            >
              <Vote className="w-5 h-5 text-black group-hover:scale-110 transition-transform" />
              <span>Enter Voting Ballot</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </Link>

            <Link
              href="/qr"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm sm:text-base font-semibold tracking-wider uppercase border border-white/15 backdrop-blur-md transition-all duration-300 shadow-sm"
            >
              <QrCode className="w-4 h-4 text-novera-gold" />
              <span>Stage QR Code</span>
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Strict Rule */}
          <div className="p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border-2 border-novera-gold/40 shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:border-novera-gold transition-all duration-300">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-novera-gold to-amber-600 text-black text-[10px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-bl-lg">
              Rule Enforced
            </div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-6 text-novera-gold">
                <ShieldCheck className="w-6 h-6 text-novera-gold" />
              </div>
              <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">Ballot Rule</span>
              <h3 className="font-serif text-2xl font-bold text-white mt-2 mb-3">1 Boy + 1 Girl Only</h3>
              <p className="text-sm text-zinc-300 leading-relaxed font-light">
                You can cast exactly one vote for Best Male Model and one vote for Best Female Model. Once submitted, your vote is permanently locked to your device.
              </p>
            </div>
            <Link
              href="/vote"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-novera-gold hover:text-white transition-colors"
            >
              <span>Go to Ballot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Runway Contenders */}
          <div className="p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl hover:border-novera-gold/50 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-6 text-novera-gold">
                <Users className="w-6 h-6 text-novera-gold" />
              </div>
              <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">Contenders</span>
              <h3 className="font-serif text-2xl font-bold text-white mt-2 mb-3">Official Runway Models</h3>
              <p className="text-sm text-zinc-300 leading-relaxed font-light">
                Explore the lineup of talented models showcasing elegance, poise, confidence, and styling on the NOVERA ’26 runway.
              </p>
            </div>
            <Link
              href="/vote"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-novera-gold hover:text-white transition-colors"
            >
              <span>Meet Contenders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Grand Finale Announcement */}
          <div className="p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl hover:border-novera-gold/50 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-6 text-novera-gold">
                <Sparkles className="w-6 h-6 text-novera-gold" />
              </div>
              <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">Awards</span>
              <h3 className="font-serif text-2xl font-bold text-white mt-2 mb-3">Grand Finale Crowns</h3>
              <p className="text-sm text-zinc-300 leading-relaxed font-light">
                Combined with expert judging evaluations, audience favorites will be crowned King and Queen of the Runway at the workshop finale.
              </p>
            </div>
            <div className="mt-6 text-xs font-semibold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-novera-gold" />
              <span>Announced Live On Stage</span>
            </div>
          </div>
        </div>

        {/* Voting Rules Guarantee */}
        <div className="mt-16 p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-novera-gold/20 border border-novera-gold/30 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-novera-gold" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm sm:text-base">Anti-Fraud &amp; Single-Vote Policy</h4>
              <p className="text-xs text-zinc-300">
                Each attendee device is assigned an encrypted voter session token. Once you vote for a category, that category is locked permanently.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 bg-emerald-950/60 px-3.5 py-1.5 rounded-full shrink-0 border border-emerald-500/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Strict 1 Person = 1 Boy + 1 Girl</span>
          </div>
        </div>
      </section>
    </div>
  );
}


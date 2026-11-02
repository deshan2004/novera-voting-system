import Link from 'next/link';
import { Vote, Users, CheckCircle2, Award, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-novera-paper-dim border border-novera-foil/30 text-xs tracking-[0.2em] uppercase text-novera-charcoal">
            <span className="w-2 h-2 rounded-full bg-novera-foil animate-ping" />
            <span>Official Runway Voting Portal</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-novera-ink leading-[1.1]">
            Vote for the Faces of <span className="gold-gradient-text">NOVERA ’26</span>
          </h1>

          <p className="text-sm sm:text-lg text-novera-charcoal leading-relaxed max-w-2xl mx-auto px-2">
            A new era of runway poise, styling, and presence. Cast your vote for the King &amp; Queen of the Runway.
            Each attendee is granted <strong className="text-novera-ink underline decoration-novera-foil underline-offset-4">one vote for Best Male Model (Boy)</strong> and <strong className="text-novera-ink underline decoration-novera-foil underline-offset-4">one vote for Best Female Model (Girl)</strong>.
          </p>

          {/* Quick Action Button */}
          <div className="pt-4 flex justify-center px-4">
            <Link
              href="/vote"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-novera-ink text-novera-paper text-sm sm:text-base font-semibold tracking-wider uppercase hover:bg-novera-foil hover:text-novera-paper transition-all duration-300 shadow-editorial group"
            >
              <Vote className="w-5 h-5 text-novera-gold group-hover:scale-110 transition-transform" />
              <span>Enter Voting Ballot</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Strict Rule */}
          <div className="p-8 rounded-2xl bg-white border-2 border-novera-foil/40 shadow-luxury flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-novera-foil text-novera-paper text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-bl-lg">
              Rule Enforced
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-novera-paper-dim flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-novera-foil" />
              </div>
              <span className="text-xs uppercase tracking-widest text-novera-silver font-semibold">Ballot Rule</span>
              <h3 className="font-serif text-2xl font-bold text-novera-ink mt-2 mb-3">1 Boy + 1 Girl Only</h3>
              <p className="text-sm text-novera-charcoal leading-relaxed">
                You can cast exactly one vote for Best Male Model and one vote for Best Female Model. Once submitted, your vote is permanently locked to your device.
              </p>
            </div>
            <Link
              href="/vote"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-novera-foil hover:text-novera-ink transition-colors"
            >
              <span>Go to Ballot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Runway Contenders */}
          <div className="p-8 rounded-2xl bg-white border border-novera-ink/10 shadow-editorial hover:shadow-luxury hover:border-novera-foil/50 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-novera-paper-dim flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-novera-foil" />
              </div>
              <span className="text-xs uppercase tracking-widest text-novera-silver font-semibold">Contenders</span>
              <h3 className="font-serif text-2xl font-bold text-novera-ink mt-2 mb-3">Official Runway Models</h3>
              <p className="text-sm text-novera-charcoal leading-relaxed">
                Explore the lineup of talented models showcasing elegance, poise, confidence, and styling on the NOVERA ’26 runway.
              </p>
            </div>
            <Link
              href="/vote"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-novera-foil hover:text-novera-ink transition-colors"
            >
              <span>Meet Contenders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Grand Finale Announcement */}
          <div className="p-8 rounded-2xl bg-white border border-novera-ink/10 shadow-editorial hover:shadow-luxury hover:border-novera-foil/50 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-novera-paper-dim flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-novera-foil" />
              </div>
              <span className="text-xs uppercase tracking-widest text-novera-silver font-semibold">Awards</span>
              <h3 className="font-serif text-2xl font-bold text-novera-ink mt-2 mb-3">Grand Finale Crowns</h3>
              <p className="text-sm text-novera-charcoal leading-relaxed">
                Combined with expert judging evaluations, audience favorites will be crowned King and Queen of the Runway at the workshop finale.
              </p>
            </div>
            <div className="mt-6 text-xs font-semibold text-novera-charcoal uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-novera-gold" />
              <span>Announced Live On Stage</span>
            </div>
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


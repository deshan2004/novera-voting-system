'use client';

import { useState, useEffect } from 'react';
import { Candidate, VoterStatus } from '@/lib/types';
import {
  fetchCandidates,
  getOrCreateVoterId,
  getLocalVoterStatus,
  submitVote,
  subscribeToCandidates,
} from '@/lib/api';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Lock,
  Vote,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Crown,
  Check,
  RefreshCw,
  Send,
} from 'lucide-react';

export default function VotePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voterStatus, setVoterStatus] = useState<VoterStatus | null>(null);

  // Creative Scan Entry Animation
  const [showScanIntro, setShowScanIntro] = useState<boolean>(true);

  // Selected candidates for rapid single-screen ballot
  const [selectedBoyId, setSelectedBoyId] = useState<string | null>(null);
  const [selectedGirlId, setSelectedGirlId] = useState<string | null>(null);

  // Category view filter (All / Boys / Girls)
  const [categoryFilter, setCategoryFilter] = useState<'both' | 'boy' | 'girl'>('both');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    // Check if came from QR scan or fresh session
    const isFromQr = typeof window !== 'undefined' && window.location.search.includes('entry=qr');
    const seenIntro = sessionStorage.getItem('novera_scan_intro_played');

    if (isFromQr || !seenIntro) {
      setShowScanIntro(true);
      sessionStorage.setItem('novera_scan_intro_played', 'true');
      const timer = setTimeout(() => {
        setShowScanIntro(false);
      }, 1400);
      return () => clearTimeout(timer);
    } else {
      setShowScanIntro(false);
    }

    const voterId = getOrCreateVoterId();
    const status = getLocalVoterStatus(voterId);
    setVoterStatus(status);

    fetchCandidates().then((list) => {
      setCandidates(list);
    });

    const unsubscribeFirebase = subscribeToCandidates((list) => {
      setCandidates(list);
    });

    const handleSync = () => {
      const refreshed = getLocalVoterStatus(voterId);
      setVoterStatus(refreshed);
      fetchCandidates().then(setCandidates);
    };

    window.addEventListener('novera_vote_updated', handleSync);
    return () => {
      unsubscribeFirebase();
      window.removeEventListener('novera_vote_updated', handleSync);
    };
  }, []);

  const boys = candidates.filter((c) => c.category === 'boy');
  const girls = candidates.filter((c) => c.category === 'girl');

  const getCandidateById = (id?: string) => candidates.find((c) => c.id === id);

  const hasVotedBoy = !!voterStatus?.hasVotedBoy;
  const hasVotedGirl = !!voterStatus?.hasVotedGirl;
  const hasVotedBoth = hasVotedBoy && hasVotedGirl;

  // Single-Tap Fast Ballot Submission
  const handleFastSubmit = async () => {
    if (!voterStatus) return;

    // Determine what is being submitted
    const boyToSubmit = !hasVotedBoy ? selectedBoyId : undefined;
    const girlToSubmit = !hasVotedGirl ? selectedGirlId : undefined;

    if (!boyToSubmit && !girlToSubmit) {
      setFeedback({
        type: 'error',
        message: 'Please tap on your favorite Male and Female contenders before submitting.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const submission = {
      voterId: voterStatus.voterId,
      boyCandidateId: boyToSubmit || undefined,
      girlCandidateId: girlToSubmit || undefined,
    };

    const result = await submitVote(submission);
    setIsSubmitting(false);

    if (result.success) {
      setVoterStatus(result.voterStatus);
      setSelectedBoyId(null);
      setSelectedGirlId(null);
      setFeedback({ type: 'success', message: 'Your votes have been officially recorded in NOVERA ’26!' });

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#b3924f', '#0b0b0b', '#ecd599', '#10b981'],
      });
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const boyVotedCandidate = getCandidateById(voterStatus?.boyVotedFor);
  const girlVotedCandidate = getCandidateById(voterStatus?.girlVotedFor);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 relative">
      {/* 🚀 CREATIVE MODERN SCAN ENTRY INTRO OVERLAY */}
      {showScanIntro && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-200">
          <div className="absolute top-1/4 w-80 h-80 bg-novera-gold/20 rounded-full blur-3xl pointer-events-none" />

          {/* Luxury Holographic QR Scanner Target & Crown Monogram */}
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center mb-6">
            <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-novera-gold" />
            <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-novera-gold" />
            <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-novera-gold" />
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-novera-gold" />

            <div className="w-24 h-24 rounded-full border-2 border-novera-foil/30 border-t-novera-gold animate-radar-spin flex items-center justify-center shadow-[0_0_40px_rgba(203,167,95,0.4)]">
              <Crown className="w-10 h-10 text-novera-gold animate-bounce" />
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-2 mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono uppercase tracking-widest font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>QR CODE VERIFIED &bull; SEAT UNLOCKED</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome to NOVERA &rsquo;26
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              Accessing Central Runway Voting Ballot...
            </p>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-56 h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
            <div className="h-full bg-gradient-to-r from-novera-gold-dark via-novera-foil to-amber-300 rounded-full animate-in slide-in-from-left duration-1000 fill-mode-forwards w-full" />
          </div>

          {/* Quick Skip Button */}
          <button
            onClick={() => setShowScanIntro(false)}
            className="mt-6 text-[11px] font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
          >
            Skip Intro &rarr;
          </button>
        </div>
      )}

      {/* Luxury Ambient Glass Stage Lights */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-rose-200/20 rounded-full blur-3xl" />
      </div>

      {/* Clean Minimal Header (No technical jargon) */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-badge-gold text-xs uppercase tracking-widest font-semibold text-novera-foil">
          <Sparkles className="w-3.5 h-3.5 text-novera-gold animate-spin" style={{ animationDuration: '6s' }} />
          <span>Official Runway Ballot &bull; NOVERA &rsquo;26</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-novera-ink">
          Cast Your Votes
        </h1>
        <p className="text-xs sm:text-sm text-novera-charcoal max-w-md mx-auto">
          Tap your favorite contender for <strong className="text-novera-ink">Best Male Model</strong> and{' '}
          <strong className="text-novera-ink">Best Female Model</strong>, then hit submit below.
        </p>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 text-xs sm:text-sm shadow-md animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-400/50 text-emerald-950 backdrop-blur-md'
              : 'bg-rose-500/10 border border-rose-400/50 text-rose-950 backdrop-blur-md'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-grow font-semibold">{feedback.message}</div>
        </div>
      )}

      {/* COMPLETED BALLOT RECEIPT (If both votes are already cast) */}
      {hasVotedBoth ? (
        <div className="p-6 sm:p-8 rounded-3xl glass-panel shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-600 mx-auto flex items-center justify-center shadow-lg">
            <Check className="w-9 h-9 stroke-[3]" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Verified &bull; Ballot Sealed
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-novera-ink pt-2">
              Your Votes Are Recorded!
            </h2>
            <p className="text-xs text-novera-charcoal">
              Thank you for participating in NOVERA &rsquo;26. Your selections have been added to the master tabulation ledger.
            </p>
          </div>

          {/* Voted Cards Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto">
            {/* Boy */}
            <div className="p-4 rounded-2xl glass-card border border-emerald-300/60 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-novera-ink text-novera-gold text-xs font-mono font-bold flex items-center justify-center shrink-0">
                {boyVotedCandidate?.candidateNumber || 'M-XX'}
              </div>
              <div className="truncate">
                <span className="text-[10px] uppercase font-bold text-novera-foil block">Best Male Model</span>
                <span className="font-serif font-bold text-sm text-novera-ink truncate block">
                  {boyVotedCandidate?.name || 'Voted'}
                </span>
              </div>
            </div>

            {/* Girl */}
            <div className="p-4 rounded-2xl glass-card border border-emerald-300/60 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-novera-ink text-novera-gold text-xs font-mono font-bold flex items-center justify-center shrink-0">
                {girlVotedCandidate?.candidateNumber || 'F-XX'}
              </div>
              <div className="truncate">
                <span className="text-[10px] uppercase font-bold text-novera-foil block">Best Female Model</span>
                <span className="font-serif font-bold text-sm text-novera-ink truncate block">
                  {girlVotedCandidate?.name || 'Voted'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-novera-silver flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Strict single-ballot verification enforced</span>
          </div>
        </div>
      ) : (
        /* FAST TWO-SECTION BALLOT (Single Screen, Compact Chips, No giant photos) */
        <div className="space-y-6">
          {/* Category Filter Pills (All / Boys / Girls) */}
          <div className="flex justify-center">
            <div className="grid grid-cols-3 gap-1.5 w-full max-w-sm p-1.5 rounded-2xl glass-pill shadow-inner">
              <button
                type="button"
                onClick={() => setCategoryFilter('both')}
                className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  categoryFilter === 'both'
                    ? 'bg-novera-ink text-novera-paper shadow-md'
                    : 'text-novera-charcoal hover:text-novera-ink hover:bg-white/40'
                }`}
              >
                All (Both)
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('boy')}
                className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
                  categoryFilter === 'boy'
                    ? 'bg-novera-ink text-novera-paper shadow-md'
                    : 'text-novera-charcoal hover:text-novera-ink hover:bg-white/40'
                }`}
              >
                <span>Boys</span>
                {(selectedBoyId || hasVotedBoy) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('girl')}
                className={`py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${
                  categoryFilter === 'girl'
                    ? 'bg-novera-ink text-novera-paper shadow-md'
                    : 'text-novera-charcoal hover:text-novera-ink hover:bg-white/40'
                }`}
              >
                <span>Girls</span>
                {(selectedGirlId || hasVotedGirl) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm" />
                )}
              </button>
            </div>
          </div>

          {/* SECTION 1: BEST MALE MODEL (BOY) */}
          {(categoryFilter === 'both' || categoryFilter === 'boy') && (
            <div className="p-5 sm:p-6 rounded-3xl glass-panel shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-novera-ink/10">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-novera-gold" />
                <h3 className="font-serif text-lg font-bold text-novera-ink">
                  1. Best Male Model (Boy)
                </h3>
              </div>
              {hasVotedBoy ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Voted: {boyVotedCandidate?.candidateNumber}</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono text-novera-charcoal font-semibold uppercase tracking-wider">
                  Pick 1 Male Model
                </span>
              )}
            </div>

            {hasVotedBoy ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-mono font-bold text-xs">
                    {boyVotedCandidate?.candidateNumber}
                  </span>
                  <span className="font-serif font-bold text-sm text-emerald-950">
                    {boyVotedCandidate?.name}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Locked</span>
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {boys.map((candidate) => {
                  const isSelected = selectedBoyId === candidate.id;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => setSelectedBoyId(candidate.id)}
                      className={`p-3.5 rounded-2xl text-left flex items-center justify-between gap-3 transition-all duration-200 ${
                        isSelected
                          ? 'bg-novera-ink text-novera-paper shadow-lg ring-2 ring-novera-foil scale-[1.01]'
                          : 'glass-card hover:border-novera-foil/50 hover:bg-white/90 text-novera-ink'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span
                          className={`w-10 h-10 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-novera-gold text-novera-ink'
                              : 'bg-novera-paper-dim text-novera-ink border border-novera-ink/10'
                          }`}
                        >
                          {candidate.candidateNumber}
                        </span>
                        <div className="truncate">
                          <span className="font-serif font-bold text-sm truncate block">
                            {candidate.name}
                          </span>
                          <span
                            className={`text-[11px] block truncate ${
                              isSelected ? 'text-zinc-300' : 'text-novera-charcoal'
                            }`}
                          >
                            Contender
                          </span>
                        </div>
                      </div>

                      {/* Selection Ring */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                          isSelected
                            ? 'bg-novera-gold border-novera-gold text-novera-ink'
                            : 'border-novera-ink/20'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {/* SECTION 2: BEST FEMALE MODEL (GIRL) */}
          {(categoryFilter === 'both' || categoryFilter === 'girl') && (
            <div className="p-5 sm:p-6 rounded-3xl glass-panel shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-novera-ink/10">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-novera-gold" />
                <h3 className="font-serif text-lg font-bold text-novera-ink">
                  2. Best Female Model (Girl)
                </h3>
              </div>
              {hasVotedGirl ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Voted: {girlVotedCandidate?.candidateNumber}</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono text-novera-charcoal font-semibold uppercase tracking-wider">
                  Pick 1 Female Model
                </span>
              )}
            </div>

            {hasVotedGirl ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-mono font-bold text-xs">
                    {girlVotedCandidate?.candidateNumber}
                  </span>
                  <span className="font-serif font-bold text-sm text-emerald-950">
                    {girlVotedCandidate?.name}
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Locked</span>
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {girls.map((candidate) => {
                  const isSelected = selectedGirlId === candidate.id;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => setSelectedGirlId(candidate.id)}
                      className={`p-3.5 rounded-2xl text-left flex items-center justify-between gap-3 transition-all duration-200 ${
                        isSelected
                          ? 'bg-novera-ink text-novera-paper shadow-lg ring-2 ring-novera-foil scale-[1.01]'
                          : 'glass-card hover:border-novera-foil/50 hover:bg-white/90 text-novera-ink'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span
                          className={`w-10 h-10 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-novera-gold text-novera-ink'
                              : 'bg-novera-paper-dim text-novera-ink border border-novera-ink/10'
                          }`}
                        >
                          {candidate.candidateNumber}
                        </span>
                        <div className="truncate">
                          <span className="font-serif font-bold text-sm truncate block">
                            {candidate.name}
                          </span>
                          <span
                            className={`text-[11px] block truncate ${
                              isSelected ? 'text-zinc-300' : 'text-novera-charcoal'
                            }`}
                          >
                            Contender
                          </span>
                        </div>
                      </div>

                      {/* Selection Ring */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                          isSelected
                            ? 'bg-novera-gold border-novera-gold text-novera-ink'
                            : 'border-novera-ink/20'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {/* FAST ACTION SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleFastSubmit}
              disabled={isSubmitting || (!selectedBoyId && !selectedGirlId)}
              className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xl group relative overflow-hidden ${
                selectedBoyId || selectedGirlId
                  ? 'bg-novera-foil text-novera-paper hover:bg-novera-ink'
                  : 'bg-novera-paper-dim text-novera-charcoal cursor-not-allowed opacity-60 border border-novera-ink/10'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Recording Votes...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    Submit Ballot{' '}
                    {selectedBoyId && selectedGirlId
                      ? '(1 Boy + 1 Girl)'
                      : selectedBoyId
                      ? '(Male Model)'
                      : selectedGirlId
                      ? '(Female Model)'
                      : ''}
                  </span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-novera-charcoal mt-2">
              Each device is verified for 1 vote per category. Your vote locks once submitted.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

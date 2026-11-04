'use client';

import { useState, useEffect } from 'react';
import { Candidate, VoterStatus } from '@/lib/types';
import {
  fetchCandidates,
  getOrCreateVoterId,
  getLocalVoterStatus,
  submitVote,
  subscribeToCandidates,
  syncVoterStatus,
  subscribeToVoterStatus,
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
  const [introStage, setIntroStage] = useState<'scan' | 'verified' | 'exit'>('scan');

  // Selected candidates for rapid single-screen ballot
  const [selectedBoyId, setSelectedBoyId] = useState<string | null>(null);
  const [selectedGirlId, setSelectedGirlId] = useState<string | null>(null);

  // Category view filter (Boys vs Girls)
  const [categoryFilter, setCategoryFilter] = useState<'boy' | 'girl'>('boy');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleDismissIntro = () => {
    setIntroStage('exit');
    setTimeout(() => {
      setShowScanIntro(false);
    }, 400);
  };

  useEffect(() => {
    // Check if came from QR scan or fresh session
    const isFromQr = typeof window !== 'undefined' && window.location.search.includes('entry=qr');
    const seenIntro = sessionStorage.getItem('novera_scan_intro_played');

    if (isFromQr || !seenIntro) {
      setShowScanIntro(true);
      setIntroStage('scan');
      sessionStorage.setItem('novera_scan_intro_played', 'true');

      // Stage 1 -> Stage 2: Verified (1200ms)
      const verifyTimer = setTimeout(() => {
        setIntroStage('verified');
      }, 1200);

      // Stage 2 -> Stage 3: Smooth Dissolve Curtain (2800ms)
      const exitTimer = setTimeout(() => {
        setIntroStage('exit');
      }, 2800);

      // Finish and Unmount (3200ms)
      const finishTimer = setTimeout(() => {
        setShowScanIntro(false);
      }, 3200);

      return () => {
        clearTimeout(verifyTimer);
        clearTimeout(exitTimer);
        clearTimeout(finishTimer);
      };
    } else {
      setShowScanIntro(false);
    }

    const voterId = getOrCreateVoterId();
    const status = getLocalVoterStatus(voterId);
    setVoterStatus(status);
    if (status.hasVotedBoy && !status.hasVotedGirl) {
      setCategoryFilter('girl');
    }

    // Check remote Firestore voter state and system reset signal
    syncVoterStatus(voterId).then((synced) => {
      setVoterStatus(synced);
      if (synced.hasVotedBoy && !synced.hasVotedGirl) {
        setCategoryFilter('girl');
      } else if (!synced.hasVotedBoy) {
        setCategoryFilter('boy');
      }
    });

    fetchCandidates().then((list) => {
      setCandidates(list);
    });

    const unsubscribeFirebase = subscribeToCandidates((list) => {
      setCandidates(list);
    });

    // Real-time listener for voter status resets from admin
    const unsubscribeVoter = subscribeToVoterStatus(voterId, (updatedStatus) => {
      setVoterStatus(updatedStatus);
      if (!updatedStatus.hasVotedBoy && !updatedStatus.hasVotedGirl) {
        setSelectedBoyId(null);
        setSelectedGirlId(null);
        setCategoryFilter('boy');
      }
    });

    const handleSync = () => {
      syncVoterStatus(voterId).then((refreshed) => {
        setVoterStatus(refreshed);
        if (!refreshed.hasVotedBoy && !refreshed.hasVotedGirl) {
          setSelectedBoyId(null);
          setSelectedGirlId(null);
          setCategoryFilter('boy');
        }
      });
      fetchCandidates().then(setCandidates);
    };

    window.addEventListener('novera_vote_updated', handleSync);
    return () => {
      unsubscribeFirebase();
      unsubscribeVoter();
      window.removeEventListener('novera_vote_updated', handleSync);
    };
  }, []);

  const boys = candidates.filter((c) => c.category === 'boy');
  const girls = candidates.filter((c) => c.category === 'girl');

  const getCandidateById = (id?: string) => candidates.find((c) => c.id === id);

  const selectedBoy = getCandidateById(selectedBoyId || undefined);
  const selectedGirl = getCandidateById(selectedGirlId || undefined);

  const hasVotedBoy = !!voterStatus?.hasVotedBoy;
  const hasVotedGirl = !!voterStatus?.hasVotedGirl;
  const hasVotedBoth = hasVotedBoy && hasVotedGirl;

  // Vote for Male Model
  const handleVoteBoy = async () => {
    if (!voterStatus || !selectedBoyId) return;
    setIsSubmitting(true);
    setFeedback(null);
    const result = await submitVote({
      voterId: voterStatus.voterId,
      boyCandidateId: selectedBoyId,
    });
    setIsSubmitting(false);

    if (result.success) {
      setVoterStatus(result.voterStatus);
      setSelectedBoyId(null);
      setFeedback({ type: 'success', message: 'Male Model vote recorded successfully!' });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#b3924f', '#0b0b0b', '#ecd599', '#10b981'],
      });

      if (!result.voterStatus.hasVotedGirl) {
        setTimeout(() => setCategoryFilter('girl'), 700);
      }
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  // Vote for Female Model
  const handleVoteGirl = async () => {
    if (!voterStatus || !selectedGirlId) return;
    setIsSubmitting(true);
    setFeedback(null);
    const result = await submitVote({
      voterId: voterStatus.voterId,
      girlCandidateId: selectedGirlId,
    });
    setIsSubmitting(false);

    if (result.success) {
      setVoterStatus(result.voterStatus);
      setSelectedGirlId(null);
      setFeedback({ type: 'success', message: 'Female Model vote recorded successfully!' });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#b3924f', '#0b0b0b', '#ecd599', '#10b981'],
      });

      if (!result.voterStatus.hasVotedBoy) {
        setTimeout(() => setCategoryFilter('boy'), 700);
      }
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  const boyVotedCandidate = getCandidateById(voterStatus?.boyVotedFor);
  const girlVotedCandidate = getCandidateById(voterStatus?.girlVotedFor);

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 sm:py-10 space-y-5 sm:space-y-6 relative">
      {/* 👑 HAUTE COUTURE LUXURY RUNWAY ENTRY INTRO */}
      {showScanIntro && (
        <div
          className={`fixed inset-0 z-[100] bg-[#070605] flex flex-col items-center justify-center p-6 text-center select-none transition-all duration-500 ease-out ${
            introStage === 'exit'
              ? 'opacity-0 scale-105 pointer-events-none'
              : 'opacity-100 scale-100'
          }`}
        >
          {/* Ambient Runway Spotlight Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600/15 via-[#0b0906] to-[#040302] pointer-events-none" />
          <div className="absolute top-1/4 w-96 h-96 bg-novera-gold/15 rounded-full blur-[100px] pointer-events-none" />

          {/* Luxury Concentric Insignia Emblem */}
          <div className="relative w-32 h-32 mx-auto flex items-center justify-center mb-7">
            {/* Soft Ambient Halo */}
            <div className="absolute w-36 h-36 rounded-full bg-amber-400/10 blur-xl animate-luxury-glow pointer-events-none" />

            {/* Rotating Haute Couture Gold Outer Orbit */}
            <div className="absolute inset-0 rounded-full border border-novera-foil/30 border-dashed animate-spin-slow" />

            {/* Inner Polished Gold Seal */}
            <div className="relative w-24 h-24 rounded-full border-2 border-novera-gold/70 bg-black/60 backdrop-blur-md shadow-[0_0_35px_rgba(203,167,95,0.35)] flex items-center justify-center">
              {/* Runway Corner Brackets */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-amber-300" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-amber-300" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-amber-300" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-amber-300" />

              {introStage === 'scan' ? (
                <Crown className="w-10 h-10 text-novera-gold drop-shadow-[0_0_15px_rgba(236,213,153,0.9)] animate-pulse" />
              ) : (
                <div className="animate-in zoom-in-75 duration-300">
                  <Check className="w-10 h-10 text-emerald-400 stroke-[3] drop-shadow-[0_0_15px_rgba(52,211,153,0.9)]" />
                </div>
              )}
            </div>
          </div>

          {/* High Fashion Typography */}
          <div className="space-y-3 mb-8 max-w-sm mx-auto">
            <span className="text-[10px] font-mono tracking-[0.35em] uppercase text-amber-200/70 block">
              AIESEC in CINEC Presents
            </span>

            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#ecd599] via-white to-[#b3924f] drop-shadow-sm">
              NOVERA &rsquo;26
            </h1>

            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400">
              Official Runway Voting Ballot
            </p>

            {/* Dynamic Stage Pill */}
            <div className="pt-2">
              {introStage === 'scan' ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-200 text-[11px] font-mono tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>AUTHENTICATING BALLOT CREDENTIALS...</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[11px] font-mono tracking-wider animate-in fade-in zoom-in-95 duration-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>SEAT VERIFIED &bull; RUNWAY BALLOT UNLOCKED</span>
                </div>
              )}
            </div>
          </div>

          {/* Sleek Golden Hairline Progress Bar */}
          <div className="w-64 h-1 bg-zinc-900 rounded-full overflow-hidden border border-amber-500/20 shadow-inner mb-6">
            <div
              className="h-full bg-gradient-to-r from-amber-700 via-novera-foil to-amber-200 rounded-full transition-all duration-[2400ms] ease-out"
              style={{ width: introStage === 'scan' ? '45%' : '100%' }}
            />
          </div>

          {/* Quick Skip Button */}
          <button
            type="button"
            onClick={handleDismissIntro}
            className="px-4 py-1.5 rounded-full glass-badge-gold text-amber-200/80 hover:text-white text-[11px] font-mono uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
          >
            Skip to Ballot &rarr;
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
          {/* Category Switch Tabs (Boys vs Girls only - NO All tab) */}
          <div className="flex justify-center">
            <div className="grid grid-cols-2 gap-1.5 w-full max-w-xs p-1.5 rounded-2xl glass-pill shadow-inner">
              <button
                type="button"
                onClick={() => setCategoryFilter('boy')}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center justify-center gap-2 ${
                  categoryFilter === 'boy'
                    ? 'bg-novera-ink text-novera-paper shadow-md'
                    : 'text-novera-charcoal hover:text-novera-ink hover:bg-white/40'
                }`}
              >
                <span>Boys</span>
                {hasVotedBoy ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm" />
                ) : selectedBoyId ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-sm" />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('girl')}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center justify-center gap-2 ${
                  categoryFilter === 'girl'
                    ? 'bg-novera-ink text-novera-paper shadow-md'
                    : 'text-novera-charcoal hover:text-novera-ink hover:bg-white/40'
                }`}
              >
                <span>Girls</span>
                {hasVotedGirl ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm" />
                ) : selectedGirlId ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-sm" />
                ) : null}
              </button>
            </div>
          </div>

          {/* SECTION 1: BEST MALE MODEL (BOY) */}
          {categoryFilter === 'boy' && (
            <div className="p-4 sm:p-6 rounded-3xl glass-panel shadow-sm space-y-4">
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

              {/* IMMEDIATE VOTE BUTTON FOR BEST MALE MODEL */}
              {!hasVotedBoy ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleVoteBoy}
                    disabled={isSubmitting || !selectedBoyId}
                    className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xl group relative overflow-hidden ${
                      selectedBoyId
                        ? 'bg-novera-foil text-novera-paper hover:bg-novera-ink'
                        : 'bg-novera-paper-dim text-novera-charcoal cursor-not-allowed opacity-60 border border-novera-ink/10'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Recording Vote...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {selectedBoy
                            ? `Submit Vote for ${selectedBoy.name} (${selectedBoy.candidateNumber})`
                            : 'Select a Male Model to Vote'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              ) : !hasVotedGirl ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('girl')}
                    className="w-full py-3.5 rounded-2xl font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all bg-novera-ink text-novera-paper hover:bg-novera-foil shadow-lg"
                  >
                    <span>Now Vote for Female Model (Girls)</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* SECTION 2: BEST FEMALE MODEL (GIRL) */}
          {categoryFilter === 'girl' && (
            <div className="p-4 sm:p-6 rounded-3xl glass-panel shadow-sm space-y-4">
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

              {/* IMMEDIATE VOTE BUTTON FOR BEST FEMALE MODEL */}
              {!hasVotedGirl ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleVoteGirl}
                    disabled={isSubmitting || !selectedGirlId}
                    className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xl group relative overflow-hidden ${
                      selectedGirlId
                        ? 'bg-novera-foil text-novera-paper hover:bg-novera-ink'
                        : 'bg-novera-paper-dim text-novera-charcoal cursor-not-allowed opacity-60 border border-novera-ink/10'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Recording Vote...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {selectedGirl
                            ? `Submit Vote for ${selectedGirl.name} (${selectedGirl.candidateNumber})`
                            : 'Select a Female Model to Vote'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              ) : !hasVotedBoy ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('boy')}
                    className="w-full py-3.5 rounded-2xl font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all bg-novera-ink text-novera-paper hover:bg-novera-foil shadow-lg"
                  >
                    <span>Vote for Male Model (Boys)</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}

          <p className="text-center text-[11px] text-novera-charcoal pt-1">
            Each device is verified for 1 vote per category. Your vote locks once submitted.
          </p>
        </div>
      )}
    </div>
  );
}

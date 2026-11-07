'use client';

import { useState, useEffect, useRef } from 'react';
import { Candidate, VoterStatus, VotingSettings } from '@/lib/types';
import {
  fetchCandidates,
  getLocalCandidates,
  getOrCreateVoterId,
  getLocalVoterStatus,
  submitVote,
  subscribeToCandidates,
  syncVoterStatus,
  subscribeToVoterStatus,
  subscribeToVotingSettings,
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
  Info,
  X,
  Eye,
  User,
  ChevronRight,
} from 'lucide-react';
import RunwayStageBackground from '@/app/components/RunwayStageBackground';
import VotingCountdownOverlay from '@/app/components/VotingCountdownOverlay';
import VotingClosedCeremonyOverlay from '@/app/components/VotingClosedCeremonyOverlay';
import SwipeableCandidateCard from '@/app/components/SwipeableCandidateCard';

export default function VotePage() {
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    if (typeof window !== 'undefined') {
      return getLocalCandidates();
    }
    return [];
  });
  const [voterStatus, setVoterStatus] = useState<VoterStatus | null>(null);

  // Selected candidate to view in detailed Profile Modal
  const [profileCandidate, setProfileCandidate] = useState<Candidate | null>(null);
  const [showReceiptContenders, setShowReceiptContenders] = useState<boolean>(false);

  // Creative Scan Entry Animation
  const [showScanIntro, setShowScanIntro] = useState<boolean>(true);
  const [introStage, setIntroStage] = useState<'scan' | 'verified' | 'exit'>('scan');

  // Selected candidates for rapid single-screen ballot
  const [selectedBoyId, setSelectedBoyId] = useState<string | null>(null);
  const [selectedGirlId, setSelectedGirlId] = useState<string | null>(null);
  const [voterName, setVoterName] = useState<string>('');

  // Category view filter (Boys vs Girls)
  const [categoryFilter, setCategoryFilter] = useState<'boy' | 'girl'>('boy');

  const [votingSettings, setVotingSettings] = useState<VotingSettings>({ isVotingOpen: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [remainingTimeText, setRemainingTimeText] = useState<string>('');
  const [showVoterClosedCelebration, setShowVoterClosedCelebration] = useState<boolean>(false);
  const wasVotingOpenRef = useRef<boolean>(false);

  useEffect(() => {
    if (votingSettings.isVotingOpen) {
      wasVotingOpenRef.current = true;
    } else if (wasVotingOpenRef.current && !votingSettings.isVotingOpen) {
      setShowVoterClosedCelebration(true);
    }
  }, [votingSettings.isVotingOpen]);

  useEffect(() => {
    if (!votingSettings.isVotingOpen || !votingSettings.votingClosesAt) {
      setRemainingTimeText('');
      return;
    }

    const update = () => {
      const diffMs = (votingSettings.votingClosesAt || 0) - Date.now();
      const totalSec = Math.max(0, Math.ceil(diffMs / 1000));
      if (totalSec <= 0) {
        setRemainingTimeText('');
        return;
      }
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      setRemainingTimeText(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [votingSettings.isVotingOpen, votingSettings.votingClosesAt]);

  const handleDismissIntro = () => {
    setIntroStage('exit');
    setTimeout(() => {
      setShowScanIntro(false);
    }, 350);
  };

  // 1. Runway VIP Entry / QR Intro Timer Management (Decoupled from data loading)
  useEffect(() => {
    const isFromQr =
      typeof window !== 'undefined' &&
      (window.location.search.includes('entry=qr') ||
        window.location.search.includes('source=qr') ||
        window.location.search.includes('qr=true'));
    const seenIntro = typeof window !== 'undefined' ? sessionStorage.getItem('novera_scan_intro_played') : null;

    if (isFromQr || !seenIntro) {
      setShowScanIntro(true);
      setIntroStage('scan');
      try {
        sessionStorage.setItem('novera_scan_intro_played', 'true');
      } catch (e) {}

      // Stage 1 -> Stage 2: Verified (2200ms) - ample time to see luxury laser scanner
      const verifyTimer = setTimeout(() => {
        setIntroStage('verified');
      }, 2200);

      // Stage 2 -> Stage 3: Smooth Dissolve Curtain (4800ms) - ample time to see verified badge or click enter
      const exitTimer = setTimeout(() => {
        setIntroStage('exit');
      }, 4800);

      // Finish and Unmount (5300ms)
      const finishTimer = setTimeout(() => {
        setShowScanIntro(false);
      }, 5300);

      return () => {
        clearTimeout(verifyTimer);
        clearTimeout(exitTimer);
        clearTimeout(finishTimer);
      };
    } else {
      setShowScanIntro(false);
    }
  }, []);

  // 2. Data Initialization & Real-Time Sync (Unconditionally executed on mount)
  useEffect(() => {
    // Immediate hydration from cache so candidates display with 0ms delay
    const initialList = getLocalCandidates();
    if (initialList && initialList.length > 0) {
      setCandidates(initialList);
    }

    const voterId = getOrCreateVoterId();
    const status = getLocalVoterStatus(voterId);
    setVoterStatus(status);
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('novera_voter_name') || status.voterName || '';
      if (savedName) setVoterName(savedName);
    }
    if (status.hasVotedBoy && !status.hasVotedGirl) {
      setCategoryFilter('girl');
    } else if (status.hasVotedGirl && !status.hasVotedBoy) {
      setCategoryFilter('boy');
    }

    // Remote voter status verification
    syncVoterStatus(voterId).then((synced) => {
      setVoterStatus(synced);
      if (synced.voterName) {
        setVoterName(synced.voterName);
      }
      if (synced.hasVotedBoy && !synced.hasVotedGirl) {
        setCategoryFilter('girl');
      } else if (synced.hasVotedGirl && !synced.hasVotedBoy) {
        setCategoryFilter('boy');
      }
    });

    // Fresh fetch from Firebase / Spring Boot
    fetchCandidates().then((list) => {
      if (list && list.length > 0) {
        setCandidates(list);
      }
    });

    // Real-time live synchronization for candidates
    const unsubscribeCandidates = subscribeToCandidates((list) => {
      if (list && list.length > 0) {
        setCandidates(list);
      }
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

    // Real-time listener for voting open/closed status from admin
    const unsubscribeSettings = subscribeToVotingSettings((settings) => {
      setVotingSettings(settings);
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
      fetchCandidates().then((list) => {
        if (list && list.length > 0) {
          setCandidates(list);
        }
      });
    };

    window.addEventListener('novera_vote_updated', handleSync);

    return () => {
      unsubscribeCandidates();
      unsubscribeVoter();
      unsubscribeSettings();
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

  // Vote for Male Model (Direct Swipe)
  const handleVoteBoy = async (overrideId?: string) => {
    const targetId = overrideId || selectedBoyId;
    if (!voterStatus || !targetId || voterStatus.hasVotedBoy) return;
    if (!votingSettings.isVotingOpen) {
      setFeedback({ type: 'error', message: 'Voting is currently closed by the organizing committee.' });
      return;
    }

    // ⚡ INSTANT OPTIMISTIC UI: Zero perceived latency, instant response!
    const optimisticStatus: VoterStatus = {
      ...voterStatus,
      hasVotedBoy: true,
      boyVotedFor: targetId,
      voterName: voterName.trim() || voterStatus.voterName || 'Audience Guest',
      votedAt: Date.now(),
    };
    setVoterStatus(optimisticStatus);
    setSelectedBoyId(null);
    setFeedback({ type: 'success', message: 'Male Model vote recorded!' });

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.5 },
      colors: ['#b3924f', '#0b0b0b', '#ecd599', '#10b981'],
    });

    if (!optimisticStatus.hasVotedGirl) {
      setTimeout(() => setCategoryFilter('girl'), 550);
    }

    setIsSubmitting(true);
    try {
      const result = await submitVote({
        voterId: voterStatus.voterId,
        voterName: voterName.trim() || undefined,
        boyCandidateId: targetId,
      });

      if (result.success) {
        setVoterStatus(result.voterStatus);
      } else {
        setFeedback({ type: 'error', message: result.message });
        setVoterStatus(getLocalVoterStatus(voterStatus.voterId));
      }
    } catch (err) {
      console.warn('Background vote sync note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vote for Female Model (Direct Swipe)
  const handleVoteGirl = async (overrideId?: string) => {
    const targetId = overrideId || selectedGirlId;
    if (!voterStatus || !targetId || voterStatus.hasVotedGirl) return;
    if (!votingSettings.isVotingOpen) {
      setFeedback({ type: 'error', message: 'Voting is currently closed by the organizing committee.' });
      return;
    }

    // ⚡ INSTANT OPTIMISTIC UI: Zero perceived latency, instant response!
    const optimisticStatus: VoterStatus = {
      ...voterStatus,
      hasVotedGirl: true,
      girlVotedFor: targetId,
      voterName: voterName.trim() || voterStatus.voterName || 'Audience Guest',
      votedAt: Date.now(),
    };
    setVoterStatus(optimisticStatus);
    setSelectedGirlId(null);
    setFeedback({ type: 'success', message: 'Female Model vote recorded!' });

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.5 },
      colors: ['#b3924f', '#0b0b0b', '#ecd599', '#10b981'],
    });

    if (!optimisticStatus.hasVotedBoy) {
      setTimeout(() => setCategoryFilter('boy'), 550);
    }

    setIsSubmitting(true);
    try {
      const result = await submitVote({
        voterId: voterStatus.voterId,
        voterName: voterName.trim() || undefined,
        girlCandidateId: targetId,
      });

      if (result.success) {
        setVoterStatus(result.voterStatus);
      } else {
        setFeedback({ type: 'error', message: result.message });
        setVoterStatus(getLocalVoterStatus(voterStatus.voterId));
      }
    } catch (err) {
      console.warn('Background vote sync note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const boyVotedCandidate = getCandidateById(voterStatus?.boyVotedFor);
  const girlVotedCandidate = getCandidateById(voterStatus?.girlVotedFor);

  return (
    <div className="min-h-screen relative text-white overflow-x-hidden">
      {/* 🌟 SYNCHRONIZED RUNWAY OPENING COUNTDOWN OVERLAY */}
      {votingSettings.countdownUntil && votingSettings.countdownUntil > Date.now() && (
        <VotingCountdownOverlay
          countdownUntil={votingSettings.countdownUntil}
        />
      )}

      {/* 👑 GRAND HAUTE COUTURE VOTING CONCLUDED CEREMONY OVERLAY */}
      {showVoterClosedCelebration && (
        <VotingClosedCeremonyOverlay
          autoRedirectSeconds={5}
          isStagePresenter={false}
          customMessage="Audience voting has officially concluded for NOVERA ’26. Thank you for participating! All ballots are locked and encrypted."
          onComplete={() => setShowVoterClosedCelebration(false)}
        />
      )}

      {/* Haute Couture Fashion Runway Stage Animation */}
      <RunwayStageBackground />

      <div className="max-w-3xl mx-auto px-2.5 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6 relative z-10">
        {/* 👑 HAUTE COUTURE LUXURY RUNWAY ENTRY INTRO */}
        {showScanIntro && (
          <div
            className={`fixed inset-0 z-[100] bg-[#070605] flex flex-col items-center justify-center p-6 text-center select-none transition-all duration-700 ease-out ${
              introStage === 'exit'
                ? 'opacity-0 scale-105 pointer-events-none'
                : 'opacity-100 scale-100'
            }`}
          >
            {/* Ambient Runway Spotlight Glow & Radial Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600/20 via-[#0b0906] to-[#040302] pointer-events-none" />
            <div className="absolute top-1/4 w-[32rem] h-[32rem] bg-novera-gold/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />

            {/* Cinematic Stage Spotlight Beams */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
              <div className="absolute -top-24 left-1/4 w-72 h-[120vh] bg-gradient-to-b from-amber-300/25 via-amber-500/5 to-transparent -rotate-12 transform-gpu" />
              <div className="absolute -top-24 right-1/4 w-72 h-[120vh] bg-gradient-to-b from-amber-300/25 via-amber-500/5 to-transparent rotate-12 transform-gpu" />
            </div>

            {/* Luxury Concentric Insignia Emblem */}
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center mb-8">
              {/* Soft Ambient Halo */}
              <div className="absolute w-44 h-44 rounded-full bg-amber-400/15 blur-2xl animate-luxury-glow pointer-events-none" />

              {/* Rotating Haute Couture Gold Outer Orbit */}
              <div className="absolute inset-0 rounded-full border border-amber-400/35 border-dashed animate-spin-slow" />
              <div className="absolute -inset-2.5 rounded-full border border-amber-500/20" />

              {/* Cardinal Runway Markers */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-1.5 h-1.5 bg-amber-300 rounded-full shadow-[0_0_8px_#fde68a]" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-1.5 h-1.5 bg-amber-300 rounded-full shadow-[0_0_8px_#fde68a]" />
              <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-1.5 h-1.5 bg-amber-300 rounded-full shadow-[0_0_8px_#fde68a]" />
              <div className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 w-1.5 h-1.5 bg-amber-300 rounded-full shadow-[0_0_8px_#fde68a]" />

              {/* Central Glass Seal */}
              <div className="relative w-28 h-28 rounded-2xl border-2 border-novera-gold/80 bg-[#0c0a08]/90 backdrop-blur-xl shadow-[0_0_40px_rgba(203,167,95,0.4)] flex items-center justify-center overflow-hidden">
                {/* Laser Scanline Beam during 'scan' */}
                {introStage === 'scan' && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_12px_#fde68a] animate-laser-scan z-20 pointer-events-none" />
                )}

                {/* Subtle Luxury Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#b3924f15_1px,transparent_1px),linear-gradient(to_bottom,#b3924f15_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />

                {introStage === 'scan' ? (
                  <div className="relative z-10 flex flex-col items-center justify-center space-y-1">
                    <Crown className="w-11 h-11 text-amber-300 drop-shadow-[0_0_18px_rgba(252,211,77,0.9)] animate-pulse" />
                    <span className="text-[8px] font-mono tracking-widest text-amber-300/80 font-bold uppercase">AUTHENTICATING</span>
                  </div>
                ) : (
                  <div className="relative z-10 flex flex-col items-center justify-center space-y-1 animate-in zoom-in-75 duration-300">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.7)]">
                      <Check className="w-7 h-7 text-emerald-300 stroke-[3] drop-shadow-[0_0_10px_rgba(52,211,153,1)]" />
                    </div>
                    <span className="text-[8px] font-mono tracking-widest text-emerald-300 font-bold uppercase">PASSED</span>
                  </div>
                )}
              </div>
            </div>

            {/* High Fashion Typography */}
            <div className="space-y-3.5 mb-7 max-w-sm mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-[10px] font-mono tracking-[0.3em] uppercase">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>AIESEC in CINEC Presents</span>
                <Sparkles className="w-3 h-3 text-amber-300" />
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-200 drop-shadow-[0_2px_15px_rgba(203,167,95,0.4)] animate-gold-shimmer">
                NOVERA &rsquo;26
              </h1>

              <p className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-300">
                Official Runway Voting Ballot
              </p>

              {/* Dynamic Stage Pill */}
              <div className="pt-2">
                {introStage === 'scan' ? (
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#17130e] border border-amber-500/50 text-amber-200 text-xs font-mono tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span>AUTHENTICATING SEAT &amp; RUNWAY PASS...</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2.5 px-4.5 py-2 rounded-full bg-[#0a1f14] border border-emerald-400/60 text-emerald-300 text-xs font-mono tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-in fade-in zoom-in-95 duration-200">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>SEAT CONFIRMED &bull; BALLOT UNLOCKED</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sleek Golden Hairline Progress Bar */}
            <div className="w-72 max-w-xs h-1.5 bg-black/60 rounded-full overflow-hidden border border-amber-500/30 shadow-inner mb-7">
              <div
                className="h-full bg-gradient-to-r from-amber-600 via-amber-300 to-emerald-400 rounded-full transition-all duration-[3000ms] ease-out shadow-[0_0_10px_rgba(245,158,11,0.8)]"
                style={{ width: introStage === 'scan' ? '45%' : '100%' }}
              />
            </div>

            {/* Action Buttons */}
            {introStage === 'scan' ? (
              <button
                type="button"
                onClick={handleDismissIntro}
                className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-300 hover:text-white text-xs font-mono uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
              >
                Skip to Ballot &rarr;
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDismissIntro}
                className="group px-6 py-2.5 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f7e7a9] to-[#cba75f] text-black font-semibold text-xs uppercase tracking-widest shadow-[0_0_25px_rgba(203,167,95,0.6)] hover:shadow-[0_0_35px_rgba(203,167,95,0.9)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <span>Enter Runway Ballot</span>
                <span className="transition-transform group-hover:translate-x-1 font-bold">&rarr;</span>
              </button>
            )}
          </div>
        )}

        {/* Luxury Ambient Glass Stage Lights */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-rose-200/20 rounded-full blur-3xl" />
        </div>

        {/* Clean Minimal Header (No technical jargon) */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 text-xs uppercase tracking-widest font-semibold text-novera-gold">
            <Sparkles className="w-3.5 h-3.5 text-novera-gold animate-spin" style={{ animationDuration: '6s' }} />
            <span>Official Runway Ballot &bull; NOVERA &rsquo;26</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-sm">
            Cast Your Votes
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto">
            Swipe right or tap on your favorite contender for <strong className="text-white">Best Male Model</strong> and{' '}
            <strong className="text-white">Best Female Model</strong>.
          </p>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl flex items-start gap-3 text-xs sm:text-sm shadow-md animate-in fade-in duration-200 ${feedback.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 backdrop-blur-md'
                : 'bg-rose-500/20 border border-rose-400/50 text-rose-200 backdrop-blur-md'
              }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-grow font-semibold">{feedback.message}</div>
          </div>
        )}

        {/* COMPLETED BALLOT RECEIPT (If both votes are already cast) */}
        {hasVotedBoth ? (
          <div className="p-6 sm:p-8 rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/15 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300 text-white">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
              <Check className="w-9 h-9 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 font-bold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/40">
                Verified &bull; Ballot Sealed
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white pt-2">
                Your Votes Are Recorded!
              </h2>
              <p className="text-xs text-zinc-300">
                Thank you for participating in NOVERA &rsquo;26. Your selections have been added to the master tabulation ledger.
              </p>
            </div>

            {/* Voted Cards Preview (Clickable to view details) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto">
              {/* Boy */}
              <button
                type="button"
                onClick={() => boyVotedCandidate && setProfileCandidate(boyVotedCandidate)}
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 backdrop-blur-md shadow-sm flex items-center justify-between gap-3 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-10 h-10 rounded-xl bg-novera-gold/20 border border-novera-gold/40 text-novera-gold text-xs font-mono font-bold flex items-center justify-center shrink-0">
                    {boyVotedCandidate?.candidateNumber || 'M-XX'}
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold text-novera-gold block">Best Male Model</span>
                    <span className="font-serif font-bold text-sm text-white truncate block group-hover:text-amber-200 transition-colors">
                      {boyVotedCandidate?.name || 'Voted'}
                    </span>
                  </div>
                </div>
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </button>

              {/* Girl */}
              <button
                type="button"
                onClick={() => girlVotedCandidate && setProfileCandidate(girlVotedCandidate)}
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 backdrop-blur-md shadow-sm flex items-center justify-between gap-3 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-10 h-10 rounded-xl bg-novera-gold/20 border border-novera-gold/40 text-novera-gold text-xs font-mono font-bold flex items-center justify-center shrink-0">
                    {girlVotedCandidate?.candidateNumber || 'F-XX'}
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] uppercase font-bold text-novera-gold block">Best Female Model</span>
                    <span className="font-serif font-bold text-sm text-white truncate block group-hover:text-amber-200 transition-colors">
                      {girlVotedCandidate?.name || 'Voted'}
                    </span>
                  </div>
                </div>
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </button>
            </div>

            <div className="pt-2 text-[11px] text-zinc-400 flex items-center justify-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Strict single-ballot verification enforced</span>
            </div>

            {/* Toggle to browse all contenders and view their profiles */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowReceiptContenders((prev) => !prev)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-novera-gold text-xs font-semibold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
              >
                <Eye className="w-3.5 h-3.5 text-novera-gold" />
                <span>{showReceiptContenders ? 'Hide Contenders Roster' : 'View All Contenders & Details'}</span>
              </button>
            </div>

            {/* Expanded Contender Roster on Receipt */}
            {showReceiptContenders && (
              <div className="pt-4 space-y-6 border-t border-white/10 text-left animate-in fade-in duration-300 max-w-2xl mx-auto">
                <div className="space-y-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-novera-gold block font-bold text-center">
                    Male Models Roster &bull; Tap any name to view details
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {boys.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setProfileCandidate(c)}
                        className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-left transition-all group"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="px-2 py-0.5 rounded-lg bg-white/10 text-novera-gold font-mono font-bold text-xs border border-white/10">
                            {c.candidateNumber}
                          </span>
                          <span className="font-serif font-bold text-sm text-white group-hover:text-amber-200 transition-colors truncate">
                            {c.name}
                          </span>
                        </div>
                        <Info className="w-3.5 h-3.5 text-zinc-400 group-hover:text-novera-gold shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-novera-gold block font-bold text-center">
                    Female Models Roster &bull; Tap any name to view details
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {girls.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setProfileCandidate(c)}
                        className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-left transition-all group"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="px-2 py-0.5 rounded-lg bg-white/10 text-novera-gold font-mono font-bold text-xs border border-white/10">
                            {c.candidateNumber}
                          </span>
                          <span className="font-serif font-bold text-sm text-white group-hover:text-amber-200 transition-colors truncate">
                            {c.name}
                          </span>
                        </div>
                        <Info className="w-3.5 h-3.5 text-zinc-400 group-hover:text-novera-gold shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* FAST TWO-SECTION BALLOT (Single Screen, Compact Chips, No giant photos) */
          <div className="space-y-6">
            {/* Voting Closed Notice if disabled by Admin */}
            {!votingSettings.isVotingOpen && (
              <div className="p-4 rounded-3xl bg-rose-950/40 border border-rose-500/40 text-center space-y-2 backdrop-blur-xl shadow-2xl animate-pulse">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-mono uppercase tracking-wider font-bold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Audience Voting Concluded / Paused</span>
                </div>
                <p className="text-xs text-zinc-300 max-w-md mx-auto">
                  Audience voting is currently paused or concluded by the NOVERA &rsquo;26 Central Committee for final tabulation.
                </p>
              </div>
            )}

            {/* ⏱️ Live 10-Minute Countdown Indicator */}
            {votingSettings.isVotingOpen && remainingTimeText && (
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-black/60 backdrop-blur-xl border-2 border-novera-gold/70 text-amber-300 font-mono text-xs font-bold shadow-[0_0_25px_rgba(251,191,36,0.3)] animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-novera-gold uppercase tracking-widest font-bold">VOTING CLOSES IN:</span>
                  <span className="font-extrabold text-white text-base tracking-widest">{remainingTimeText}</span>
                </div>
              </div>
            )}

            {/* 👤 Name (Optional) Input at the TOP (English Only, Clean & Minimal) */}
            <div className="w-full max-w-sm mx-auto">
              <div className="relative">
                <User className="w-4 h-4 text-amber-400/80 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  maxLength={35}
                  value={voterName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVoterName(val);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('novera_voter_name', val);
                    }
                  }}
                  placeholder="Name (Optional)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-black/60 border border-white/15 text-white placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all font-sans shadow-inner"
                />
              </div>
            </div>

            {/* Category Switch Tabs (Boys vs Girls only - NO All tab) */}
            <div className="flex justify-center">
              <div className="grid grid-cols-2 gap-1.5 w-full max-w-xs p-1.5 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/15 shadow-inner">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('boy')}
                  className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center justify-center gap-2 ${categoryFilter === 'boy'
                      ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
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
                  className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center justify-center gap-2 ${categoryFilter === 'girl'
                      ? 'bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-lg font-extrabold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
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
              <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl space-y-3.5 sm:space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-novera-gold" />
                    <h3 className="font-serif text-base sm:text-lg font-bold text-white">
                      1. Best Male Model (Boy)
                    </h3>
                  </div>
                  {hasVotedBoy ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Voted: {boyVotedCandidate?.candidateNumber}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1 bg-amber-400/10 px-2 sm:px-2.5 py-1 rounded-full border border-amber-400/30">
                      <span>Swipe Model to Vote</span>
                      <ChevronRight className="w-3 h-3 text-amber-400" />
                    </span>
                  )}
                </div>

                {/* Show Voted Banner if already voted */}
                {hasVotedBoy && boyVotedCandidate && (
                  <div
                    onClick={() => setProfileCandidate(boyVotedCandidate)}
                    className="p-3 sm:p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs flex items-center justify-between cursor-pointer hover:bg-emerald-950/60 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <span className="px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs shrink-0">
                        {boyVotedCandidate.candidateNumber}
                      </span>
                      <div className="min-w-0">
                        <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold uppercase block">Your Recorded Vote</span>
                        <span className="font-serif font-bold text-xs sm:text-sm text-emerald-200 group-hover:underline truncate block">
                          {boyVotedCandidate.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  </div>
                )}

                {/* All Male Contenders Grid (Swipe model's name directly to vote!) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {boys.map((candidate) => (
                    <SwipeableCandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      isVotedForThis={voterStatus?.boyVotedFor === candidate.id}
                      canVote={votingSettings.isVotingOpen && !hasVotedBoy}
                      isSubmitting={isSubmitting}
                      onVote={(id) => handleVoteBoy(id)}
                      onViewProfile={() => setProfileCandidate(candidate)}
                    />
                  ))}
                </div>

                {/* Transition to next category */}
                {hasVotedBoy && !hasVotedGirl && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('girl')}
                      className="w-full py-3.5 rounded-2xl font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-novera-gold to-amber-600 text-black font-extrabold hover:brightness-110 shadow-lg"
                    >
                      <span>Now Vote for Female Model (Girls)</span>
                      <span>&rarr;</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: BEST FEMALE MODEL (GIRL) */}
            {categoryFilter === 'girl' && (
              <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl space-y-3.5 sm:space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-novera-gold" />
                    <h3 className="font-serif text-base sm:text-lg font-bold text-white">
                      2. Best Female Model (Girl)
                    </h3>
                  </div>
                  {hasVotedGirl ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Voted: {girlVotedCandidate?.candidateNumber}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1 bg-amber-400/10 px-2 sm:px-2.5 py-1 rounded-full border border-amber-400/30">
                      <span>Swipe Model to Vote</span>
                      <ChevronRight className="w-3 h-3 text-amber-400" />
                    </span>
                  )}
                </div>

                {/* Show Voted Banner if already voted */}
                {hasVotedGirl && girlVotedCandidate && (
                  <div
                    onClick={() => setProfileCandidate(girlVotedCandidate)}
                    className="p-3 sm:p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs flex items-center justify-between cursor-pointer hover:bg-emerald-950/60 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <span className="px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs shrink-0">
                        {girlVotedCandidate.candidateNumber}
                      </span>
                      <div className="min-w-0">
                        <span className="text-[9px] sm:text-[10px] text-emerald-400 font-bold uppercase block">Your Recorded Vote</span>
                        <span className="font-serif font-bold text-xs sm:text-sm text-emerald-200 group-hover:underline truncate block">
                          {girlVotedCandidate.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  </div>
                )}

                {/* All Female Contenders Grid (Swipe model's name directly to vote!) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {girls.map((candidate) => (
                    <SwipeableCandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      isVotedForThis={voterStatus?.girlVotedFor === candidate.id}
                      canVote={votingSettings.isVotingOpen && !hasVotedGirl}
                      isSubmitting={isSubmitting}
                      onVote={(id) => handleVoteGirl(id)}
                      onViewProfile={() => setProfileCandidate(candidate)}
                    />
                  ))}
                </div>

                {/* Transition to next category */}
                {hasVotedGirl && !hasVotedBoy && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('boy')}
                      className="w-full py-3.5 rounded-2xl font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-novera-gold to-amber-600 text-black font-extrabold hover:brightness-110 shadow-lg"
                    >
                      <span>Vote for Male Model (Boys)</span>
                      <span>&rarr;</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <p className="text-center text-[11px] text-zinc-400 pt-1">
              Each device is verified for 1 vote per category. Your vote locks once submitted.
            </p>
          </div>
        )}
      </div>

      {/* ================= CANDIDATE PROFILE DETAILS MODAL (VIEW ANYTIME, EVEN WHEN LOCKED) ================= */}
      {profileCandidate && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl overflow-y-auto p-2.5 sm:p-6 overscroll-contain"
          onClick={() => setProfileCandidate(null)}
        >
          <RunwayStageBackground contained className="opacity-80 pointer-events-none" />
          <div className="min-h-full flex items-center justify-center py-2 sm:py-4">
            <div
              className="relative z-10 w-full max-w-md bg-[#0d0b08]/95 border border-novera-gold/40 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_35px_rgba(203,167,95,0.25)] text-white animate-in zoom-in-95 duration-200 flex flex-col max-h-[88dvh] sm:max-h-[calc(100dvh-2rem)] shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header Container (No photo - Name & Number only) */}
            <div className="relative w-full p-4 sm:p-6 bg-gradient-to-b from-[#1c160c] to-[#0d0b08] border-b border-novera-gold/30 shrink-0">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setProfileCandidate(null)}
                className="absolute top-3.5 right-3.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all z-10 shadow-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Badges */}
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-novera-gold text-black font-mono font-extrabold text-xs shadow-md">
                  #{profileCandidate.candidateNumber}
                </span>
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] uppercase tracking-wider font-semibold">
                  {profileCandidate.category === 'boy' ? 'Male Model' : 'Female Model'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-200/80 block font-bold">
                  Official Contender Profile
                </span>
                <h3 className="font-serif text-lg sm:text-2xl font-extrabold text-white drop-shadow-md truncate">
                  {profileCandidate.name}
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto overscroll-contain pb-safe">
              {/* Bio & Runway Editorial Statement */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-novera-gold font-bold block">
                  Runway Bio & Editorial Profile
                </span>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed italic font-serif">
                  &ldquo;{profileCandidate.bio}&rdquo;
                </p>
              </div>

              {/* Contender Specifications */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase block">Age / Category</span>
                  <strong className="text-white font-serif text-sm block pt-0.5">
                    {profileCandidate.age || 22} Years &bull; {profileCandidate.category === 'boy' ? 'Boy' : 'Girl'}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                  <span className="text-[10px] text-zinc-400 font-mono uppercase block">Event</span>
                  <strong className="text-novera-gold font-serif text-sm block pt-0.5">
                    NOVERA &rsquo;26 Runway
                  </strong>
                </div>
              </div>

              {/* Action / Lock Status */}
              <div className="pt-1">
                {votingSettings.isVotingOpen &&
                  ((profileCandidate.category === 'boy' && !hasVotedBoy) ||
                    (profileCandidate.category === 'girl' && !hasVotedGirl)) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (profileCandidate.category === 'boy') {
                        setSelectedBoyId(profileCandidate.id);
                        setCategoryFilter('boy');
                      } else {
                        setSelectedGirlId(profileCandidate.id);
                        setCategoryFilter('girl');
                      }
                      setProfileCandidate(null);
                    }}
                    className="w-full py-3.5 rounded-2xl font-bold uppercase tracking-wider text-xs sm:text-sm bg-gradient-to-r from-novera-gold to-amber-500 text-black shadow-[0_0_25px_rgba(203,167,95,0.4)] hover:brightness-110 flex items-center justify-center gap-2 font-extrabold transition-all"
                  >
                    <Crown className="w-4 h-4 text-black" />
                    <span>Select {profileCandidate.name} to Vote</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                      <Lock className="w-3.5 h-3.5 text-novera-gold" />
                      <span className="text-[11px] font-mono">
                        {!votingSettings.isVotingOpen
                          ? 'Audience Voting Closed'
                          : (profileCandidate.category === 'boy' && voterStatus?.boyVotedFor === profileCandidate.id) ||
                            (profileCandidate.category === 'girl' && voterStatus?.girlVotedFor === profileCandidate.id)
                            ? 'Your Verified Selection'
                            : 'Ballot Locked for this Category'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfileCandidate(null)}
                      className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider transition-all"
                    >
                      Close Details
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

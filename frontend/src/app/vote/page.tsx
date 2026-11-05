'use client';

import { useState, useEffect } from 'react';
import { Candidate, VoterStatus, VotingSettings } from '@/lib/types';
import {
  fetchCandidates,
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
} from 'lucide-react';
import Image from 'next/image';
import RunwayStageBackground from '@/app/components/RunwayStageBackground';
import VotingCountdownOverlay from '@/app/components/VotingCountdownOverlay';

export default function VotePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
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

  // Category view filter (Boys vs Girls)
  const [categoryFilter, setCategoryFilter] = useState<'boy' | 'girl'>('boy');

  const [votingSettings, setVotingSettings] = useState<VotingSettings>({ isVotingOpen: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [remainingTimeText, setRemainingTimeText] = useState<string>('');

  useEffect(() => {
    if (!votingSettings.isVotingOpen || !votingSettings.votingClosesAt) {
      setRemainingTimeText('');
      return;
    }

    const update = () => {
      const diffMs = (votingSettings.votingClosesAt || 0) - Date.now();
      const totalSec = Math.max(0, Math.ceil(diffMs / 1000));
      if (totalSec <= 0) {
        setRemainingTimeText('00:00');
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
    } else if (status.hasVotedGirl && !status.hasVotedBoy) {
      setCategoryFilter('boy');
    }

    // Check remote Firestore voter state and system reset signal
    syncVoterStatus(voterId).then((synced) => {
      setVoterStatus(synced);
      if (synced.hasVotedBoy && !synced.hasVotedGirl) {
        setCategoryFilter('girl');
      } else if (synced.hasVotedGirl && !synced.hasVotedBoy) {
        setCategoryFilter('boy');
      }
    });

    fetchCandidates().then((list) => {
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
      fetchCandidates().then(setCandidates);
    };

    window.addEventListener('novera_vote_updated', handleSync);
    return () => {
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

  // Vote for Male Model
  const handleVoteBoy = async () => {
    if (!voterStatus || !selectedBoyId || voterStatus.hasVotedBoy) return;
    if (!votingSettings.isVotingOpen) {
      setFeedback({ type: 'error', message: 'Voting is currently closed by the organizing committee.' });
      return;
    }
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
    if (!voterStatus || !selectedGirlId || voterStatus.hasVotedGirl) return;
    if (!votingSettings.isVotingOpen) {
      setFeedback({ type: 'error', message: 'Voting is currently closed by the organizing committee.' });
      return;
    }
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
    <div className="min-h-screen relative bg-[#070605] text-white overflow-x-hidden">
      {/* 🌟 SYNCHRONIZED RUNWAY OPENING COUNTDOWN OVERLAY */}
      {votingSettings.countdownUntil && votingSettings.countdownUntil > Date.now() && (
        <VotingCountdownOverlay
          countdownUntil={votingSettings.countdownUntil}
        />
      )}

      {/* Haute Couture Fashion Runway Stage Animation */}
      <RunwayStageBackground />

      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 sm:py-10 space-y-5 sm:space-y-6 relative z-10">
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 text-xs uppercase tracking-widest font-semibold text-novera-gold">
          <Sparkles className="w-3.5 h-3.5 text-novera-gold animate-spin" style={{ animationDuration: '6s' }} />
          <span>Official Runway Ballot &bull; NOVERA &rsquo;26</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white drop-shadow-sm">
          Cast Your Votes
        </h1>
        <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto">
          Tap your favorite contender for <strong className="text-white">Best Male Model</strong> and{' '}
          <strong className="text-white">Best Female Model</strong>, then hit submit below.
        </p>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 text-xs sm:text-sm shadow-md animate-in fade-in duration-200 ${
            feedback.type === 'success'
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
              <div className="text-[10px] text-amber-200/80 group-hover:text-amber-200 flex items-center gap-1 font-mono shrink-0">
                <Info className="w-3.5 h-3.5 text-novera-gold" />
                <span>Details &rarr;</span>
              </div>
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
              <div className="text-[10px] text-amber-200/80 group-hover:text-amber-200 flex items-center gap-1 font-mono shrink-0">
                <Info className="w-3.5 h-3.5 text-novera-gold" />
                <span>Details &rarr;</span>
              </div>
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

          {/* Category Switch Tabs (Boys vs Girls only - NO All tab) */}
          <div className="flex justify-center">
            <div className="grid grid-cols-2 gap-1.5 w-full max-w-xs p-1.5 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/15 shadow-inner">
              <button
                type="button"
                onClick={() => setCategoryFilter('boy')}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center justify-center gap-2 ${
                  categoryFilter === 'boy'
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
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center justify-center gap-2 ${
                  categoryFilter === 'girl'
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
            <div className="p-4 sm:p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-novera-gold" />
                  <h3 className="font-serif text-lg font-bold text-white">
                    1. Best Male Model (Boy)
                  </h3>
                </div>
                {hasVotedBoy ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Voted: {boyVotedCandidate?.candidateNumber}</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">
                    Pick 1 Male Model
                  </span>
                )}
              </div>

              {/* Show Voted Banner if already voted */}
              {hasVotedBoy && boyVotedCandidate && (
                <div
                  onClick={() => setProfileCandidate(boyVotedCandidate)}
                  className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs flex items-center justify-between cursor-pointer hover:bg-emerald-950/60 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs">
                      {boyVotedCandidate.candidateNumber}
                    </span>
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase block">Your Recorded Vote</span>
                      <span className="font-serif font-bold text-sm text-emerald-200 group-hover:underline">
                        {boyVotedCandidate.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-300 font-mono underline">View Profile &rarr;</span>
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              )}

              {/* All Male Contenders Grid (Always visible so users can view profile details!) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {boys.map((candidate) => {
                  const isSelected = selectedBoyId === candidate.id;
                  const isVotedForThis = voterStatus?.boyVotedFor === candidate.id;
                  const canSelect = votingSettings.isVotingOpen && !hasVotedBoy;

                  return (
                    <div
                      key={candidate.id}
                      onClick={() => {
                        if (canSelect) {
                          setSelectedBoyId(candidate.id);
                        } else {
                          setProfileCandidate(candidate);
                        }
                      }}
                      className={`p-3.5 rounded-2xl text-left flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer ${
                        isVotedForThis
                          ? 'bg-emerald-950/30 border-2 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                          : isSelected
                          ? 'bg-gradient-to-r from-novera-foil/30 to-amber-900/30 text-white shadow-[0_0_25px_rgba(203,167,95,0.35)] border-2 border-novera-foil scale-[1.01]'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span
                          className={`w-10 h-10 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                            isVotedForThis
                              ? 'bg-emerald-500 text-black font-extrabold'
                              : isSelected
                              ? 'bg-gradient-to-br from-novera-gold to-amber-500 text-black font-extrabold'
                              : 'bg-white/10 text-novera-gold border border-white/15'
                          }`}
                        >
                          {candidate.candidateNumber}
                        </span>
                        <div className="truncate">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileCandidate(candidate);
                            }}
                            className="font-serif font-bold text-sm truncate block text-white hover:text-novera-gold transition-colors text-left group"
                            title="Click to view candidate details"
                          >
                            <span className="underline decoration-dotted decoration-amber-400/60 underline-offset-4 group-hover:decoration-novera-gold group-hover:text-amber-200">
                              {candidate.name}
                            </span>
                          </button>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span
                              className={`text-[11px] block truncate ${
                                isVotedForThis
                                  ? 'text-emerald-300 font-semibold'
                                  : isSelected
                                  ? 'text-amber-200'
                                  : 'text-zinc-400'
                              }`}
                            >
                              {isVotedForThis ? 'Voted' : 'Contender'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProfileCandidate(candidate);
                              }}
                              className="text-[10px] text-novera-gold hover:text-white inline-flex items-center gap-1 bg-novera-gold/10 hover:bg-novera-gold/25 px-2 py-0.5 rounded-full border border-novera-gold/30 transition-all font-mono"
                            >
                              <Info className="w-2.5 h-2.5 text-novera-gold" />
                              <span>Details</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Selection Ring / Status */}
                      <div className="shrink-0 flex items-center">
                        {canSelect ? (
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                              isSelected
                                ? 'bg-novera-gold border-novera-gold text-black'
                                : 'border-white/20'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        ) : isVotedForThis ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-md">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileCandidate(candidate);
                            }}
                            className="w-7 h-7 rounded-full bg-white/10 hover:bg-novera-gold hover:text-black text-zinc-300 flex items-center justify-center transition-all text-xs"
                            title="View Details"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* IMMEDIATE VOTE BUTTON FOR BEST MALE MODEL */}
              {!hasVotedBoy ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleVoteBoy}
                    disabled={isSubmitting || !selectedBoyId || !votingSettings.isVotingOpen}
                    className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xl group relative overflow-hidden ${
                      selectedBoyId && votingSettings.isVotingOpen
                        ? 'bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11] text-[#0a0a0a] hover:brightness-110 font-extrabold shadow-[0_0_25px_rgba(212,175,55,0.4)]'
                        : 'bg-white/5 text-zinc-500 cursor-not-allowed opacity-50 border border-white/10'
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
                          {!votingSettings.isVotingOpen
                            ? 'Voting Currently Closed · Locked'
                            : selectedBoy
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
                    className="w-full py-3.5 rounded-2xl font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-novera-gold to-amber-600 text-black font-extrabold hover:brightness-110 shadow-lg"
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
            <div className="p-4 sm:p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-novera-gold" />
                  <h3 className="font-serif text-lg font-bold text-white">
                    2. Best Female Model (Girl)
                  </h3>
                </div>
                {hasVotedGirl ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/40 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Voted: {girlVotedCandidate?.candidateNumber}</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">
                    Pick 1 Female Model
                  </span>
                )}
              </div>

              {/* Show Voted Banner if already voted */}
              {hasVotedGirl && girlVotedCandidate && (
                <div
                  onClick={() => setProfileCandidate(girlVotedCandidate)}
                  className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs flex items-center justify-between cursor-pointer hover:bg-emerald-950/60 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs">
                      {girlVotedCandidate.candidateNumber}
                    </span>
                    <div>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase block">Your Recorded Vote</span>
                      <span className="font-serif font-bold text-sm text-emerald-200 group-hover:underline">
                        {girlVotedCandidate.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-300 font-mono underline">View Profile &rarr;</span>
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              )}

              {/* All Female Contenders Grid (Always visible so users can view profile details!) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {girls.map((candidate) => {
                  const isSelected = selectedGirlId === candidate.id;
                  const isVotedForThis = voterStatus?.girlVotedFor === candidate.id;
                  const canSelect = votingSettings.isVotingOpen && !hasVotedGirl;

                  return (
                    <div
                      key={candidate.id}
                      onClick={() => {
                        if (canSelect) {
                          setSelectedGirlId(candidate.id);
                        } else {
                          setProfileCandidate(candidate);
                        }
                      }}
                      className={`p-3.5 rounded-2xl text-left flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer ${
                        isVotedForThis
                          ? 'bg-emerald-950/30 border-2 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                          : isSelected
                          ? 'bg-gradient-to-r from-novera-foil/30 to-amber-900/30 text-white shadow-[0_0_25px_rgba(203,167,95,0.35)] border-2 border-novera-foil scale-[1.01]'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white backdrop-blur-md'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span
                          className={`w-10 h-10 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 transition-colors ${
                            isVotedForThis
                              ? 'bg-emerald-500 text-black font-extrabold'
                              : isSelected
                              ? 'bg-gradient-to-br from-novera-gold to-amber-500 text-black font-extrabold'
                              : 'bg-white/10 text-novera-gold border border-white/15'
                          }`}
                        >
                          {candidate.candidateNumber}
                        </span>
                        <div className="truncate">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileCandidate(candidate);
                            }}
                            className="font-serif font-bold text-sm truncate block text-white hover:text-novera-gold transition-colors text-left group"
                            title="Click to view candidate details"
                          >
                            <span className="underline decoration-dotted decoration-amber-400/60 underline-offset-4 group-hover:decoration-novera-gold group-hover:text-amber-200">
                              {candidate.name}
                            </span>
                          </button>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span
                              className={`text-[11px] block truncate ${
                                isVotedForThis
                                  ? 'text-emerald-300 font-semibold'
                                  : isSelected
                                  ? 'text-amber-200'
                                  : 'text-zinc-400'
                              }`}
                            >
                              {isVotedForThis ? 'Voted' : 'Contender'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProfileCandidate(candidate);
                              }}
                              className="text-[10px] text-novera-gold hover:text-white inline-flex items-center gap-1 bg-novera-gold/10 hover:bg-novera-gold/25 px-2 py-0.5 rounded-full border border-novera-gold/30 transition-all font-mono"
                            >
                              <Info className="w-2.5 h-2.5 text-novera-gold" />
                              <span>Details</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Selection Ring / Status */}
                      <div className="shrink-0 flex items-center">
                        {canSelect ? (
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                              isSelected
                                ? 'bg-novera-gold border-novera-gold text-black'
                                : 'border-white/20'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        ) : isVotedForThis ? (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-md">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProfileCandidate(candidate);
                            }}
                            className="w-7 h-7 rounded-full bg-white/10 hover:bg-novera-gold hover:text-black text-zinc-300 flex items-center justify-center transition-all text-xs"
                            title="View Details"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* IMMEDIATE VOTE BUTTON FOR BEST FEMALE MODEL */}
              {!hasVotedGirl ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleVoteGirl}
                    disabled={isSubmitting || !selectedGirlId || !votingSettings.isVotingOpen}
                    className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xl group relative overflow-hidden ${
                      selectedGirlId && votingSettings.isVotingOpen
                        ? 'bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11] text-[#0a0a0a] hover:brightness-110 font-extrabold shadow-[0_0_25px_rgba(212,175,55,0.4)]'
                        : 'bg-white/5 text-zinc-500 cursor-not-allowed opacity-50 border border-white/10'
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
                          {!votingSettings.isVotingOpen
                            ? 'Voting Currently Closed · Locked'
                            : selectedGirl
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
                    className="w-full py-3.5 rounded-2xl font-bold uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-novera-gold to-amber-600 text-black font-extrabold hover:brightness-110 shadow-lg"
                  >
                    <span>Vote for Male Model (Boys)</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              ) : null}
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0d0b08] border border-novera-gold/40 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_35px_rgba(203,167,95,0.25)] text-white animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            {/* Hero Image Container */}
            <div className="relative w-full h-72 sm:h-80 bg-zinc-950 shrink-0 overflow-hidden">
              <Image
                src={profileCandidate.imageUrl}
                alt={profileCandidate.name}
                fill
                priority
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 450px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0b08] via-[#0d0b08]/30 to-black/60" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setProfileCandidate(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all z-10 shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                <span className="px-3 py-1 rounded-full bg-novera-gold text-black font-mono font-extrabold text-xs shadow-md">
                  {profileCandidate.candidateNumber}
                </span>
                <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] uppercase tracking-wider font-semibold">
                  {profileCandidate.category === 'boy' ? 'Male Model' : 'Female Model'}
                </span>
              </div>

              {/* Contender Name Overlay */}
              <div className="absolute bottom-3 left-5 right-5 space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-200/80 block font-bold">
                  Official Contender Profile
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-white drop-shadow-md">
                  {profileCandidate.name}
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
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
      )}
    </div>
  );
}

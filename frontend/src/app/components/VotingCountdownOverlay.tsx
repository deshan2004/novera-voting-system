'use client';

import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Crown } from 'lucide-react';

interface VotingCountdownOverlayProps {
  countdownUntil: number; // target epoch timestamp (ms)
  onComplete?: () => void;
}

export default function VotingCountdownOverlay({
  countdownUntil,
  onComplete,
}: VotingCountdownOverlayProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    return Math.max(0, Math.ceil((countdownUntil - Date.now()) / 1000));
  });
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastSecondRef = useRef<number>(remainingSeconds);
  const completedRef = useRef<boolean>(false);

  // High-fashion gentle audio tone
  const playChime = (freq = 520, duration = 0.15) => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsFinished(true);
    playChime(880, 0.35);

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#b3924f', '#ecd599', '#ffffff', '#eab308'],
      });
    } catch (e) {}

    setTimeout(() => {
      setIsVisible(false);
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }, 1300);
  };

  useEffect(() => {
    // If the target timestamp is already expired on mount
    if (countdownUntil <= Date.now()) {
      handleFinish();
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((countdownUntil - now) / 1000));
      setRemainingSeconds(diff);

      if (diff !== lastSecondRef.current && diff > 0) {
        lastSecondRef.current = diff;
        playChime(440 + (5 - Math.min(diff, 5)) * 110, 0.12);
      }

      if (diff <= 0) {
        clearInterval(timer);
        handleFinish();
      }
    }, 100);

    // Fallback safety timeout so it NEVER stays stuck under any condition
    const maxSafetyDuration = Math.max(1000, countdownUntil - Date.now() + 2500);
    const safetyTimeout = setTimeout(() => {
      clearInterval(timer);
      handleFinish();
    }, maxSafetyDuration);

    return () => {
      clearInterval(timer);
      clearTimeout(safetyTimeout);
    };
  }, [countdownUntil]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 select-none transition-all duration-500 ease-out bg-[#070605]/95 backdrop-blur-3xl"
    >
      {/* Volumetric Stage Spotlight Backlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-600/20 via-[#0b0906] to-[#040302] pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-novera-gold/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      {/* Luxury Concentric Insignia Orbital Frame */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto flex items-center justify-center mb-6">
        {/* Soft Ambient Halo */}
        <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-amber-400/10 blur-2xl animate-luxury-glow pointer-events-none" />

        {/* Outer Rotating Dashed Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-novera-gold/30 border-dashed animate-spin-slow" />

        {/* Counter-rotating Inner Ring */}
        <div
          className="absolute inset-6 rounded-full border border-amber-300/20 border-dotted animate-spin"
          style={{ animationDuration: '24s', animationDirection: 'reverse' }}
        />

        {/* Pulsing Concentric Shockwave Ping */}
        <div
          key={remainingSeconds}
          className="absolute inset-0 rounded-full border-2 border-novera-gold/40 animate-ping opacity-40 pointer-events-none"
        />

        {/* Inner Glass Emblem Core */}
        <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-full border-2 border-novera-gold/70 bg-black/60 backdrop-blur-2xl shadow-[0_0_50px_rgba(203,167,95,0.45)] flex flex-col items-center justify-center text-center p-4">
          {/* Runway Corner Accents */}
          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-amber-300" />
          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-amber-300" />
          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-amber-300" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-amber-300" />

          {isFinished ? (
            <div className="animate-in zoom-in-50 duration-300 flex flex-col items-center space-y-2">
              <Crown className="w-14 h-14 sm:w-16 sm:h-16 text-amber-300 drop-shadow-[0_0_25px_rgba(253,230,138,0.95)] animate-bounce" />
              <span className="font-serif font-extrabold text-xs sm:text-sm tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-novera-gold">
                LIVE!
              </span>
            </div>
          ) : (
            <div
              key={remainingSeconds}
              className="animate-in zoom-in-75 duration-200 flex flex-col items-center"
            >
              <span className="font-serif text-6xl sm:text-8xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-[#FFF5D6] via-[#ECD599] to-[#B3924F] drop-shadow-[0_0_35px_rgba(203,167,95,0.9)]">
                {remainingSeconds}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stage Status Text & High Fashion Typography */}
      <div className="space-y-3 max-w-md mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-novera-gold/15 border border-novera-gold/40 text-amber-200 text-xs font-mono uppercase tracking-[0.25em]">
          <Sparkles className="w-3.5 h-3.5 text-novera-gold animate-spin" style={{ animationDuration: '5s' }} />
          <span>AIESEC IN CINEC &bull; NOVERA &rsquo;26</span>
        </div>

        <h2 className="font-serif text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
          {isFinished ? (
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-novera-gold">
              AUDIENCE VOTING IS NOW LIVE!
            </span>
          ) : (
            <span>OFFICIAL RUNWAY BALLOT OPENING</span>
          )}
        </h2>

        <p className="text-xs sm:text-sm text-zinc-300 font-mono tracking-wider uppercase">
          {isFinished
            ? 'Ballots Unlocked • Opening QR Display...'
            : remainingSeconds > 3
            ? 'Synchronizing Master Tabulation Ledger...'
            : remainingSeconds === 3
            ? 'Ready Your Devices...'
            : remainingSeconds === 2
            ? 'Prepare to Vote...'
            : 'Final Seconds...'}
        </p>

        {/* Golden Hairline Progress Track */}
        <div className="w-64 sm:w-80 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-amber-500/30 mx-auto mt-4 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-amber-700 via-novera-foil to-amber-200 rounded-full transition-all duration-300 ease-out"
            style={{
              width: isFinished ? '100%' : `${((5 - Math.min(remainingSeconds, 5)) / 5) * 100}%`,
            }}
          />
        </div>

        {/* Quick Skip Button for instant stage bypass */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleFinish}
            className="text-[11px] font-mono text-zinc-400 hover:text-amber-200 underline underline-offset-4 transition-colors"
          >
            Skip countdown &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

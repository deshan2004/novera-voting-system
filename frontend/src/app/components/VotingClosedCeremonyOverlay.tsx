'use client';

import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Lock, Sparkles, ShieldCheck, Crown, ArrowRight } from 'lucide-react';

interface VotingClosedCeremonyOverlayProps {
  onComplete?: () => void;
  autoRedirectSeconds?: number;
  customMessage?: string;
  isStagePresenter?: boolean;
}

export default function VotingClosedCeremonyOverlay({
  onComplete,
  autoRedirectSeconds = 6,
  customMessage = 'Audience voting has officially concluded for NOVERA ’26. All ballots are sealed and encrypted.',
  isStagePresenter = true,
}: VotingClosedCeremonyOverlayProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [remainingSeconds, setRemainingSeconds] = useState<number>(autoRedirectSeconds);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const firedConfettiRef = useRef<boolean>(false);

  // High-fashion resonant audio chime
  const playClosingChime = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Chord: 587.33Hz (D5) -> 440Hz (A4) -> 293.66Hz (D4)
      [587.33, 440, 293.66].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 1.2);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const handleFinish = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
    }, 450);
  };

  useEffect(() => {
    // Play celebratory chime
    playClosingChime();

    // Trigger golden celebration confetti once
    if (!firedConfettiRef.current) {
      firedConfettiRef.current = true;
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.45 },
          colors: ['#cba75f', '#fef08a', '#ffffff', '#eab308', '#10b981'],
        });
      } catch {
        // Confetti fallback
      }
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const progressPercent = Math.max(0, Math.min(100, ((autoRedirectSeconds - remainingSeconds) / autoRedirectSeconds) * 100));

  return (
    <div
      className={`fixed inset-0 z-[200] bg-[#070605] flex flex-col items-center justify-center p-6 text-center select-none transition-all duration-500 ease-out ${
        isClosing ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Ambient Runway Spotlight Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600/25 via-[#0c0a07] to-[#040302] pointer-events-none" />
      <div className="absolute top-1/4 w-[36rem] h-[36rem] bg-novera-gold/15 rounded-full blur-[140px] pointer-events-none animate-pulse" />

      {/* Cinematic Spotlight Beams */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
        <div className="absolute -top-24 left-1/4 w-80 h-[120vh] bg-gradient-to-b from-amber-300/30 via-amber-500/10 to-transparent -rotate-12 transform-gpu" />
        <div className="absolute -top-24 right-1/4 w-80 h-[120vh] bg-gradient-to-b from-amber-300/30 via-amber-500/10 to-transparent rotate-12 transform-gpu" />
      </div>

      {/* Golden Vault Lock / Seal Emblem */}
      <div className="relative w-36 h-36 mx-auto flex items-center justify-center mb-7">
        {/* Soft Ambient Halo */}
        <div className="absolute w-44 h-44 rounded-full bg-amber-400/20 blur-2xl animate-luxury-glow pointer-events-none" />

        {/* Outer Orbit Rings */}
        <div className="absolute inset-0 rounded-full border border-amber-400/40 border-dashed animate-spin-slow" />
        <div className="absolute -inset-2.5 rounded-full border border-amber-500/25" />

        {/* Cardinal Runway Markers */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-amber-300 rounded-full shadow-[0_0_10px_#fde68a]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 bg-amber-300 rounded-full shadow-[0_0_10px_#fde68a]" />
        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-amber-300 rounded-full shadow-[0_0_10px_#fde68a]" />
        <div className="absolute right-0 top-1/2 translate-x-1 -translate-y-1/2 w-2 h-2 bg-amber-300 rounded-full shadow-[0_0_10px_#fde68a]" />

        {/* Central Seal with Lock Emblem */}
        <div className="relative w-28 h-28 rounded-2xl border-2 border-novera-gold bg-[#0e0c08]/90 backdrop-blur-xl shadow-[0_0_45px_rgba(203,167,95,0.45)] flex items-center justify-center overflow-hidden">
          {/* Subtle Grid Texture */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#b3924f15_1px,transparent_1px),linear-gradient(to_bottom,#b3924f15_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center justify-center space-y-1 animate-in zoom-in-75 duration-300">
            <div className="w-13 h-13 rounded-full bg-amber-500/20 border border-amber-400/60 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.6)]">
              <Lock className="w-7 h-7 text-amber-300 stroke-[2.5] drop-shadow-[0_0_12px_rgba(252,211,77,1)] animate-bounce" style={{ animationDuration: '2s' }} />
            </div>
            <span className="text-[8px] font-mono tracking-widest text-amber-300 font-extrabold uppercase">BALLOTS SEALED</span>
          </div>
        </div>
      </div>

      {/* High Fashion Typography */}
      <div className="space-y-3.5 mb-7 max-w-lg mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-[10px] font-mono tracking-[0.3em] uppercase">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>AIESEC in CINEC Presents</span>
          <Sparkles className="w-3 h-3 text-amber-300" />
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-200 drop-shadow-[0_2px_15px_rgba(203,167,95,0.4)] animate-gold-shimmer">
          VOTING CONCLUDED
        </h1>

        <p className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-zinc-300">
          Official Runway Voting Session Closed
        </p>

        {/* Status Pill */}
        <div className="pt-1">
          <div className="inline-flex items-center gap-2.5 px-4.5 py-2 rounded-full bg-[#1b150c] border border-amber-500/50 text-amber-200 text-xs font-mono tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ALL BALLOTS ENCRYPTED &bull; TABULATION ACTIVE</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed pt-1">
          {customMessage}
        </p>
      </div>

      {/* Progress Track */}
      <div className="w-80 max-w-sm h-1.5 bg-black/60 rounded-full overflow-hidden border border-amber-500/30 shadow-inner mb-6">
        <div
          className="h-full bg-gradient-to-r from-amber-600 via-amber-300 to-emerald-400 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_12px_rgba(245,158,11,0.8)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Return to Admin CTA Button */}
      {isStagePresenter && (
        <button
          type="button"
          onClick={handleFinish}
          className="group px-6 py-2.5 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f7e7a9] to-[#cba75f] text-black font-semibold text-xs uppercase tracking-widest shadow-[0_0_25px_rgba(203,167,95,0.5)] hover:shadow-[0_0_35px_rgba(203,167,95,0.85)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <span>Return to Stage Console ({remainingSeconds}s)</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      )}
    </div>
  );
}


'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  Maximize2,
  Minimize2,
  Smartphone,
  Vote,
  ShieldCheck,
  RefreshCw,
  Lock,
  Sparkles,
} from 'lucide-react';
import StageQrInteractiveBackground from '@/app/components/StageQrInteractiveBackground';
import RunwayStageBackground from '@/app/components/RunwayStageBackground';
import VotingClosedCeremonyOverlay from '@/app/components/VotingClosedCeremonyOverlay';
import { subscribeToVotingSettings, saveVotingSettings } from '@/lib/api';
import { VotingSettings } from '@/lib/types';
import { playLuxuryChime } from '@/lib/audio';
import VotingCountdownOverlay from '@/app/components/VotingCountdownOverlay';

export default function QrDisplayPage() {
  const router = useRouter();
  const [votingUrl, setVotingUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [qrSize, setQrSize] = useState<number>(230);
  const [votingSettings, setVotingSettings] = useState<VotingSettings>({ isVotingOpen: true });
  const [remainingTimeText, setRemainingTimeText] = useState<string>('');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [showClosingCeremony, setShowClosingCeremony] = useState<boolean>(false);
  const [showOpeningBroadcast, setShowOpeningBroadcast] = useState<boolean>(false);
  const [stageEntryAnimation, setStageEntryAnimation] = useState<boolean>(true);
  const wasVotingOpenRef = useRef<boolean>(false);

  // Play prestigious chime and trigger stage entrance sequence on mount
  useEffect(() => {
    playLuxuryChime();
    const timer = setTimeout(() => {
      setStageEntryAnimation(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  // Auto-trigger opening broadcast when voting unlocks, and closing ceremony when voting concludes
  useEffect(() => {
    if (votingSettings.isVotingOpen) {
      if (!wasVotingOpenRef.current) {
        setShowOpeningBroadcast(true);
        playLuxuryChime();
        const timer = setTimeout(() => {
          setShowOpeningBroadcast(false);
        }, 6000);
        wasVotingOpenRef.current = true;
        return () => clearTimeout(timer);
      }
    } else if (wasVotingOpenRef.current && !votingSettings.isVotingOpen) {
      setShowClosingCeremony(true);
    }
  }, [votingSettings.isVotingOpen]);

  // Live 10-Minute Countdown & Auto-Close Timer
  useEffect(() => {
    if (!votingSettings.isVotingOpen || !votingSettings.votingClosesAt) {
      setRemainingTimeText('');
      setRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diffMs = (votingSettings.votingClosesAt || 0) - now;
      const totalSec = Math.max(0, Math.ceil(diffMs / 1000));
      setRemainingSeconds(totalSec);

      if (totalSec <= 0) {
        // Automatically close voting when timer reaches 0 & trigger closing ceremony
        saveVotingSettings({
          isVotingOpen: false,
          votingClosesAt: null,
          countdownUntil: null,
          announcement: 'Audience voting has concluded for NOVERA ’26.',
        });
        setRemainingTimeText('00:00');
        setShowClosingCeremony(true);
        return;
      }

      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      setRemainingTimeText(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [votingSettings.isVotingOpen, votingSettings.votingClosesAt]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setVotingUrl(`${origin}/vote?entry=qr`);

      const calculateSize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isFS = !!document.fullscreenElement;
        if (isFS) {
          // Keep QR scaled gracefully so whole layout fits in vertical height with zero clipping
          const maxByHeight = Math.floor(h * 0.35);
          const maxByWidth = Math.floor(w * 0.35);
          setQrSize(Math.max(180, Math.min(270, maxByHeight, maxByWidth)));
        } else if (h < 750) {
          setQrSize(Math.max(160, Math.min(210, Math.floor(h * 0.28))));
        } else if (w < 380) {
          setQrSize(190);
        } else if (w < 640) {
          setQrSize(220);
        } else {
          setQrSize(250);
        }
      };

      calculateSize();
      window.addEventListener('resize', calculateSize);

      const handleFullscreenChange = () => {
        const fs = !!document.fullscreenElement;
        setIsFullscreen(fs);
        calculateSize();
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

      const unsubVoting = subscribeToVotingSettings((settings) => {
        setVotingSettings(settings);
      });

      return () => {
        unsubVoting();
        window.removeEventListener('resize', calculateSize);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      };
    }
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Fullscreen request error:', err);
      });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  const handlePointerCoords = ({ normX, normY }: { x: number; y: number; normX: number; normY: number }) => {
    setTilt({
      x: Number((normX * 7).toFixed(2)),
      y: Number((-normY * 7).toFixed(2)),
    });
  };

  const isVotingLive = !!votingSettings.isVotingOpen;

  return (
    <div className="relative min-h-screen w-full text-novera-paper flex flex-col items-center justify-between p-3 sm:py-4 sm:px-6 select-none overflow-y-auto overflow-x-hidden">
      {/* 🌟 GRAND STAGE OPENING BROADCAST & ANNOUNCEMENT OVERLAY */}
      {showOpeningBroadcast && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 select-none animate-in fade-in duration-500">
          <RunwayStageBackground contained className="opacity-95 pointer-events-none" />

          <div className="max-w-2xl w-full text-center space-y-6 relative p-6 sm:p-10 rounded-3xl bg-black/75 border-2 border-novera-gold/60 shadow-[0_0_120px_rgba(212,175,55,0.5)] backdrop-blur-3xl animate-in zoom-in-95 duration-400">
            {/* Top Golden Light Ray */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent animate-scan-sweep" />

            {/* Glowing Golden Stage Emblem */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-400/30 animate-ping" />
              <div className="absolute -inset-3 rounded-full border border-amber-300/40 animate-spin" style={{ animationDuration: '6s' }} />
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-900/90 via-black to-black border-2 border-novera-gold flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.7)]">
                <Vote className="w-10 h-10 sm:w-12 sm:h-12 text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)] animate-pulse" />
              </div>
            </div>

            {/* Stage Headline */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-xs sm:text-sm font-mono font-bold text-amber-300 uppercase tracking-[0.3em] shadow-sm animate-pulse">
                <Sparkles className="w-4 h-4 text-novera-gold" />
                <span>Audience Voting Live Now</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-novera-gold tracking-tight pt-2">
                NOVERA &rsquo;26 Runway Ballot
              </h1>
              <p className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-zinc-300">
                Official Stage Showcase &bull; AIESEC in CINEC
              </p>
            </div>

            {/* Grand Stage Talk / Announcement Speech Box */}
            <div className="p-5 rounded-2xl bg-white/[0.05] border border-amber-500/40 text-center space-y-2.5 shadow-inner">
              <p className="text-sm sm:text-base text-zinc-100 leading-relaxed font-serif italic">
                &ldquo;Ladies and Gentlemen, public voting for NOVERA &rsquo;26 is officially open! Please point your smartphone cameras at the illuminated stage QR code now to cast your votes for Best Male Model &amp; Best Female Model.&rdquo;
              </p>
              <div className="pt-2 border-t border-white/10 text-xs sm:text-sm font-mono text-amber-300/90 font-semibold">
                Official Audience Voting Active &bull; Point Smartphone Camera &amp; Scan Stage QR Code
              </div>
            </div>

            {/* Proceed to QR button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowOpeningBroadcast(false)}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-novera-gold via-amber-300 to-amber-500 text-black font-extrabold text-xs sm:text-sm uppercase tracking-wider hover:brightness-110 shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Proceed to QR Scanner</span>
                <Sparkles className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 CINEMATIC STAGE OPENING COUNTDOWN (5-4-3-2-1) */}
      {votingSettings.countdownUntil && votingSettings.countdownUntil > Date.now() && (
        <VotingCountdownOverlay
          countdownUntil={votingSettings.countdownUntil}
          onComplete={() => {
            setShowOpeningBroadcast(true);
            playLuxuryChime();
          }}
        />
      )}

      {/* 🎬 CINEMATIC STAGE ENTRANCE TRANSITION (WHEN VISITING /QR) */}
      {stageEntryAnimation && (
        <div
          className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 select-none animate-in fade-in duration-500 cursor-pointer"
          onClick={() => setStageEntryAnimation(false)}
        >
          <RunwayStageBackground contained className="opacity-95 pointer-events-none" />

          {/* Shimmering Ambient Spotlight */}
          <div className="absolute inset-0 bg-radial from-amber-500/20 via-black/80 to-black -z-10" />

          <div className="max-w-xl w-full text-center space-y-6 relative p-8 sm:p-12 rounded-3xl bg-black/80 border-2 border-novera-gold/60 shadow-[0_0_120px_rgba(212,175,55,0.45)] backdrop-blur-3xl animate-in zoom-in-95 duration-400">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent animate-scan-sweep" />

            {/* Glowing Golden Rotating Crest */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-400/30 animate-ping" />
              <div className="absolute -inset-3 rounded-full border border-amber-300/40 animate-spin" style={{ animationDuration: '6s' }} />
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-950/90 via-black to-black border-2 border-novera-gold flex items-center justify-center shadow-[0_0_50px_rgba(212,175,55,0.7)]">
                <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.9)] animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-xs sm:text-sm font-mono font-bold text-amber-300 uppercase tracking-[0.3em] shadow-sm animate-pulse">
                <span>Official Runway Stage</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-novera-gold tracking-tight pt-1">
                NOVERA &rsquo;26
              </h1>
              <p className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-zinc-300">
                AIESEC in CINEC Presents &bull; Live Telemetry Stage
              </p>
            </div>

            {/* Welcome Talk / Announcement Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.05] border border-amber-500/40 text-center space-y-2 shadow-inner">
              <p className="text-sm sm:text-base text-zinc-100 leading-relaxed font-serif italic">
                &ldquo;Welcome to the Official Stage Projection. High-speed audience QR voting terminal initialized and synchronized with central tabulation.&rdquo;
              </p>
              <div className="pt-2 border-t border-white/10 text-xs sm:text-sm font-mono text-amber-300 font-semibold">
                Welcome to NOVERA &rsquo;26 Official Stage Display &bull; System Ready
              </div>
            </div>

            {/* Touch / Click to Proceed */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setStageEntryAnimation(false)}
                className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-mono font-bold uppercase tracking-widest text-zinc-300 hover:text-white border border-white/20 transition-all cursor-pointer"
              >
                Tap anywhere or click to enter &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👑 GRAND HAUTE COUTURE VOTING CONCLUDED CEREMONY OVERLAY */}
      {showClosingCeremony && (
        <VotingClosedCeremonyOverlay
          autoRedirectSeconds={7}
          onComplete={() => {
            if (typeof document !== 'undefined' && document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            }
            router.push('/admin');
          }}
        />
      )}

      {/* 🌟 Cinematic Fashion Runway Stage Video Background */}
      <RunwayStageBackground />

      {/* 🔒 Quick Return to Master Admin Hub */}
      <Link
        href="/admin"
        className="fixed top-4 left-4 z-40 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/90 text-zinc-300 hover:text-white border border-white/20 backdrop-blur-md text-xs font-mono transition-all shadow-md"
        title="Return to Master Admin Hub"
      >
        <Lock className="w-3.5 h-3.5 text-novera-gold" />
        <span>Admin Hub</span>
      </Link>

      {/* Interactive Cinematic Stage Canvas Background */}
      <StageQrInteractiveBackground onPointerMoveCoords={handlePointerCoords} />

      {/* Main Content (Elevated above interactive canvas) */}
      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center text-center space-y-3 sm:space-y-4 my-auto">
        {/* Title */}
        <div className="space-y-1 px-2">
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white drop-shadow-md">
            {isVotingLive ? (
              <>Scan to Vote &bull; <span className="text-novera-foil">NOVERA ’26</span></>
            ) : (
              <>Official Runway Ballot &bull; <span className="text-novera-foil">NOVERA ’26</span></>
            )}
          </h1>
          <p className="text-[11px] sm:text-xs md:text-sm text-zinc-300 max-w-xl mx-auto px-2 font-light tracking-wide leading-relaxed">
            {isVotingLive
              ? 'Point your smartphone camera at the illuminated QR code to cast your votes for Best Male Model and Best Female Model.'
              : 'Audience voting will unlock live on this screen during the runway showcase. Watch the stage for the official opening countdown!'}
          </p>
        </div>

        {/* ⏱️ Live 10-Minute Countdown Stage Clock */}
        {isVotingLive && remainingTimeText && (
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-black/60 backdrop-blur-2xl border-2 border-novera-gold/70 text-white shadow-[0_0_35px_rgba(203,167,95,0.4)] animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-novera-gold animate-ping shrink-0" />
            <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.2em] text-novera-gold font-bold">
              Voting Closes In:
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 tracking-widest drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]">
              {remainingTimeText}
            </span>
          </div>
        )}

        {/* Transparent Frosted Glass Card with Interactive 3D Tilt */}
        <div
          style={{
            transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          className="relative group p-4 sm:p-6 rounded-3xl bg-black/40 backdrop-blur-2xl border-2 border-novera-foil/40 shadow-[0_25px_90px_rgba(0,0,0,0.85),0_0_60px_rgba(179,146,79,0.3)] hover:border-novera-foil transition-all duration-300 flex flex-col items-center max-w-[94vw] sm:max-w-md w-full overflow-hidden"
        >
          {/* Subtle Ambient Golden Glow Behind QR */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full max-w-sm h-36 bg-amber-400/10 blur-3xl animate-pulse" />
          </div>

          {/* Decorative Corner Accents on Glass Card */}
          <div className="absolute top-3 left-3 w-4 h-4 sm:w-5 sm:h-5 border-t-2 border-l-2 border-novera-foil/70" />
          <div className="absolute top-3 right-3 w-4 h-4 sm:w-5 sm:h-5 border-t-2 border-r-2 border-novera-foil/70" />
          <div className="absolute bottom-3 left-3 w-4 h-4 sm:w-5 sm:h-5 border-b-2 border-l-2 border-novera-foil/70" />
          <div className="absolute bottom-3 right-3 w-4 h-4 sm:w-5 sm:h-5 border-b-2 border-r-2 border-novera-foil/70" />

          {isVotingLive ? (
            /* High-Contrast Focused QR Code Stage Podium (Unlocked & Active) */
            <div
              className="p-3 sm:p-5 bg-white rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.7),0_0_80px_rgba(218,165,32,0.4)] border-2 border-amber-300/80 flex items-center justify-center relative z-10 transition-transform duration-300 group animate-in zoom-in-90 duration-500"
            >
              {/* Gold Target Reticles */}
              <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 border-t-2 border-l-2 border-amber-500" />
              <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 border-t-2 border-r-2 border-amber-500" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 border-b-2 border-l-2 border-amber-500" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 border-b-2 border-r-2 border-amber-500" />

              {/* Sweeping Laser Scanner Beam */}
              <div className="absolute left-2 right-2 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_18px_rgba(251,191,36,1)] animate-qr-laser z-20 pointer-events-none" />

              {votingUrl ? (
                <QRCodeSVG
                  value={votingUrl}
                  size={qrSize}
                  level="H"
                  includeMargin={false}
                  fgColor="#0b0b0b"
                  bgColor="#ffffff"
                />
              ) : (
                <div
                  style={{ width: `${qrSize}px`, height: `${qrSize}px` }}
                  className="flex items-center justify-center"
                >
                  <RefreshCw className="w-8 h-8 animate-spin text-novera-foil" />
                </div>
              )}
            </div>
          ) : (
            /* Locked Stage Standby Emblem (Until Voting is Opened) */
            <div
              style={{ width: `${qrSize + 40}px`, minHeight: `${qrSize + 40}px` }}
              className="p-6 bg-black/60 rounded-2xl shadow-[0_0_40px_rgba(203,167,95,0.2)] border-2 border-novera-gold/40 flex flex-col items-center justify-center text-center relative z-10 space-y-4 animate-in fade-in duration-300"
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-novera-gold/60 bg-black/80 flex items-center justify-center shadow-[0_0_25px_rgba(203,167,95,0.4)]">
                <div className="absolute inset-0 rounded-full border border-amber-300/30 border-dashed animate-spin-slow" />
                <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-novera-gold animate-pulse" />
              </div>
              <div className="space-y-1">
                <span className="text-xs sm:text-sm font-serif font-bold uppercase tracking-wider text-white block">
                  Voting Ballot Standby
                </span>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-200/80 block">
                  Awaiting Opening Signal
                </span>
              </div>
            </div>
          )}

          {/* Subtitle Under QR with Live Pulse */}
          <div className="mt-3 sm:mt-4 flex flex-col items-center gap-1.5 relative z-10">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase text-zinc-100">
              {isVotingLive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-novera-gold animate-ping shrink-0" />
                  <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-novera-gold shrink-0" />
                  <span className="truncate">Open Camera &bull; Scan to Vote</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-novera-gold shrink-0" />
                  <span className="truncate">Standby &bull; Unlocks After Countdown</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls (Fullscreen stage view for projector & manual announce) */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full max-w-md px-4">
          <button
            type="button"
            onClick={() => {
              playLuxuryChime();
              setShowOpeningBroadcast(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-novera-gold/20 hover:bg-novera-gold/30 text-amber-300 text-xs font-semibold uppercase tracking-wider transition-all border border-novera-gold/40 shadow-md backdrop-blur-md cursor-pointer"
            title="Play opening announcement animation on stage screen"
          >
            <Sparkles className="w-3.5 h-3.5 text-novera-gold" />
            <span>Announce Voting</span>
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider transition-all border border-white/20 shadow-md backdrop-blur-md hover:border-novera-gold/50 cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Stage Fullscreen'}</span>
          </button>
        </div>

        {/* Rules Reminder */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-6 text-[10px] sm:text-xs text-zinc-400 pt-2 border-t border-white/10 px-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-novera-gold" />
            <span>1 Boy Vote + 1 Girl Vote Per Device</span>
          </div>
          <div className="hidden sm:inline">&bull;</div>
          <span>AIESEC in CINEC</span>
        </div>
      </div>
    </div>
  );
}

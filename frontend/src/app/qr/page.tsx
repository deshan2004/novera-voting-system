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
import { subscribeToVotingSettings, saveVotingSettings } from '@/lib/api';
import { VotingSettings } from '@/lib/types';

export default function QrDisplayPage() {
  const router = useRouter();
  const [votingUrl, setVotingUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [qrSize, setQrSize] = useState<number>(230);
  const [votingSettings, setVotingSettings] = useState<VotingSettings>({ isVotingOpen: true });
  const [remainingTimeText, setRemainingTimeText] = useState<string>('');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const wasVotingOpenRef = useRef<boolean>(false);

  // Auto-redirect back to /admin when voting concludes or closes
  useEffect(() => {
    if (votingSettings.isVotingOpen) {
      wasVotingOpenRef.current = true;
    } else if (wasVotingOpenRef.current && !votingSettings.isVotingOpen) {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      router.push('/admin');
    }
  }, [votingSettings.isVotingOpen, router]);

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
        // Automatically close voting when timer reaches 0 & auto-return to admin hub
        saveVotingSettings({
          isVotingOpen: false,
          votingClosesAt: null,
          countdownUntil: null,
          announcement: 'Audience voting has concluded for NOVERA ’26.',
        });
        setRemainingTimeText('00:00');
        if (typeof document !== 'undefined' && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        router.push('/admin');
        return;
      }

      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      setRemainingTimeText(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [votingSettings.isVotingOpen, votingSettings.votingClosesAt, router]);

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

        {/* Action Controls (Fullscreen stage view for projector) */}
        <div className="flex items-center justify-center pt-1 w-full max-w-xs px-4">
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider transition-all border border-white/20 shadow-md backdrop-blur-md hover:border-novera-gold/50"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Stage Fullscreen Mode'}</span>
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

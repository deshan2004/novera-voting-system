'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Maximize2,
  Minimize2,
  Sparkles,
  Smartphone,
  Vote,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import StageQrInteractiveBackground from '@/app/components/StageQrInteractiveBackground';

export default function QrDisplayPage() {
  const [votingUrl, setVotingUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setVotingUrl(`${origin}/vote?entry=qr`);
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Fullscreen request error:', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handlePointerCoords = ({ normX, normY }: { x: number; y: number; normX: number; normY: number }) => {
    setTilt({
      x: Number((normX * 7).toFixed(2)),
      y: Number((-normY * 7).toFixed(2)),
    });
  };

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-novera-paper flex flex-col items-center justify-center p-4 sm:p-8 select-none overflow-hidden">
      {/* Interactive Cinematic Stage Canvas Background */}
      <StageQrInteractiveBackground onPointerMoveCoords={handlePointerCoords} />

      {/* Main Content (Elevated above interactive canvas) */}
      <div className="relative z-10 max-w-4xl w-full flex flex-col items-center text-center space-y-6 sm:space-y-7 my-auto">
        {/* Header Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-black/50 backdrop-blur-xl border border-novera-foil/50 text-xs sm:text-sm uppercase tracking-[0.25em] font-semibold text-novera-gold shadow-[0_0_20px_rgba(203,167,95,0.25)]">
          <Sparkles className="w-4 h-4 text-novera-gold animate-spin" style={{ animationDuration: '6s' }} />
          <span>Stage 01 &bull; Official Audience QR Code</span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white drop-shadow-md">
            Scan to Vote &bull; <span className="text-novera-foil">NOVERA ’26</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-zinc-300 max-w-xl mx-auto px-4 font-light tracking-wide">
            Point your smartphone camera at the illuminated QR code to cast your votes for Best Male Model and Best Female Model.
          </p>
        </div>

        {/* Transparent Frosted Glass Card with Interactive 3D Tilt */}
        <div
          style={{
            transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          className="relative group p-6 sm:p-9 rounded-3xl bg-black/40 backdrop-blur-2xl border-2 border-novera-foil/40 shadow-[0_25px_90px_rgba(0,0,0,0.85),0_0_60px_rgba(179,146,79,0.3)] hover:border-novera-foil transition-all duration-300 flex flex-col items-center max-w-[90vw] overflow-hidden"
        >
          {/* Subtle Ambient Golden Glow Behind QR */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-novera-gold/15 blur-3xl animate-pulse" />
          </div>

          {/* Decorative Corner Accents on Glass Card */}
          <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-novera-foil/70" />
          <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-novera-foil/70" />
          <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-novera-foil/70" />
          <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-novera-foil/70" />

          {/* High-Contrast Focused QR Code Stage Podium (Ensures 100% Reliable Scanning) */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.7),0_0_80px_rgba(218,165,32,0.4)] border-2 border-amber-300/80 flex items-center justify-center relative z-10 transition-transform duration-300 group-hover:scale-[1.02]">
            {/* Gold Target Reticles */}
            <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-amber-500" />
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-amber-500" />
            <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-amber-500" />
            <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-amber-500" />

            {/* Sweeping Laser Scanner Beam */}
            <div className="absolute left-2 right-2 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_18px_rgba(251,191,36,1)] animate-qr-laser z-20 pointer-events-none" />

            {votingUrl ? (
              <QRCodeSVG
                value={votingUrl}
                size={isFullscreen ? 320 : 250}
                level="H"
                includeMargin={false}
                fgColor="#0b0b0b"
                bgColor="#ffffff"
              />
            ) : (
              <div className="w-[250px] h-[250px] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-novera-foil" />
              </div>
            )}
          </div>

          {/* Subtitle Under QR with Live Pulse */}
          <div className="mt-5 flex items-center gap-2.5 text-xs font-bold tracking-[0.2em] uppercase text-zinc-100 relative z-10">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <Smartphone className="w-4 h-4 text-novera-gold" />
            <span>Open Camera &bull; Scan Instantly to Vote</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-1">
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider transition-all border border-white/20 shadow-md backdrop-blur-md"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Stage Fullscreen Mode'}</span>
          </button>

          <a
            href="/vote"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-novera-foil text-novera-paper hover:bg-novera-ink text-xs font-semibold uppercase tracking-wider transition-all shadow-md"
          >
            <Vote className="w-4 h-4" />
            <span>Open Voting Ballot</span>
          </a>
        </div>

        {/* Rules Reminder */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 text-[11px] sm:text-xs text-zinc-400 pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>1 Boy Vote + 1 Girl Vote Per Device</span>
          </div>
          <div>&bull;</div>
          <span>AIESEC in CINEC</span>
        </div>
      </div>
    </div>
  );
}

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

export default function QrDisplayPage() {
  const [votingUrl, setVotingUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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

  return (
    <div className="min-h-screen w-full bg-novera-ink text-novera-paper flex flex-col items-center justify-center p-4 sm:p-8 select-none">
      <div className="max-w-4xl w-full flex flex-col items-center text-center space-y-6 sm:space-y-8 my-auto">
        {/* Header Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-novera-foil/20 border border-novera-foil/40 text-xs sm:text-sm uppercase tracking-[0.25em] font-semibold text-novera-gold">
          <Sparkles className="w-4 h-4 text-novera-gold animate-spin" style={{ animationDuration: '6s' }} />
          <span>Stage 01 &bull; Official Audience QR Code</span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-novera-paper">
            Scan to Vote &bull; <span className="gold-gradient-text">NOVERA ’26</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-novera-silver max-w-xl mx-auto px-4">
            Point your smartphone camera at the QR code below to open the official ballot. Vote for 1 Male Model and 1 Female Model.
          </p>
        </div>

        {/* QR Code Presentation Frame with Live Laser Scanner */}
        <div className="relative group p-5 sm:p-8 rounded-3xl bg-white shadow-[0_0_60px_rgba(203,167,95,0.25)] border-4 border-novera-foil/50 hover:border-novera-foil transition-all duration-300 flex flex-col items-center max-w-[90vw] overflow-hidden">
          {/* Animated Gold Laser Scanner Line */}
          <div className="absolute left-4 right-4 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(251,191,36,0.9)] animate-qr-laser z-20 pointer-events-none" />

          {/* Decorative Corner Accents */}
          <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-novera-foil animate-pulse" />
          <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-novera-foil animate-pulse" />
          <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-novera-foil animate-pulse" />
          <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-novera-foil animate-pulse" />

          {/* QR Code Container */}
          <div className="p-3 sm:p-4 bg-white rounded-2xl shadow-inner border border-novera-ink/10 flex items-center justify-center relative z-10">
            {votingUrl ? (
              <QRCodeSVG
                value={votingUrl}
                size={isFullscreen ? 320 : 240}
                level="H"
                includeMargin={true}
                fgColor="#0b0b0b"
                bgColor="#ffffff"
              />
            ) : (
              <div className="w-[240px] h-[240px] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-novera-foil" />
              </div>
            )}
          </div>

          {/* Subtitle Under QR with Live Pulse */}
          <div className="mt-4 flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-novera-ink relative z-10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <Smartphone className="w-4 h-4 text-novera-foil" />
            <span>Open Camera &bull; Scan Instantly to Vote</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-novera-paper text-xs font-semibold uppercase tracking-wider transition-all border border-white/15 shadow-sm"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Stage Fullscreen Mode'}</span>
          </button>

          <a
            href="/vote"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-novera-foil text-novera-paper hover:bg-novera-gold text-xs font-semibold uppercase tracking-wider transition-all shadow-sm"
          >
            <Vote className="w-4 h-4" />
            <span>Open Voting Ballot</span>
          </a>
        </div>

        {/* Ballot Rules Reminder */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 text-[11px] sm:text-xs text-novera-silver pt-4 border-t border-white/10">
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

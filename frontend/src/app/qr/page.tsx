'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ExternalLink,
  Sparkles,
  Smartphone,
  Vote,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export default function QrDisplayPage() {
  const [votingUrl, setVotingUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setVotingUrl(`${origin}/vote`);
    }
  }, []);

  const handleCopy = () => {
    if (!votingUrl) return;
    navigator.clipboard.writeText(votingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error('Fullscreen error:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center p-4 sm:p-8 transition-colors ${
        isFullscreen ? 'bg-novera-ink text-novera-paper py-12' : 'bg-novera-paper text-novera-ink'
      }`}
    >
      <div className="max-w-4xl w-full flex flex-col items-center text-center space-y-8">
        {/* Header Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-novera-foil/15 border border-novera-foil/40 text-xs sm:text-sm uppercase tracking-[0.25em] font-semibold text-novera-foil">
          <Sparkles className="w-4 h-4 text-novera-gold animate-spin" style={{ animationDuration: '6s' }} />
          <span>Stage 01 &bull; Official Audience QR Code</span>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
            Scan to Vote &bull; <span className="gold-gradient-text">NOVERA ’26</span>
          </h1>
          <p className="text-sm sm:text-base text-novera-charcoal max-w-xl mx-auto">
            Point your smartphone camera at the QR code below to open the official ballot. Vote for 1 Male Model and 1 Female Model.
          </p>
        </div>

        {/* QR Code Presentation Frame */}
        <div className="relative group p-6 sm:p-8 rounded-3xl bg-white shadow-2xl border-4 border-novera-foil/30 hover:border-novera-foil transition-all duration-300 flex flex-col items-center">
          {/* Decorative Corner Accents */}
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-novera-foil" />
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-novera-foil" />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-novera-foil" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-novera-foil" />

          {/* QR Code */}
          <div className="p-4 bg-white rounded-2xl shadow-inner border border-novera-ink/10">
            {votingUrl ? (
              <QRCodeSVG
                value={votingUrl}
                size={isFullscreen ? 320 : 250}
                level="H"
                includeMargin={true}
                fgColor="#0b0b0b"
                bgColor="#ffffff"
              />
            ) : (
              <div className="w-[250px] h-[250px] flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-novera-foil" />
              </div>
            )}
          </div>

          {/* Subtitle Under QR */}
          <div className="mt-4 flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-novera-ink">
            <Smartphone className="w-4 h-4 text-novera-foil" />
            <span>Open Camera &bull; Scan Instantly</span>
          </div>
        </div>

        {/* URL Box & Controls */}
        <div className="w-full max-w-md space-y-3">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-novera-ink/15 shadow-sm">
            <input
              type="text"
              readOnly
              value={votingUrl}
              className="flex-grow px-3 py-1.5 text-xs text-novera-ink font-mono bg-transparent outline-none truncate"
            />
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-novera-ink text-novera-paper hover:bg-novera-foil text-xs font-medium transition-colors"
              title="Copy URL to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <a
              href={votingUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-novera-charcoal hover:text-novera-foil hover:bg-novera-paper-dim transition-colors"
              title="Test open voting ballot in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-novera-charcoal text-novera-paper hover:bg-novera-ink text-xs font-semibold uppercase tracking-wider transition-all shadow-sm"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Stage Fullscreen Mode'}</span>
          </button>

          <a
            href="/vote"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-novera-foil text-novera-paper hover:bg-novera-ink text-xs font-semibold uppercase tracking-wider transition-all shadow-sm"
          >
            <Vote className="w-4 h-4" />
            <span>Open Voting Ballot</span>
          </a>
        </div>

        {/* Ballot Rules Reminder */}
        <div className="flex items-center justify-center gap-6 text-xs text-novera-silver pt-4 border-t border-novera-ink/10">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>1 Boy Vote + 1 Girl Vote Per Device</span>
          </div>
          <div>&bull;</div>
          <span>CINEC Campus &middot; AIESEC in CINEC</span>
        </div>
      </div>
    </div>
  );
}


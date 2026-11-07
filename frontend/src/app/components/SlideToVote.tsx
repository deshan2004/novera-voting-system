'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crown, Sparkles, ChevronRight, Check, RefreshCw, Send, Lock } from 'lucide-react';

interface SlideToVoteProps {
  candidateName?: string;
  candidateNumber?: string;
  disabled: boolean;
  isSubmitting: boolean;
  votingOpen: boolean;
  onConfirm: () => void;
  accentColor?: string; // e.g. '#d4af37' or '#f59e0b'
  categoryName?: string;
  voterName?: string;
}

export default function SlideToVote({
  candidateName,
  candidateNumber,
  disabled,
  isSubmitting,
  votingOpen,
  onConfirm,
  accentColor = '#d4af37',
  categoryName = 'Model',
  voterName,
}: SlideToVoteProps) {
  const [dragProgress, setDragProgress] = useState<number>(0); // 0 to 1
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);

  // Reset when candidate changes or voting resets
  useEffect(() => {
    setDragProgress(0);
    setIsDragging(false);
    setIsCompleted(false);
  }, [candidateName, candidateNumber]);

  const handleDragStart = (clientX: number) => {
    if (disabled || isSubmitting || !votingOpen || !candidateName) return;
    setIsDragging(true);
    startXRef.current = clientX;
    currentXRef.current = clientX;
  };

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || !trackRef.current || !handleRef.current) return;
    const trackWidth = trackRef.current.clientWidth;
    const handleWidth = handleRef.current.clientWidth;
    const maxDrag = Math.max(1, trackWidth - handleWidth);

    const deltaX = clientX - startXRef.current;
    const progress = Math.min(1, Math.max(0, deltaX / maxDrag));
    setDragProgress(progress);

    // Haptic feedback when approaching threshold
    if (progress > 0.85 && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch (e) {}
    }
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    // Threshold to confirm vote is 80% slide
    if (dragProgress >= 0.8) {
      setIsCompleted(true);
      setDragProgress(1);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([30, 40, 60]);
        } catch (e) {}
      }
      onConfirm();
    } else {
      // Spring back to start
      setDragProgress(0);
    }
  }, [isDragging, dragProgress, onConfirm]);

  // Global mouse/touch move listeners while dragging
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX);
    const onMouseUp = () => handleDragEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        handleDragMove(e.touches[0].clientX);
      }
    };
    const onTouchEnd = () => handleDragEnd();

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd);
      window.addEventListener('touchcancel', onTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Compute translateX for the handle in pixels
  const getHandleTranslateX = () => {
    if (!trackRef.current || !handleRef.current) return 0;
    const trackWidth = trackRef.current.clientWidth;
    const handleWidth = handleRef.current.clientWidth;
    const maxDrag = Math.max(0, trackWidth - handleWidth);
    return dragProgress * maxDrag;
  };

  return (
    <div className="w-full space-y-1.5 select-none">
      {/* Slider Action Track */}
      <div
        ref={trackRef}
        className={`relative h-16 sm:h-18 rounded-2xl p-1.5 flex items-center overflow-hidden transition-colors border backdrop-blur-xl ${
          disabled || !candidateName || !votingOpen
            ? 'bg-white/[0.03] border-white/10 opacity-70 cursor-not-allowed'
            : isDragging
            ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_35px_rgba(212,175,55,0.4)]'
            : 'bg-black/80 border-amber-500/40 hover:border-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.2)]'
        }`}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Fill bar behind the slider */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/30 via-amber-400/50 to-yellow-300/60 pointer-events-none transition-all duration-75"
          style={{ width: `${Math.round(dragProgress * 100)}%` }}
        />

        {/* Shimmer sweep animation */}
        {!disabled && candidateName && votingOpen && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-scan-sweep pointer-events-none" />
        )}

        {/* Center Track Prompt Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-14 text-center">
          {isSubmitting ? (
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold font-mono text-amber-200 uppercase tracking-widest animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
              <span>Verifying &amp; Recording Ballot...</span>
            </div>
          ) : !votingOpen ? (
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-zinc-400 font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Voting Session Closed</span>
            </div>
          ) : !candidateName ? (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-sans font-medium text-zinc-400">
              <span className="text-amber-400">&larr;</span>
              <span>Tap a candidate above, then slide here to vote</span>
            </div>
          ) : dragProgress > 0.8 ? (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black font-sans text-white uppercase tracking-wider animate-bounce">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Release to Confirm Vote!</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-100 truncate">
              <span className="font-serif text-amber-300 font-black">
                {candidateNumber ? `${candidateNumber} ` : ''}{candidateName}
              </span>
              <span className="text-zinc-400 font-mono text-[10px] hidden sm:inline">&bull;</span>
              <span className="text-zinc-300 text-[11px] sm:text-xs hidden sm:inline font-mono">
                Slide knob to vote &rarr;
              </span>
            </div>
          )}
        </div>

        {/* Draggable Knob */}
        <div
          ref={handleRef}
          onMouseDown={(e) => handleDragStart(e.clientX)}
          onTouchStart={(e) => {
            if (e.touches && e.touches[0]) {
              handleDragStart(e.touches[0].clientX);
            }
          }}
          style={{
            transform: `translateX(${getHandleTranslateX()}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
          className={`relative z-20 h-13 sm:h-15 min-w-[56px] sm:min-w-[64px] px-3 rounded-xl flex items-center justify-center gap-1 cursor-grab active:cursor-grabbing shadow-2xl transition-all ${
            disabled || !candidateName || !votingOpen
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : isCompleted || dragProgress > 0.8
              ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-black shadow-[0_0_30px_rgba(16,185,129,0.8)] scale-105'
              : 'bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa7c11] text-black hover:brightness-110 shadow-[0_0_25px_rgba(212,175,55,0.6)]'
          }`}
        >
          {isSubmitting ? (
            <RefreshCw className="w-5 h-5 animate-spin text-black" />
          ) : isCompleted || dragProgress > 0.8 ? (
            <Check className="w-5 h-5 stroke-[3] text-black" />
          ) : (
            <>
              <Crown className="w-4 h-4 fill-black text-black shrink-0" />
              <ChevronRight className="w-4 h-4 stroke-[3] text-black animate-pulse" />
            </>
          )}
        </div>
      </div>

      {/* Quick helper caption under slider */}
      {candidateName && votingOpen && (
        <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400 font-mono">
          <span className="flex items-center gap-1 text-amber-300/80">
            <span>👉 නම ගාවින් Knob එක දකුණට අදින්න (Slide to Vote)</span>
          </span>
          {/* Quick tap-to-vote backup button if mobile touch drag is clumsy */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled || isSubmitting || !votingOpen}
            className="text-[10px] text-zinc-400 hover:text-amber-300 underline font-sans ml-auto transition-colors"
          >
            Or tap here to vote directly
          </button>
        </div>
      )}
    </div>
  );
}


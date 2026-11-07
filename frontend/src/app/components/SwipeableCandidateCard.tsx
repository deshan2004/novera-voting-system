'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Crown, ChevronRight, Check, Sparkles, RefreshCw, Lock } from 'lucide-react';
import { Candidate } from '@/lib/types';

interface SwipeableCandidateCardProps {
  candidate: Candidate;
  isVotedForThis: boolean;
  canVote: boolean;
  isSubmitting: boolean;
  onVote: (candidateId: string) => void;
  onViewProfile?: () => void;
}

export default function SwipeableCandidateCard({
  candidate,
  isVotedForThis,
  canVote,
  isSubmitting,
  onVote,
  onViewProfile,
}: SwipeableCandidateCardProps) {
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const isHorizontalDragRef = useRef<boolean | null>(null);

  const handleStart = (clientX: number, clientY: number) => {
    if (!canVote || isSubmitting || isVotedForThis || isConfirmed) return;
    setIsDragging(true);
    startXRef.current = clientX;
    startYRef.current = clientY;
    isHorizontalDragRef.current = null;
  };

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !cardRef.current) return;

    const deltaX = clientX - startXRef.current;
    const deltaY = clientY - startYRef.current;

    // Detect if user is intentionally scrolling vertically vs dragging horizontally
    if (isHorizontalDragRef.current === null) {
      if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
        isHorizontalDragRef.current = false;
        setIsDragging(false);
        setDragOffset(0);
        return;
      }
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isHorizontalDragRef.current = true;
      }
    }

    if (isHorizontalDragRef.current) {
      const cardWidth = cardRef.current.clientWidth || 300;
      const maxDrag = Math.max(1, cardWidth - 50);
      const offset = Math.min(maxDrag, Math.max(0, deltaX));
      setDragOffset(offset);

      // Subtle haptic tick when reaching vote confirmation threshold
      if (offset / maxDrag > 0.6 && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(15);
        } catch (e) {}
      }
    }
  }, [isDragging]);

  const handleEnd = useCallback(() => {
    if (!isDragging || !cardRef.current) return;
    setIsDragging(false);

    const cardWidth = cardRef.current.clientWidth || 300;
    const maxDrag = Math.max(1, cardWidth - 50);
    const progress = dragOffset / maxDrag;

    // Threshold: if dragged more than 55% of the card width, confirm the vote!
    if (progress >= 0.55 && canVote && !isSubmitting) {
      setIsConfirmed(true);
      setDragOffset(maxDrag);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([30, 40, 60]);
        } catch (e) {}
      }
      onVote(candidate.id);
    } else {
      // Spring back
      setDragOffset(0);
    }
  }, [isDragging, dragOffset, canVote, isSubmitting, candidate.id, onVote]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => handleEnd();

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
  }, [isDragging, handleMove, handleEnd]);

  const cardWidth = cardRef.current?.clientWidth || 300;
  const maxDrag = Math.max(1, cardWidth - 50);
  const progress = dragOffset / maxDrag;
  const isPastThreshold = progress >= 0.55;

  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl overflow-hidden select-none"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Background Reveal Track - ONLY visible when user is dragging (never leaks when static) */}
      <div
        style={{
          opacity: dragOffset > 0 ? 1 : 0,
          pointerEvents: 'none',
        }}
        className={`absolute inset-0 rounded-2xl flex items-center justify-between px-4 transition-opacity duration-150 border ${
          isPastThreshold
            ? 'bg-gradient-to-r from-emerald-950/90 via-black/90 to-emerald-900/80 border-emerald-500/60 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.35)]'
            : 'bg-gradient-to-r from-amber-950/80 via-black/90 to-amber-900/60 border-amber-500/40 text-amber-300 shadow-[inset_0_0_25px_rgba(212,175,55,0.25)]'
        }`}
      >
        <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase tracking-wider pl-2">
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>{isPastThreshold ? 'Release to Vote!' : 'Slide right to confirm &rarr;'}</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono font-bold text-xs pr-2 text-amber-300/80">
          <Crown className="w-4 h-4" />
          <span>#{candidate.candidateNumber}</span>
        </div>
      </div>

      {/* Main Foreground Card - Elegant Transparent Dark Glass */}
      <div
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          if (e.touches && e.touches[0]) {
            handleStart(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
        className={`relative z-10 p-3.5 rounded-2xl text-left flex items-center justify-between gap-3 border transition-colors ${
          isVotedForThis
            ? 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
            : isConfirmed
            ? 'bg-amber-950/40 border-amber-400/80 text-white shadow-[0_0_25px_rgba(212,175,55,0.3)]'
            : isDragging
            ? 'bg-[#120f0a]/95 border-amber-400 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_25px_rgba(212,175,55,0.3)] cursor-grabbing backdrop-blur-xl'
            : 'bg-black/60 hover:bg-black/80 border-white/10 hover:border-amber-400/40 text-white backdrop-blur-xl cursor-grab active:cursor-grabbing shadow-lg'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Candidate Number Badge */}
          <span
            className={`w-11 h-11 rounded-xl font-mono text-xs font-black flex items-center justify-center shrink-0 whitespace-nowrap transition-colors ${
              isVotedForThis
                ? 'bg-emerald-500 text-black font-extrabold'
                : 'bg-white/10 text-novera-gold border border-white/15'
            }`}
          >
            {candidate.candidateNumber}
          </span>

          {/* Model Name & Category */}
          <div className="min-w-0 flex-1">
            <span className="font-serif font-bold text-sm sm:text-base leading-snug block text-white break-words">
              {candidate.name}
            </span>
            <span
              className={`text-[11px] block mt-0.5 ${
                isVotedForThis ? 'text-emerald-300 font-semibold' : 'text-zinc-400'
              }`}
            >
              {isVotedForThis ? 'Your Recorded Vote' : 'Official Contender'}
            </span>
          </div>
        </div>

        {/* Swipe / Status Action Badge on the right */}
        <div className="shrink-0 flex items-center">
          {isVotedForThis ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Voted</span>
            </div>
          ) : isSubmitting && isConfirmed ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Voting...</span>
            </div>
          ) : canVote ? (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-amber-400/40 text-zinc-300 hover:text-amber-300 text-[11px] font-mono font-semibold tracking-wide transition-all shadow-sm">
              <span>Swipe</span>
              <ChevronRight className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-white/20 flex items-center justify-center text-zinc-500">
              <Lock className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

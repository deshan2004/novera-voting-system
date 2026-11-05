'use client';

import { useEffect, useRef, useState } from 'react';

interface RunwayStageBackgroundProps {
  className?: string;
  contained?: boolean;
}

export default function RunwayStageBackground({
  className = '',
  contained = false,
}: RunwayStageBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const container = canvas.parentElement;
    let width = (canvas.width = contained && container ? container.clientWidth : window.innerWidth);
    let height = (canvas.height = contained && container ? container.clientHeight : window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      const c = canvas.parentElement;
      width = canvas.width = contained && c ? c.clientWidth : window.innerWidth;
      height = canvas.height = contained && c ? c.clientHeight : window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // 1. Large Luxury Bokeh Orbs (Soft, out-of-focus background glow)
    const BOKEH_COUNT = 12;
    const bokehOrbs = Array.from({ length: BOKEH_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 55 + 30,
      speedY: -(Math.random() * 0.35 + 0.15),
      speedX: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.12 + 0.05,
      color: Math.random() > 0.4 ? '236, 213, 153' : '251, 191, 36',
      pulseSpeed: Math.random() * 0.01 + 0.005,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    // 2. Rising Stardust & Diamond Sparkles
    const SPARKLE_COUNT = 65;
    const sparkles = Array.from({ length: SPARKLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.8 + 0.8,
      speedY: -(Math.random() * 0.9 + 0.35),
      speedX: (Math.random() - 0.5) * 0.5,
      alpha: Math.random() * 0.75 + 0.25,
      isStar: Math.random() > 0.7,
      color: Math.random() > 0.3 ? '255, 248, 225' : '236, 213, 153',
      pulseSpeed: Math.random() * 0.03 + 0.01,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    let time = 0;

    const render = () => {
      time += 0.018;
      ctx.clearRect(0, 0, width, height);

      // --- Draw Atmospheric Runway Stage Fog Waves ---
      const waveGrad1 = ctx.createRadialGradient(
        width * 0.5 + Math.sin(time * 0.7) * 120,
        height * 0.35,
        10,
        width * 0.5,
        height * 0.35,
        width * 0.6
      );
      waveGrad1.addColorStop(0, 'rgba(179, 146, 79, 0.16)');
      waveGrad1.addColorStop(0.5, 'rgba(120, 80, 20, 0.06)');
      waveGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = waveGrad1;
      ctx.fillRect(0, 0, width, height);

      // --- Draw Large Out-Of-Focus Luxury Bokeh Orbs ---
      for (const orb of bokehOrbs) {
        orb.y += orb.speedY;
        orb.x += orb.speedX + Math.sin(time + orb.pulseOffset) * 0.2;

        if (orb.y < -orb.radius * 2) {
          orb.y = height + orb.radius * 2;
          orb.x = Math.random() * width;
        }
        if (orb.x < -orb.radius * 2) orb.x = width + orb.radius * 2;
        if (orb.x > width + orb.radius * 2) orb.x = -orb.radius * 2;

        const currentAlpha = Math.max(
          0.02,
          orb.alpha + Math.sin(time * 1.5 + orb.pulseOffset) * 0.04
        );

        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        grad.addColorStop(0, `rgba(${orb.color}, ${currentAlpha})`);
        grad.addColorStop(0.6, `rgba(${orb.color}, ${currentAlpha * 0.4})`);
        grad.addColorStop(1, `rgba(${orb.color}, 0)`);

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // --- Draw Twinkling Diamond Sparkles & Stardust ---
      for (const sp of sparkles) {
        sp.y += sp.speedY;
        sp.x += sp.speedX + Math.sin(time * 1.5 + sp.pulseOffset) * 0.4;

        if (sp.y < -15) {
          sp.y = height + 15;
          sp.x = Math.random() * width;
        }
        if (sp.x < -15) sp.x = width + 15;
        if (sp.x > width + 15) sp.x = -15;

        const pulse = Math.sin(time * 3 + sp.pulseOffset);
        const currentAlpha = Math.max(0.15, Math.min(0.95, sp.alpha + pulse * 0.35));

        // Soft outer glow
        const glowRadius = sp.radius * 4;
        const grad = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, glowRadius);
        grad.addColorStop(0, `rgba(${sp.color}, ${currentAlpha})`);
        grad.addColorStop(0.35, `rgba(${sp.color}, ${currentAlpha * 0.5})`);
        grad.addColorStop(1, `rgba(${sp.color}, 0)`);

        ctx.beginPath();
        ctx.arc(sp.x, sp.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Bright white star core
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        ctx.fill();

        // 4-Point Star Glint for prominent sparkles
        if (sp.isStar && pulse > 0.2) {
          const flareLen = sp.radius * 3.5 * (pulse + 0.5);
          ctx.strokeStyle = `rgba(255, 255, 255, ${currentAlpha * 0.8})`;
          ctx.lineWidth = 0.8;

          ctx.beginPath();
          ctx.moveTo(sp.x - flareLen, sp.y);
          ctx.lineTo(sp.x + flareLen, sp.y);
          ctx.moveTo(sp.x, sp.y - flareLen);
          ctx.lineTo(sp.x, sp.y + flareLen);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className={`${
        contained ? 'absolute inset-0' : 'fixed inset-0 -z-20'
      } pointer-events-none overflow-hidden bg-[#070605] ${className}`}
      aria-hidden="true"
    >
      {/* 1. High-Fashion Runway Looping Video */}
      {!videoError && (
        <video
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 mix-blend-screen ${
            videoLoaded ? 'opacity-40' : 'opacity-0'
          }`}
          src="https://assets.mixkit.co/videos/preview/mixkit-fashion-cold-looking-woman-concept-video-39874-large.mp4"
        />
      )}

      {/* 2. Volumetric Sweeping Theatrical Spotlights */}
      {/* Left Golden Stage Beam */}
      <div
        className="absolute -top-32 -left-32 w-[750px] h-[1100px] bg-gradient-to-br from-amber-300/30 via-amber-500/15 to-transparent blur-3xl animate-spotlight-left"
        style={{ clipPath: 'polygon(0 0, 100% 85%, 25% 100%)' }}
      />

      {/* Right Rose-Champagne Stage Beam */}
      <div
        className="absolute -top-32 -right-32 w-[750px] h-[1100px] bg-gradient-to-bl from-rose-200/25 via-amber-400/15 to-transparent blur-3xl animate-spotlight-right"
        style={{ clipPath: 'polygon(100% 0, 75% 100%, 0 85%)' }}
      />

      {/* Center Overhead Runway Chandelier Aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[550px] bg-[radial-gradient(ellipse_at_top,_rgba(236,213,153,0.35)_0%,_rgba(179,146,79,0.16)_45%,_transparent_75%)] blur-2xl animate-pulse" />

      {/* 2. Runway Catwalk Floor Stage & Perspective Track */}
      <div className="absolute bottom-0 inset-x-0 h-80 overflow-hidden opacity-55">
        {/* Catwalk Perspective Center Lane */}
        <div
          className="absolute inset-x-0 bottom-0 h-72 animate-runway-pulse"
          style={{
            background:
              'linear-gradient(to top, rgba(236, 213, 153, 0.25) 0%, rgba(179, 146, 79, 0.08) 50%, transparent 100%)',
            clipPath: 'polygon(36% 0%, 64% 0%, 92% 100%, 8% 100%)',
          }}
        />

        {/* Left & Right Runway Laser Borders */}
        <div
          className="absolute inset-x-0 bottom-0 h-72"
          style={{
            background:
              'linear-gradient(to top, rgba(255, 255, 255, 0.6) 0%, rgba(236, 213, 153, 0.2) 75%, transparent 100%)',
            clipPath: 'polygon(35.5% 0%, 36.5% 0%, 8.5% 100%, 7.5% 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-72"
          style={{
            background:
              'linear-gradient(to top, rgba(255, 255, 255, 0.6) 0%, rgba(236, 213, 153, 0.2) 75%, transparent 100%)',
            clipPath: 'polygon(63.5% 0%, 64.5% 0%, 92.5% 100%, 91.5% 100%)',
          }}
        />

        {/* Cross Runway Stage Lines */}
        <div className="absolute inset-x-0 bottom-12 h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-28 h-px bg-gradient-to-r from-transparent via-amber-200/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-48 h-px bg-gradient-to-r from-transparent via-amber-200/15 to-transparent" />
      </div>

      {/* 3. Real-time Canvas Rendering of Bokeh & Diamond Stardust */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* 4. Luxury Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_35%,_rgba(0,0,0,0.7)_100%)] pointer-events-none" />
    </div>
  );
}

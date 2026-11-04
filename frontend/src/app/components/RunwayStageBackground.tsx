'use client';

import { useEffect, useRef, useState } from 'react';

interface RunwayStageBackgroundProps {
  className?: string;
}

export default function RunwayStageBackground({ className = '' }: RunwayStageBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle definition: Golden luxury stardust & bokeh
    const PARTICLE_COUNT = 45;
    const colors = [
      'rgba(255, 245, 214, ',
      'rgba(236, 213, 153, ',
      'rgba(179, 146, 79, ',
      'rgba(251, 191, 36, ',
    ];

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.5 + 0.8,
      speedY: -(Math.random() * 0.7 + 0.3),
      speedX: (Math.random() - 0.5) * 0.4,
      colorBase: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.7 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.008,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    let time = 0;
    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Draw floating bokeh particles
      for (const p of particles) {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(time + p.pulseOffset) * 0.3;

        // Wrap around top to bottom
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const currentAlpha = Math.max(
          0.1,
          Math.min(0.9, p.alpha + Math.sin(time * 2 + p.pulseOffset) * 0.25)
        );

        // Glow gradient for each particle
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3.5);
        grad.addColorStop(0, `${p.colorBase}${currentAlpha})`);
        grad.addColorStop(0.4, `${p.colorBase}${currentAlpha * 0.6})`);
        grad.addColorStop(1, `${p.colorBase}0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Solid core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
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
      className={`fixed inset-0 pointer-events-none -z-20 overflow-hidden bg-[#070605] ${className}`}
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
            videoLoaded ? 'opacity-35' : 'opacity-0'
          }`}
          src="https://assets.mixkit.co/videos/preview/mixkit-fashion-cold-looking-woman-concept-video-39874-large.mp4"
        />
      )}

      {/* 2. Volumetric Runway Spotlights */}
      {/* Left Golden Beam sweeping across stage */}
      <div
        className="absolute -top-20 -left-20 w-[600px] h-[900px] bg-gradient-to-br from-amber-400/25 via-amber-600/10 to-transparent blur-3xl animate-spotlight-left"
        style={{ clipPath: 'polygon(0 0, 100% 85%, 20% 100%)' }}
      />

      {/* Right Rose-Gold Beam sweeping across stage */}
      <div
        className="absolute -top-20 -right-20 w-[600px] h-[900px] bg-gradient-to-bl from-rose-300/20 via-amber-400/10 to-transparent blur-3xl animate-spotlight-right"
        style={{ clipPath: 'polygon(100% 0, 80% 100%, 0 85%)' }}
      />

      {/* Center Overhead Runway Chandelier Aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-[radial-gradient(ellipse_at_top,_rgba(236,213,153,0.3)_0%,_rgba(179,146,79,0.12)_45%,_transparent_75%)] blur-2xl animate-pulse" />

      {/* 3. Runway Catwalk Floor Stage & Perspective Track */}
      <div className="absolute bottom-0 inset-x-0 h-72 overflow-hidden opacity-40">
        {/* Catwalk Perspective Lines */}
        <div
          className="absolute inset-x-0 bottom-0 h-64 animate-runway-pulse"
          style={{
            background:
              'linear-gradient(to top, rgba(236, 213, 153, 0.18) 0%, rgba(179, 146, 79, 0.05) 50%, transparent 100%)',
            clipPath: 'polygon(38% 0%, 62% 0%, 90% 100%, 10% 100%)',
          }}
        />

        {/* Left & Right Catwalk Stage Border Lines */}
        <div
          className="absolute inset-x-0 bottom-0 h-64"
          style={{
            background:
              'linear-gradient(to top, rgba(255, 255, 255, 0.4) 0%, rgba(236, 213, 153, 0.1) 80%, transparent 100%)',
            clipPath: 'polygon(37.5% 0%, 38.5% 0%, 10.5% 100%, 9.5% 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-64"
          style={{
            background:
              'linear-gradient(to top, rgba(255, 255, 255, 0.4) 0%, rgba(236, 213, 153, 0.1) 80%, transparent 100%)',
            clipPath: 'polygon(61.5% 0%, 62.5% 0%, 90.5% 100%, 89.5% 100%)',
          }}
        />
      </div>

      {/* 4. Canvas Floating Golden Stardust & Diamond Sparkles */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* 5. Luxury Obsidian Vignette overlay for card readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.75)_100%)]" />
    </div>
  );
}

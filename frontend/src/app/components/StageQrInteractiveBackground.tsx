'use client';

import { useEffect, useRef } from 'react';

interface StageQrInteractiveBackgroundProps {
  className?: string;
  onPointerMoveCoords?: (coords: { x: number; y: number; normX: number; normY: number }) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  pulseSpeed: number;
  pulseOffset: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export default function StageQrInteractiveBackground({
  className = '',
  onPointerMoveCoords,
}: StageQrInteractiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse tracking with smooth easing
    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      isHovering: false,
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      mouse.targetX = clientX;
      mouse.targetY = clientY;
      mouse.isHovering = true;

      if (onPointerMoveCoords) {
        // Normalized from -1 to 1 relative to center
        const normX = (clientX - width / 2) / (width / 2);
        const normY = (clientY - height / 2) / (height / 2);
        onPointerMoveCoords({ x: clientX, y: clientY, normX, normY });
      }
    };

    const ripples: Ripple[] = [];
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      ripples.push({
        x: clientX,
        y: clientY,
        radius: 10,
        maxRadius: Math.max(width, height) * 0.45,
        alpha: 0.8,
        color: '251, 191, 36',
      });
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown, { passive: true });

    // 1. Constellation Particle Nexus
    const PARTICLE_COUNT = Math.min(65, Math.floor((width * height) / 18000));
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      radius: Math.random() * 2 + 1,
      alpha: Math.random() * 0.7 + 0.25,
      color: Math.random() > 0.35 ? '236, 213, 153' : '251, 191, 36',
      pulseSpeed: Math.random() * 0.02 + 0.01,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    // 2. Continuous Concentric Holographic Pulse Waves from Center
    const pulseWaves = [
      { radius: 100, speed: 0.85, maxRadius: 650, alpha: 0.4 },
      { radius: 240, speed: 0.85, maxRadius: 650, alpha: 0.3 },
      { radius: 380, speed: 0.85, maxRadius: 650, alpha: 0.2 },
      { radius: 520, speed: 0.85, maxRadius: 650, alpha: 0.1 },
    ];

    let time = 0;

    const render = () => {
      time += 0.016;

      // Smooth cursor lerp
      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height * 0.5;

      // --- Deep Cinematic Radial Backdrop ---
      const bgGlow = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, Math.max(width, height) * 0.7);
      bgGlow.addColorStop(0, 'rgba(30, 22, 10, 0.75)');
      bgGlow.addColorStop(0.4, 'rgba(15, 12, 6, 0.9)');
      bgGlow.addColorStop(1, 'rgba(5, 5, 5, 1)');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // --- Interactive Spotlight / Aura following Pointer ---
      const mouseGlow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 340);
      mouseGlow.addColorStop(0, 'rgba(218, 165, 32, 0.18)');
      mouseGlow.addColorStop(0.5, 'rgba(180, 130, 40, 0.05)');
      mouseGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = mouseGlow;
      ctx.fillRect(0, 0, width, height);

      // --- Central Concentric Radar / Audio Pulse Waves ---
      ctx.lineWidth = 1.5;
      for (const wave of pulseWaves) {
        wave.radius += wave.speed;
        if (wave.radius > wave.maxRadius) {
          wave.radius = 80;
        }
        const progress = (wave.radius - 80) / (wave.maxRadius - 80);
        const waveAlpha = Math.sin(progress * Math.PI) * 0.35;

        ctx.strokeStyle = `rgba(236, 213, 153, ${waveAlpha})`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, wave.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // --- Rotating Luxury Gyroscope / Celestial Orbital Rings ---
      const baseRingRadius = Math.min(width, height) * 0.32;

      // Ring 1: Slow Golden Dashed Ring (Clockwise)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(time * 0.12);
      ctx.setLineDash([8, 12]);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(218, 165, 32, 0.28)';
      ctx.beginPath();
      ctx.arc(0, 0, baseRingRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Ring 2: Outer Accent Ring with 4 Cardinal Diamond Blips (Counter-clockwise)
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(-time * 0.08);
      ctx.setLineDash([4, 20]);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(245, 215, 145, 0.32)';
      ctx.beginPath();
      ctx.arc(0, 0, baseRingRadius * 1.25, 0, Math.PI * 2);
      ctx.stroke();

      // 4 Cardinal Diamond Coordinates
      ctx.setLineDash([]);
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const dx = Math.cos(angle) * (baseRingRadius * 1.25);
        const dy = Math.sin(angle) * (baseRingRadius * 1.25);
        ctx.fillStyle = 'rgba(255, 223, 128, 0.8)';
        ctx.beginPath();
        ctx.arc(dx, dy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // --- Click / Tap Shockwave Ripples ---
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 5.5;
        r.alpha *= 0.96;

        ctx.strokeStyle = `rgba(${r.color}, ${r.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();

        if (r.alpha < 0.02 || r.radius > r.maxRadius) {
          ripples.splice(i, 1);
        }
      }

      // --- Interactive Particles & Constellation Filaments ---
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Normal float
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around bounds
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Interactive mouse interaction (magnetic push / subtle drift)
        const dxMouse = mouse.x - p.x;
        const dyMouse = mouse.y - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < 160) {
          const force = (160 - distMouse) / 160;
          p.x -= (dxMouse / distMouse) * force * 1.8;
          p.y -= (dyMouse / distMouse) * force * 1.8;
        }

        // Draw particle node
        const currentAlpha = Math.max(
          0.15,
          p.alpha + Math.sin(time * 2 + p.pulseOffset) * 0.25
        );
        ctx.fillStyle = `rgba(${p.color}, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Connect nearby nodes with delicate gold filaments
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 90) {
            const lineAlpha = (1 - dist / 90) * 0.18;
            ctx.strokeStyle = `rgba(236, 213, 153, ${lineAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
    };
  }, [onPointerMoveCoords]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-auto z-0 ${className}`}
      style={{ touchAction: 'none' }}
    />
  );
}

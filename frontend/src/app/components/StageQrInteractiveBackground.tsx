'use client';

import { useEffect, useRef } from 'react';

interface StageQrInteractiveBackgroundProps {
  className?: string;
  onPointerMoveCoords?: (coords: { x: number; y: number; normX: number; normY: number }) => void;
}

interface Sparkle {
  x: number;
  y: number;
  speedY: number;
  speedX: number;
  size: number;
  alpha: number;
  pulseSpeed: number;
  pulseOffset: number;
  isStar: boolean;
  color: string;
}

interface CameraFlash {
  x: number;
  y: number;
  alpha: number;
  size: number;
  decay: number;
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
      y: height * 0.45,
      targetX: width / 2,
      targetY: height * 0.45,
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

      if (onPointerMoveCoords) {
        const normX = (clientX - width / 2) / (width / 2);
        const normY = (clientY - height / 2) / (height / 2);
        onPointerMoveCoords({ x: clientX, y: clientY, normX, normY });
      }
    };

    const cameraFlashes: CameraFlash[] = [];

    const triggerFlash = (x: number, y: number, size = 180) => {
      cameraFlashes.push({
        x,
        y,
        alpha: 0.95,
        size,
        decay: 0.05,
      });
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      triggerFlash(clientX, clientY, 320);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown, { passive: true });

    // 1. Rising Runway Diamond Sparkles & Stardust
    const SPARKLE_COUNT = 70;
    const sparkles: Sparkle[] = Array.from({ length: SPARKLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speedY: -(Math.random() * 0.75 + 0.25),
      speedX: (Math.random() - 0.5) * 0.35,
      size: Math.random() * 2.5 + 0.8,
      alpha: Math.random() * 0.75 + 0.25,
      pulseSpeed: Math.random() * 0.03 + 0.015,
      pulseOffset: Math.random() * Math.PI * 2,
      isStar: Math.random() > 0.65,
      color: Math.random() > 0.3 ? '255, 245, 220' : '236, 213, 153',
    }));

    let time = 0;
    let nextRandomFlash = 50;

    const render = () => {
      time += 0.018;

      // Smooth pointer follow for stage lighting
      mouse.x += (mouse.targetX - mouse.x) * 0.06;
      mouse.y += (mouse.targetY - mouse.y) * 0.06;

      ctx.clearRect(0, 0, width, height);

      // --- Deep Cinematic Black / Charcoal Gradient ---
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#040404');
      bgGrad.addColorStop(0.5, '#090807');
      bgGrad.addColorStop(1, '#030303');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // --- Random Ambient Paparazzi Camera Flashes (Fashion Runway Pit Effect) ---
      nextRandomFlash--;
      if (nextRandomFlash <= 0) {
        // Trigger a camera flash along the edges or bottom
        const flashX = Math.random() * width;
        const flashY = Math.random() > 0.4 ? height * (0.65 + Math.random() * 0.35) : Math.random() * height;
        triggerFlash(flashX, flashY, Math.random() * 150 + 100);
        nextRandomFlash = Math.floor(Math.random() * 70 + 40);
      }

      // --- Theatrical Sweeping Volumetric Stage Beams ---
      // Beam 1: Left Overhead Stage Light
      const angle1 = -0.35 + Math.sin(time * 0.6) * 0.22;
      drawTheatricalBeam(ctx, width * 0.12, 0, angle1, 0.25, '236, 213, 153', width, height);

      // Beam 2: Right Overhead Stage Light
      const angle2 = 0.35 - Math.sin(time * 0.75) * 0.25;
      drawTheatricalBeam(ctx, width * 0.88, 0, angle2, 0.25, '218, 165, 32', width, height);

      // Beam 3: Interactive Dynamic Follow-Spot (Tracks mouse / center)
      const targetAngle = Math.atan2(mouse.y - 0, mouse.x - width * 0.5) - Math.PI / 2;
      drawTheatricalBeam(ctx, width * 0.5, -20, targetAngle, 0.32, '255, 235, 175', width, height, 220);

      // --- High-Fashion Flowing Satin / Golden Silk Waves (Bottom Half) ---
      drawSilkWave(ctx, width, height, time, 0.55, 'rgba(179, 146, 79, 0.08)', 40, 0.7);
      drawSilkWave(ctx, width, height, time + 2, 0.68, 'rgba(218, 165, 32, 0.07)', 55, 0.5);
      drawSilkWave(ctx, width, height, time + 4, 0.82, 'rgba(236, 213, 153, 0.05)', 35, 0.9);

      // --- Anamorphic Golden Horizon Flare Passing Center Horizontally ---
      const flareY = height * 0.5;
      const flareGrad = ctx.createLinearGradient(0, flareY, width, flareY);
      flareGrad.addColorStop(0, 'rgba(218, 165, 32, 0)');
      flareGrad.addColorStop(0.35, 'rgba(236, 213, 153, 0.04)');
      flareGrad.addColorStop(0.5, `rgba(255, 248, 220, ${0.12 + Math.sin(time * 1.5) * 0.05})`);
      flareGrad.addColorStop(0.65, 'rgba(236, 213, 153, 0.04)');
      flareGrad.addColorStop(1, 'rgba(218, 165, 32, 0)');
      ctx.fillStyle = flareGrad;
      ctx.fillRect(0, flareY - 1.5, width, 3);

      // Soft vertical glow around flare center
      const centerGlow = ctx.createRadialGradient(width * 0.5, flareY, 0, width * 0.5, flareY, width * 0.45);
      centerGlow.addColorStop(0, 'rgba(218, 165, 32, 0.12)');
      centerGlow.addColorStop(0.5, 'rgba(179, 146, 79, 0.03)');
      centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, flareY - 140, width, 280);

      // --- Rising Runway Diamond Sparkles & Stardust ---
      for (const sp of sparkles) {
        sp.y += sp.speedY;
        sp.x += sp.speedX + Math.sin(time + sp.pulseOffset) * 0.25;

        if (sp.y < -10) {
          sp.y = height + 10;
          sp.x = Math.random() * width;
        }
        if (sp.x < 0) sp.x = width;
        if (sp.x > width) sp.x = 0;

        const currentAlpha = Math.max(
          0.1,
          sp.alpha + Math.sin(time * 2.5 + sp.pulseOffset) * 0.35
        );

        if (sp.isStar) {
          // 4-Point Diamond Sparkle Glint
          ctx.strokeStyle = `rgba(${sp.color}, ${currentAlpha})`;
          ctx.lineWidth = 1;
          const arm = sp.size * 2.4;
          ctx.beginPath();
          ctx.moveTo(sp.x - arm, sp.y);
          ctx.lineTo(sp.x + arm, sp.y);
          ctx.moveTo(sp.x, sp.y - arm);
          ctx.lineTo(sp.x, sp.y + arm);
          ctx.stroke();

          ctx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Soft golden dust orb
          ctx.fillStyle = `rgba(${sp.color}, ${currentAlpha})`;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- Render Paparazzi Camera Flashes ---
      for (let i = cameraFlashes.length - 1; i >= 0; i--) {
        const f = cameraFlashes[i];
        f.alpha -= f.decay;

        if (f.alpha <= 0) {
          cameraFlashes.splice(i, 1);
          continue;
        }

        // Brilliant cross flare + radial burst
        const burstGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
        burstGrad.addColorStop(0, `rgba(255, 255, 255, ${f.alpha})`);
        burstGrad.addColorStop(0.2, `rgba(255, 240, 200, ${f.alpha * 0.75})`);
        burstGrad.addColorStop(0.6, `rgba(218, 165, 32, ${f.alpha * 0.25})`);
        burstGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = burstGrad;
        ctx.fillRect(f.x - f.size, f.y - f.size, f.size * 2, f.size * 2);

        // Horizontal lens streak
        ctx.strokeStyle = `rgba(255, 250, 230, ${f.alpha * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(f.x - f.size * 1.5, f.y);
        ctx.lineTo(f.x + f.size * 1.5, f.y);
        ctx.stroke();
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

// Helper: Draw Volumetric Theatrical Stage Light Beam
function drawTheatricalBeam(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  angleRad: number,
  maxAlpha: number,
  color: string,
  width: number,
  height: number,
  spread = 180
) {
  const beamLength = height * 1.4;
  const endCenterX = originX + Math.sin(angleRad) * beamLength;
  const endCenterY = originY + Math.cos(angleRad) * beamLength;

  const normalX = -Math.cos(angleRad);
  const normalY = Math.sin(angleRad);

  const leftX = endCenterX + normalX * spread;
  const leftY = endCenterY + normalY * spread;
  const rightX = endCenterX - normalX * spread;
  const rightY = endCenterY - normalY * spread;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(leftX, leftY);
  ctx.lineTo(rightX, rightY);
  ctx.closePath();

  const beamGrad = ctx.createLinearGradient(originX, originY, endCenterX, endCenterY);
  beamGrad.addColorStop(0, `rgba(${color}, ${maxAlpha})`);
  beamGrad.addColorStop(0.4, `rgba(${color}, ${maxAlpha * 0.5})`);
  beamGrad.addColorStop(1, `rgba(${color}, 0)`);

  ctx.fillStyle = beamGrad;
  ctx.fill();
  ctx.restore();
}

// Helper: Draw Haute Couture Flowing Silk Fabric Wave
function drawSilkWave(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  baseHeightRatio: number,
  fillColor: string,
  amplitude: number,
  speed: number
) {
  const startY = height * baseHeightRatio;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, startY + Math.sin(time * speed) * amplitude);

  const points = 6;
  const step = width / points;

  for (let i = 1; i <= points; i++) {
    const prevX = (i - 1) * step;
    const prevY = startY + Math.sin(time * speed + (i - 1) * 0.8) * amplitude;
    const currX = i * step;
    const currY = startY + Math.sin(time * speed + i * 0.8) * amplitude;

    const cpX = (prevX + currX) / 2;
    const cpY = (prevY + currY) / 2 + Math.cos(time * speed + i) * 15;

    ctx.quadraticCurveTo(cpX, cpY, currX, currY);
  }

  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.restore();
}

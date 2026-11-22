import { useEffect, useRef } from 'react';
import { ThemeMode } from '../types/task';

interface LiquidBackgroundProps {
  theme: ThemeMode;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  colorIndex: number;
}

const DARK_PALETTE = [
  '56, 189, 248',   // sky cyan
  '16, 185, 129',   // emerald mint
  '129, 140, 248',  // soft indigo
  '226, 232, 240',  // ice white
] as const;

const LIGHT_PALETTE = [
  '14, 165, 233',   // bright azure
  '16, 185, 129',   // mint
  '99, 102, 241',   // indigo
  '56, 189, 248',   // sky
] as const;

export function LiquidBackground({ theme }: LiquidBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.25);

    let particles: Particle[] = [];

    const createParticles = (w: number, h: number): Particle[] => {
      const isCompact = w < 768;
      const count = isCompact ? 18 : 30;
      const list: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const isBokeh = i % 5 === 0;
        list.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.34,
          vy: (Math.random() - 0.5) * 0.34 - 0.08,
          radius: isBokeh ? 2.5 + Math.random() * 1.8 : 1 + Math.random() * 1.4,
          alpha: isBokeh ? 0.28 + Math.random() * 0.2 : 0.36 + Math.random() * 0.34,
          phase: Math.random() * Math.PI * 2,
          colorIndex: i % 4,
        });
      }
      return list;
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = createParticles(width, height);
    };

    resize();

    let resizeTimer: number | null = null;
    const handleResize = () => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    let rafId = 0;
    let lastTick = 0;
    const FRAME_INTERVAL = 1000 / 32; // Smooth 32fps calm ambient motion without choking mobile GPUs

    const renderFrame = (stepMultiplier: number) => {
      ctx.clearRect(0, 0, width, height);
      const isDark = themeRef.current === 'dark';
      const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;
      const maxLinkDist = width < 768 ? 95 : 135;
      const maxLinkDistSq = maxLinkDist * maxLinkDist;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (stepMultiplier > 0) {
          p.phase += 0.025 * stepMultiplier;
          p.x += p.vx * stepMultiplier;
          p.y += p.vy * stepMultiplier;

          if (p.x < -12) p.x = width + 12;
          if (p.x > width + 12) p.x = -12;
          if (p.y < -12) p.y = height + 12;
          if (p.y > height + 12) p.y = -12;
        }

        const rgb = palette[p.colorIndex];
        const pulse = 0.78 + Math.sin(p.phase) * 0.22;
        const opacity = p.alpha * pulse * (isDark ? 0.92 : 0.68);

        if (p.radius > 2.2) {
          ctx.fillStyle = `rgba(${rgb}, ${(opacity * 0.18).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 3.4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(${rgb}, ${opacity.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxLinkDistSq) {
            const lineAlpha =
              (1 - distSq / maxLinkDistSq) * (isDark ? 0.16 : 0.12);
            ctx.strokeStyle = `rgba(${rgb}, ${lineAlpha.toFixed(3)})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
    };

    const tick = (now: number) => {
      rafId = window.requestAnimationFrame(tick);
      if (document.hidden) return;
      const elapsed = now - lastTick;
      if (elapsed < FRAME_INTERVAL) return;
      lastTick = now;
      const stepMultiplier = Math.min(elapsed / 16.67, 2.5);
      renderFrame(stepMultiplier);
    };

    if (reducedMotion) {
      renderFrame(0);
    } else {
      rafId = window.requestAnimationFrame(tick);
    }

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none contain-strict"
    >
      {/* Crisp Base Atmospheric Canvas + Zero-Blur Radial Orbs */}
      <div className="liquid-mesh-canvas absolute inset-0" />

      {/* Lightweight Drifting Aurora Glow Orbs (Pure Radial Gradients, Zero CSS Blur Filter) */}
      <div className="liquid-orb-1 absolute -top-24 -right-24 w-[28rem] h-[28rem] md:w-[42rem] md:h-[42rem] rounded-full" />
      <div className="liquid-orb-2 absolute top-[32%] -left-28 w-[26rem] h-[26rem] md:w-[40rem] md:h-[40rem] rounded-full" />
      <div className="liquid-orb-3 absolute -bottom-28 right-[16%] w-[24rem] h-[24rem] md:w-[38rem] md:h-[38rem] rounded-full" />

      {/* Lightweight Dynamic Particle Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

import { memo } from 'react';
import { ThemeMode } from '../types/task';

interface LiquidBackgroundProps {
  theme: ThemeMode;
}

/**
 * Ultra-high-performance atmospheric background.
 * Uses 100% GPU-accelerated radial mesh gradients with zero continuous
 * CPU/canvas requestAnimationFrame loops, eliminating GPU/battery drain
 * and ensuring locked 60-120fps scrolling.
 */
export const LiquidBackground = memo(function LiquidBackground({ theme }: LiquidBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none contain-strict"
    >
      {/* Crisp GPU-rendered Atmospheric Mesh Canvas */}
      <div className="liquid-mesh-canvas absolute inset-0" />

      {/* Gentle, hardware-accelerated ambient glowing orbs */}
      <div className="liquid-orb-1 absolute -top-24 -right-24 w-[24rem] h-[24rem] md:w-[38rem] md:h-[38rem] rounded-full pointer-events-none" />
      <div className="liquid-orb-2 absolute top-[35%] -left-24 w-[22rem] h-[22rem] md:w-[34rem] md:h-[34rem] rounded-full pointer-events-none" />
      <div className="liquid-orb-3 absolute -bottom-24 right-[12%] w-[20rem] h-[20rem] md:w-[32rem] md:h-[32rem] rounded-full pointer-events-none" />
    </div>
  );
});

"use client";

import dynamic from "next/dynamic";
import type { CarVisualizerProps } from "./car-visualizer";

function VisualizerSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]" aria-busy="true" aria-label="Loading 3D visualizer">
      <div className="glass-2 relative flex h-[420px] items-center justify-center overflow-hidden rounded-[28px] sm:h-[540px]">
        <div className="shimmer absolute inset-0 opacity-60" />
        <div className="relative flex flex-col items-center gap-3">
          <span className="relative flex size-14 items-center justify-center">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-iris/40" />
            <span className="bg-spectral relative size-6 rounded-full" />
          </span>
          <p className="text-sm text-ink-3">Loading 3D studio…</p>
        </div>
      </div>
      <div className="glass shimmer hidden h-[540px] rounded-[28px] lg:block" />
    </div>
  );
}

/** three.js is client-only and heavy, so the scene is code-split and never server-rendered. */
const CarVisualizer = dynamic(() => import("./car-visualizer"), { ssr: false, loading: VisualizerSkeleton });

export function VisualizerLoader(props: CarVisualizerProps) {
  return <CarVisualizer {...props} />;
}

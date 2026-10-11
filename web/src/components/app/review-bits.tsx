"use client";

import { Star } from "lucide-react";
import type { Review } from "@/lib/types";
import { cn } from "@/lib/utils";

const sourceMeta: Record<Review["source"], { label: string; letter: string; bg: string }> = {
  google: { label: "Google", letter: "G", bg: "linear-gradient(135deg,#60a5fa,#34d399)" },
  facebook: { label: "Facebook", letter: "f", bg: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
  yelp: { label: "Yelp", letter: "Y", bg: "linear-gradient(135deg,#fb7185,#dc2626)" },
  lustra: { label: "Lustra", letter: "L", bg: "linear-gradient(135deg,#ff6a2b,#45c4ff)" },
};

/** Neutral monogram for a review source (no third-party brand assets). */
export function SourceMark({ source, size = 22 }: { source: Review["source"]; size?: number }) {
  const m = sourceMeta[source] ?? sourceMeta.lustra;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.5, background: m.bg }}
      title={m.label}
      aria-label={m.label}
    >
      {m.letter}
    </span>
  );
}

export const sourceLabel = (s: string) => sourceMeta[s as Review["source"]]?.label ?? s;

export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={i <= Math.round(value) ? "fill-warning text-warning" : "text-ink/15"} />
      ))}
    </span>
  );
}

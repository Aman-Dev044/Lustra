import Link from "next/link";
import { cn } from "@/lib/utils";

/** Lustra mark: a faceted lens — light refracting through a coated surface. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="lx-a" x1="8" y1="6" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a594ff" />
          <stop offset="0.55" stopColor="#5b7cfa" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="lx-b" x1="32" y1="4" x2="32" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="18" fill="url(#lx-a)" />
      <path d="M20 16v32h24" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 16h14" stroke="#fff" strokeOpacity="0.55" strokeWidth="6" strokeLinecap="round" />
      <rect x="4" y="4" width="56" height="28" rx="18" fill="url(#lx-b)" opacity="0.35" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="Lustra home">
      <LogoMark size={30} className="transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105" />
      <span className="text-[19px] font-semibold tracking-[-0.03em] text-ink">Lustra</span>
    </Link>
  );
}

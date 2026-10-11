"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Phone, Mail } from "lucide-react";
import { AuroraBackground } from "@/components/spatial/motion";
import { LogoMark } from "@/components/spatial/logo";
import { initials } from "@/lib/utils";

export interface PublicShop {
  name: string;
  slug?: string;
  phone?: string;
  email?: string;
  address?: string;
  brandColor?: string;
  logoUrl?: string;
}

/** Minimal branded frame for customer-facing pages (booking, portal, verification). */
export function PublicShell({ shop, children, wide }: { shop?: PublicShop | null; children: ReactNode; wide?: boolean }) {
  const color = shop?.brandColor || "#7c5cff";
  return (
    <div className="relative min-h-dvh">
      <AuroraBackground intensity={0.7} />
      <header className="px-4 pt-4 sm:px-6">
        <div className={`glass mx-auto flex h-14 items-center justify-between rounded-full px-3 pl-3 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>
          <div className="flex min-w-0 items-center gap-3">
            {shop?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.logoUrl} alt="" className="size-9 rounded-xl object-cover" />
            ) : (
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white"
                style={{ background: `linear-gradient(135deg, ${color}, #22d3ee)` }}
                aria-hidden
              >
                {initials(shop?.name ?? "?")}
              </span>
            )}
            <span className="truncate text-sm font-semibold text-ink">{shop?.name ?? " "}</span>
          </div>
          <div className="flex items-center gap-1">
            {shop?.phone && (
              <a href={`tel:${shop.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-ink-2 hover:bg-ink/[0.06]">
                <Phone className="size-3.5" aria-hidden /> <span className="hidden sm:inline">{shop.phone}</span>
              </a>
            )}
            {shop?.email && (
              <a href={`mailto:${shop.email}`} className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-xs text-ink-2 hover:bg-ink/[0.06] sm:inline-flex">
                <Mail className="size-3.5" aria-hidden /> Email
              </a>
            )}
          </div>
        </div>
      </header>
      <main id="main" className={`mx-auto px-4 pt-8 pb-16 sm:px-6 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>
        {children}
      </main>
      <footer className="pb-8 text-center text-[11px] text-ink-4">
        <Link href="/" className="inline-flex items-center gap-1.5 hover:text-ink-3">
          <LogoMark size={14} /> Powered by Lustra
        </Link>
      </footer>
    </div>
  );
}

export function PublicState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <div className="glass-2 rim mx-auto mt-10 max-w-md rounded-[28px] p-10 text-center">
      {icon && <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-ink/[0.06] text-aqua-soft">{icon}</div>}
      <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
      {description && <p className="mt-2 text-sm text-ink-3">{description}</p>}
    </div>
  );
}

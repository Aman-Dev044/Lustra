import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { Logo } from "@/components/spatial";
import { AuroraBackground } from "@/components/spatial/motion";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <AuroraBackground />
      <div className="mx-auto grid min-h-dvh max-w-7xl gap-8 p-4 sm:p-6 lg:grid-cols-2 lg:p-8">
        <aside className="glass-2 rim relative hidden overflow-hidden rounded-[34px] lg:block">
          <Image
            src="/images/garage-night.webp"
            alt="Performance car parked in a detailing garage at night"
            fill
            priority
            sizes="50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-scrim/90 via-scrim/45 to-scrim/30" />
          <div className="on-photo relative flex h-full flex-col justify-between p-10">
            <Logo />
            <div>
              <div className="flex gap-0.5 text-warning" aria-label="Rated 4.9 out of 5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" aria-hidden />
                ))}
              </div>
              <blockquote className="mt-4 max-w-md text-2xl leading-snug font-medium tracking-tight text-white">
                “Lustra runs our whole shop — bookings, the floor, payments, follow-ups. The team actually likes using it.”
              </blockquote>
              <p className="mt-4 text-sm text-ink-2">Marcus Vellani · Gloss Theory Detail Studio</p>
              <ul className="mt-8 space-y-2 text-sm text-ink-2">
                {["Unlimited users on every plan", "Free data import & onboarding", "No contracts — cancel anytime"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="size-4 text-aqua" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
        <main id="main" className="flex flex-col">
          <div className="flex items-center justify-between py-2 lg:justify-end">
            <Logo className="lg:hidden" />
            <Link href="/" className="text-sm text-ink-3 transition hover:text-ink">
              ← Back to site
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

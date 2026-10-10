import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button, Glass, Logo } from "@/components/spatial";
import { AuroraBackground } from "@/components/spatial/motion";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const links = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/industries", label: "Industries" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-16">
      <AuroraBackground />
      <Logo className="mb-10" />
      <Glass tier={2} rim className="w-full max-w-lg rounded-[32px] p-10 text-center">
        <div className="mx-auto flex size-16 animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-iris to-aqua shadow-[var(--shadow-glow-iris)]">
          <Compass className="size-8 text-white" aria-hidden />
        </div>
        <p className="mt-6 font-mono text-sm text-aqua-soft">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">This bay is empty.</h1>
        <p className="mt-3 text-ink-3">The page you’re looking for has moved, or never existed. Let’s get you back on the road.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/">
            <ArrowLeft className="size-4" /> Back home
          </Button>
          <Button href="/app" variant="secondary">
            Open dashboard
          </Button>
        </div>
        <nav aria-label="Popular pages" className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink-3 transition hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
      </Glass>
    </div>
  );
}

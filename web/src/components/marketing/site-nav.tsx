"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronDown, Menu as MenuIcon, X } from "lucide-react";
import { Button, Logo } from "@/components/spatial";
import { featureCatalog, industryCatalog } from "@/lib/content/catalog";
import { cn } from "@/lib/utils";

type MegaKey = "features" | "industries" | null;

const MEGA_FEATURES = [
  "live-job-board",
  "quote-copilot",
  "ai-insights",
  "online-booking",
  "customer-portal",
  "payments",
  "smart-scheduling",
  "digital-inspections",
  "workflow-automations",
  "smart-campaigns",
  "warranty-certificates",
  "mobile-routing",
];
const megaFeatures = MEGA_FEATURES.map((slug) => featureCatalog.find((f) => f.slug === slug)!).filter(Boolean);

export function SiteNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState<MegaKey>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMega(null);
    setMobileOpen(false);
  }

  const links = [
    { label: "Features", href: "/features", mega: "features" as const },
    { label: "Industries", href: "/industries", mega: "industries" as const },
    { label: "3D Visualizer", href: "/visualizer" },
    { label: "Pricing", href: "/pricing" },
    { label: "Why Lustra", href: "/why-lustra" },
    { label: "Blog", href: "/blog" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4" onMouseLeave={() => setMega(null)}>
      <nav
        aria-label="Primary"
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full px-3 pl-5 transition-all duration-500",
          scrolled || mega ? "glass-2" : "border border-transparent",
        )}
      >
        <Logo />

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <li key={l.href} onMouseEnter={() => setMega(l.mega ?? null)}>
                <Link
                  href={l.href}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm transition-colors",
                    active ? "bg-ink/[0.08] text-ink" : "text-ink-2 hover:text-ink",
                  )}
                  aria-haspopup={l.mega ? "true" : undefined}
                  aria-expanded={l.mega ? mega === l.mega : undefined}
                >
                  {l.label}
                  {l.mega && (
                    <ChevronDown
                      className={cn("size-3.5 transition-transform", mega === l.mega && "rotate-180")}
                      aria-hidden
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-sm text-ink-2 transition hover:text-ink sm:inline-flex"
          >
            Log in
          </Link>
          <Button href="/signup" size="sm" className="hidden sm:inline-flex">
            Start free <ArrowRight className="size-3.5" />
          </Button>
          <button
            className="inline-flex size-10 items-center justify-center rounded-full text-ink hover:bg-ink/10 lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
        </div>
      </nav>

      {/* Desktop mega panels */}
      <AnimatePresence>
        {mega && (
          <motion.div
            key={mega}
            initial={{ opacity: 0, y: -8, scale: 0.98, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, scale: 0.98, filter: "blur(6px)" }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="glass-sheet rim mx-auto mt-2 hidden max-w-6xl rounded-[28px] p-3 lg:block"
          >
            <div className="grid grid-cols-3 gap-1">
              {(mega === "features" ? megaFeatures : industryCatalog).map((item) => (
                <Link
                  key={item.slug}
                  href={`/${mega}/${item.slug}`}
                  className="group flex items-start gap-3 rounded-2xl p-3 transition hover:bg-ink/[0.06]"
                >
                  <span className="glass flex size-10 shrink-0 items-center justify-center rounded-xl text-aqua-soft transition group-hover:text-ink group-hover:shadow-[var(--shadow-glow-iris)]">
                    <item.icon className="size-[18px]" aria-hidden />
                  </span>
                  <span>
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      {item.title}
                      {item.isNew && (
                        <span className="rounded-full bg-aqua/15 px-1.5 py-px text-[9px] font-semibold tracking-wider text-aqua-soft uppercase">
                          New
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-3">{item.short}</span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-2xl bg-ink/[0.04] px-4 py-3 text-sm">
              <span className="text-ink-2">
                {mega === "features"
                  ? "One platform. Every bay, technician and customer touchpoint."
                  : "Purpose-built workflows for every kind of appearance & field service shop."}
              </span>
              <Link href={`/${mega}`} className="inline-flex items-center gap-1 font-medium text-aqua-soft hover:text-ink">
                View all {mega} <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="glass-sheet mx-auto mt-2 max-h-[calc(100dvh-90px)] max-w-6xl overflow-y-auto rounded-[28px] p-4 lg:hidden"
          >
            <ul className="space-y-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="block rounded-2xl px-4 py-3 text-base text-ink hover:bg-ink/[0.06]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button href="/login" variant="secondary">
                Log in
              </Button>
              <Button href="/signup">Start free</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

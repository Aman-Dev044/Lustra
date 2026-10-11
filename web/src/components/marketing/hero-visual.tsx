"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Check, CircleDollarSign, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { label: "Scheduled", color: "#ff9a66" },
  { label: "In progress", color: "#45c4ff" },
  { label: "Quality check", color: "#fbbf24" },
  { label: "Completed", color: "#34d399" },
];

/** Hero composition: a photograph held in a floating glass window, orbited by live UI "ornaments". */
export function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const yImage = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
  const yFront = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const yBack = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -25]);

  const [stage, setStage] = useState(1);
  const paid = stage === STAGES.length - 1;
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 2600);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <div ref={ref} className="relative mx-auto mt-16 w-full max-w-6xl sm:mt-20" style={{ perspective: 1600 }}>
      {/* Main window */}
      <motion.div
        style={{ y: yImage }}
        initial={reduce ? false : { rotateX: 18, y: 60, scale: 0.94 }}
        animate={{ rotateX: 0, y: 0, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        className="glass-2 rim relative overflow-hidden rounded-[34px] p-2.5"
      >
        <div className="relative aspect-[16/10] overflow-hidden rounded-[26px] sm:aspect-[16/8]">
          <Image
            src="/images/hero-supercar.webp"
            alt="Supercar with butterfly doors raised under studio lights — the kind of work Lustra shops deliver"
            fill
            priority
            fetchPriority="high"
            sizes="(min-width: 1280px) 1150px, 100vw"
            quality={85}
            className="object-cover object-[50%_60%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-scrim/80 via-scrim/15 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-scrim/45 via-transparent to-transparent" />
          <div className="on-photo absolute bottom-5 left-5 sm:bottom-8 sm:left-8">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-aqua-soft uppercase">Bay 2 · Live</p>
            <p className="mt-1 text-lg font-semibold text-white sm:text-2xl">McLaren 570S · Full body PPF</p>
            <p className="text-xs text-ink-2 sm:text-sm">Marco R. & Jess T. · Day 3 of 4</p>
          </div>
        </div>
      </motion.div>

      {/* Ornament: job card cycling through stages */}
      <motion.div
        style={{ y: yFront }}
        className="absolute -top-10 -left-2 hidden w-64 sm:block lg:-left-12"
        initial={reduce ? false : { opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.8 }}
      >
        <div className="glass-2 rim animate-float rounded-3xl p-4" aria-hidden>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-ink-4">#2087</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={stage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                style={{ color: STAGES[stage]!.color, borderColor: `${STAGES[stage]!.color}55`, background: `${STAGES[stage]!.color}18` }}
              >
                <span className="size-1.5 rounded-full" style={{ background: STAGES[stage]!.color }} />
                {STAGES[stage]!.label}
              </motion.span>
            </AnimatePresence>
          </div>
          <p className="mt-2 text-sm font-semibold text-ink">2024 Porsche 911 Carrera</p>
          <p className="text-xs text-ink-3">Ceramic 5yr + Stage 1 correction</p>
          <div className="mt-3 flex gap-1">
            {STAGES.map((s, i) => (
              <span
                key={s.label}
                className="h-1 flex-1 rounded-full transition-all duration-500"
                style={{ background: i <= stage ? s.color : "rgb(255 255 255 / 0.1)" }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Ornament: Copilot bubble */}
      <motion.div
        style={{ y: yBack }}
        className="absolute -right-2 top-[18%] hidden w-72 md:block lg:-right-14"
        initial={reduce ? false : { opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.9, duration: 0.8 }}
      >
        <div className="glass-2 rim animate-float-slow rounded-3xl p-4 [animation-delay:-3s]" aria-hidden>
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-aqua-soft">
            <Sparkles className="size-3.5" /> Quote Copilot
          </p>
          <p className="mt-2 rounded-xl bg-surface-lo px-3 py-2 text-[11px] text-ink-2">“Model Y, heavy swirls, ceramic + front PPF”</p>
          <div className="mt-2 space-y-1 text-[11px]">
            {[
              ["Stage 2 correction", "$1,105"],
              ["Ceramic 5-year", "$1,689"],
              ["Full front PPF", "$2,340"],
            ].map(([n, p]) => (
              <div key={n} className="flex justify-between text-ink-2">
                <span>{n}</span>
                <span className="tabular-nums text-ink">{p}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between border-t border-ink/10 pt-2 text-xs font-semibold">
            <span className="text-ink-3">Drafted in 9s</span>
            <span className="text-ink">$5,134</span>
          </div>
        </div>
      </motion.div>

      {/* Ornament: payment toast */}
      <div className="absolute -bottom-6 left-1/2 w-[min(92%,22rem)] -translate-x-1/2 sm:left-auto sm:right-10 sm:translate-x-0" aria-hidden>
        <AnimatePresence>
          {paid && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="glass-2 rim flex items-center gap-3 rounded-2xl px-4 py-3"
            >
              <span className="relative flex size-9 items-center justify-center rounded-xl bg-success/15 text-success">
                <CircleDollarSign className="size-5" />
              </span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-ink">Payment received · $1,299.00</p>
                <p className="text-[11px] text-ink-3">+ $60 tip for Marco · via text-to-pay</p>
              </div>
              <Check className={cn("size-4 text-success")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

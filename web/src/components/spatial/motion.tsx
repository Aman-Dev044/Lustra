"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

/** Fades and rises content into place as it enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Comp>
  );
}

/** Pointer-driven 3D tilt with a moving specular highlight — the signature spatial "object" feel. */
export function TiltCard({
  children,
  className,
  max = 8,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 180, damping: 18 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 180, damping: 18 });
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 25 });
  const glareBg = useTransform(
    () => `radial-gradient(420px circle at ${px.get() * 100}% ${py.get() * 100}%, rgb(255 255 255 / 0.10), transparent 45%)`,
  );

  function onMove(e: React.PointerEvent) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
    glareOpacity.set(1);
  }
  function onLeave() {
    px.set(0.5);
    py.set(0.5);
    glareOpacity.set(0);
  }

  return (
    <div style={{ perspective: 1200 }} className={cn("h-full", className)}>
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="relative h-full rounded-[inherit]"
      >
        {children}
        {glare && !reduce && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[var(--radius-card)]"
            style={{ background: glareBg, opacity: glareOpacity }}
          />
        )}
      </motion.div>
    </div>
  );
}

/** Showroom lighting: an overhead spotlight cone, a warm floor bounce, a slow light beam and film grain. */
export function AuroraBackground({ className, intensity = 1 }: { className?: string; intensity?: number }) {
  return (
    <div aria-hidden className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,#1d1d22_0%,#0d0d10_42%,#09090b_75%)]" />
      {/* Overhead spotlight cone */}
      <div
        className="absolute -top-[30%] left-1/2 h-[85vh] w-[70vw] -translate-x-1/2 blur-[90px]"
        style={{
          background: "radial-gradient(ellipse at top, rgb(255 255 255 / 0.11), transparent 62%)",
          opacity: intensity,
        }}
      />
      {/* Warm bounce from the floor */}
      <div
        className="absolute -bottom-[35%] left-[15%] h-[60vh] w-[70vw] rounded-full blur-[130px] animate-aurora"
        style={{ background: "radial-gradient(circle, rgb(255 106 43 / 0.16), transparent 65%)", opacity: intensity }}
      />
      {/* Cool rim light */}
      <div
        className="absolute top-[18%] -right-[20%] h-[55vh] w-[50vw] rounded-full blur-[120px] animate-aurora [animation-delay:-11s]"
        style={{ background: "radial-gradient(circle, rgb(69 196 255 / 0.08), transparent 65%)", opacity: intensity }}
      />
      {/* A slow beam travelling across the floor */}
      <div className="absolute inset-y-0 left-0 w-[30vw] animate-sweep bg-gradient-to-r from-transparent via-white/[0.025] to-transparent [animation-duration:14s]" />
      <div className="noise absolute inset-0" />
    </div>
  );
}

/** Animated count-up for stats when they scroll into view. */
export function CountUp({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.6,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const format = (v: number) =>
      `${prefix}${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    if (reduce) {
      el.textContent = format(to);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / (duration * 1000));
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = format(to * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, prefix, suffix, decimals, duration, reduce]);
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {to.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

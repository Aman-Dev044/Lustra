"use client";

import Link from "next/link";
import { forwardRef, type ComponentProps, type ElementType, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn, hueFrom, initials } from "@/lib/utils";

/* ── Glass ─────────────────────────────────────────────────────────────── */

type GlassProps<T extends ElementType> = {
  as?: T;
  tier?: 1 | 2 | "inset";
  rim?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentProps<T>, "as" | "className" | "children">;

/** A floating glass surface. Tier 1 for content panels, tier 2 for overlays & hero objects, inset for wells. */
export function Glass<T extends ElementType = "div">({ as, tier = 1, rim, className, children, ...rest }: GlassProps<T>) {
  const Comp = (as ?? "div") as ElementType<Record<string, unknown>>;
  return (
    <Comp
      className={cn(
        tier === 1 && "glass",
        tier === 2 && "glass-2",
        tier === "inset" && "glass-inset",
        rim && "rim",
        "rounded-[var(--radius-card)]",
        className,
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/* ── Button ────────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "light";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";

// Neumorphic buttons: extruded at rest, lift on hover, sink into the surface when pressed.
const buttonBase =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-tight transition-[transform,box-shadow,background-color,color] duration-200 ease-out will-change-transform active:translate-y-0 disabled:pointer-events-none disabled:opacity-50";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-spectral text-white shadow-[inset_1px_1px_0_rgb(255_255_255/0.35),6px_6px_14px_rgb(163_177_198/0.75),-6px_-6px_14px_rgb(255_255_255/0.95),0_10px_22px_-10px_rgb(108_92_231/0.65)] hover:-translate-y-0.5 hover:shadow-[inset_1px_1px_0_rgb(255_255_255/0.35),9px_9px_20px_rgb(163_177_198/0.8),-8px_-8px_18px_rgb(255_255_255/1),0_14px_28px_-10px_rgb(16_180_214/0.6)] active:shadow-[inset_4px_4px_10px_rgb(40_30_120/0.45),inset_-3px_-3px_8px_rgb(255_255_255/0.25)]",
  secondary:
    "neu text-ink hover:-translate-y-0.5 hover:shadow-[var(--shadow-neu-lg)] active:shadow-[var(--shadow-neu-inset)]",
  ghost: "text-ink-2 hover:text-ink hover:bg-ink/[0.05] active:shadow-[var(--shadow-neu-inset-sm)]",
  danger:
    "neu text-danger hover:-translate-y-0.5 hover:shadow-[var(--shadow-neu-lg)] active:shadow-[var(--shadow-neu-inset)]",
  outline:
    "border border-ink/12 text-ink hover:bg-ink/[0.04] hover:-translate-y-0.5 active:shadow-[var(--shadow-neu-inset-sm)]",
  light: "neu-raised text-ink hover:-translate-y-0.5 active:shadow-[var(--shadow-neu-inset)]",
};

const buttonSizes: Record<ButtonSize, string> = {
  xs: "h-7 px-3 text-xs",
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
  icon: "h-10 w-10 p-0",
};

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  href?: string;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentProps<"button">, "className" | "children">;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, href, className, children, disabled, ...rest },
  ref,
) {
  const classes = cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
  if (href) {
    return (
      <Link href={href} className={classes} aria-disabled={disabled || undefined}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} className={classes} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

/* ── Badge ─────────────────────────────────────────────────────────────── */

export type Tone = "neutral" | "iris" | "aqua" | "success" | "warning" | "danger" | "info" | "plasma" | "ember";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-lo text-ink-2 border-white/60 shadow-[var(--shadow-neu-inset-sm)]",
  iris: "bg-iris/12 text-iris-soft border-iris/25",
  aqua: "bg-aqua/12 text-aqua-soft border-aqua/25",
  success: "bg-success/12 text-success border-success/30",
  warning: "bg-warning/12 text-warning border-warning/30",
  danger: "bg-danger/12 text-danger border-danger/30",
  info: "bg-info/12 text-info border-info/30",
  plasma: "bg-plasma/12 text-plasma border-plasma/30",
  ember: "bg-ember/12 text-ember border-ember/30",
};

export function Badge({
  tone = "neutral",
  dot,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/* ── Form controls ─────────────────────────────────────────────────────── */

// Inputs are carved wells in the surface; focus adds a soft accent halo.
const controlBase =
  "w-full rounded-[var(--radius-control)] border border-white/50 bg-surface-lo px-3.5 text-sm text-ink placeholder:text-ink-4 shadow-[var(--shadow-neu-inset)] transition-[box-shadow,border-color] duration-200 focus:border-iris/40 focus:outline-none focus:shadow-[var(--shadow-neu-inset-sm),0_0_0_4px_rgb(108_92_231/0.14)] disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(controlBase, "h-11", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(controlBase, "min-h-24 py-3 leading-relaxed", className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        controlBase,
        "h-11 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2367728c' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9 [&>option]:bg-white",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});

export function Label({ className, ...rest }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-xs font-medium tracking-wide text-ink-2", className)} {...rest} />;
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-white/50 transition-colors duration-300 disabled:opacity-50",
        checked
          ? "bg-gradient-to-r from-iris to-aqua shadow-[inset_2px_2px_6px_rgb(40_30_120/0.35),inset_-2px_-2px_6px_rgb(255_255_255/0.25)]"
          : "bg-surface-lo shadow-[var(--shadow-neu-inset)]",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-gradient-to-br from-white to-[#e6ebf3] shadow-[2px_2px_5px_rgb(120_135_165/0.55),-1px_-1px_3px_rgb(255_255_255/0.9)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          checked ? "translate-x-[25px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}

/* ── Avatar ────────────────────────────────────────────────────────────── */

export function Avatar({ name, size = 32, className }: { name?: string | null; size?: number; className?: string }) {
  const hue = hueFrom(name ?? "?");
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.38),
        background: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 50) % 360} 75% 45%))`,
        boxShadow: "inset 1px 1px 0 rgb(255 255 255 / 0.35), 3px 3px 8px rgb(163 177 198 / 0.7), -2px -2px 6px rgb(255 255 255 / 0.9)",
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/* ── Feedback ──────────────────────────────────────────────────────────── */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-ink-3", className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl", className)} aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-16 text-center", className)}>
      {icon && (
        <div className="neu-raised mb-5 flex size-16 animate-float items-center justify-center rounded-2xl text-iris">{icon}</div>
      )}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-3">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-white/60 bg-surface px-1.5 font-mono text-[10px] text-ink-3 shadow-[var(--shadow-neu-sm)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/* ── Layout helpers ────────────────────────────────────────────────────── */

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  as: Tag = "h2",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl", className)}>
      {eyebrow && (
        <p className="neu mb-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-[0.14em] text-iris-soft uppercase">
          <span className="size-1.5 animate-pulse rounded-full bg-aqua" aria-hidden />
          {eyebrow}
        </p>
      )}
      <Tag className="text-3xl font-semibold tracking-[-0.035em] text-balance text-ink sm:text-4xl lg:text-5xl">
        {title}
      </Tag>
      {description && <p className="mt-5 text-base leading-relaxed text-pretty text-ink-2 sm:text-lg">{description}</p>}
    </div>
  );
}

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-5 sm:px-8", className)}>{children}</div>;
}

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

const buttonBase =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium tracking-tight transition-all duration-200 will-change-transform active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-spectral text-white shadow-[0_1px_0_0_rgb(255_255_255/0.35)_inset,0_10px_30px_-10px_rgb(124_92_255/0.8)] hover:shadow-[0_1px_0_0_rgb(255_255_255/0.35)_inset,0_14px_40px_-8px_rgb(34_211_238/0.6)] hover:-translate-y-0.5",
  secondary:
    "glass text-ink hover:bg-[var(--color-glass-hover)] hover:-translate-y-0.5 hover:border-[var(--color-edge-strong)]",
  ghost: "text-ink-2 hover:text-ink hover:bg-white/[0.06]",
  danger:
    "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25 hover:-translate-y-0.5",
  outline: "border border-edge-strong text-ink hover:bg-white/[0.06] hover:-translate-y-0.5",
  light: "bg-white text-[#0b0e1c] hover:bg-white/90 hover:-translate-y-0.5 shadow-[0_10px_30px_-10px_rgb(255_255_255/0.5)]",
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
  neutral: "bg-white/[0.07] text-ink-2 border-white/10",
  iris: "bg-iris/15 text-iris-soft border-iris/30",
  aqua: "bg-aqua/12 text-aqua-soft border-aqua/30",
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

const controlBase =
  "w-full rounded-[var(--radius-control)] border border-white/10 bg-black/25 px-3.5 text-sm text-ink placeholder:text-ink-4 shadow-[inset_0_1px_2px_rgb(0_0_0/0.3)] transition focus:border-aqua/60 focus:bg-black/35 focus:outline-none focus:ring-4 focus:ring-aqua/10 disabled:opacity-60";

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
        "h-11 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23c7cdf0' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:12px] bg-[right_14px_center] bg-no-repeat pr-9 [&>option]:bg-[#0f1224]",
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
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50",
        checked ? "border-aqua/50 bg-gradient-to-r from-iris to-aqua" : "border-white/15 bg-white/10",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow-md transition-transform",
          checked ? "translate-x-[21px]" : "translate-x-[1px]",
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
        boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.3), 0 4px 12px -4px rgb(0 0 0 / 0.6)",
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
        <div className="glass-2 mb-5 flex size-16 items-center justify-center rounded-2xl text-aqua-soft">{icon}</div>
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
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-white/15 bg-white/[0.06] px-1.5 font-mono text-[10px] text-ink-3",
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
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium tracking-[0.14em] text-aqua-soft uppercase">
          <span className="size-1.5 rounded-full bg-aqua shadow-[0_0_10px_var(--color-aqua)]" aria-hidden />
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

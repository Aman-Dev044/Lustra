"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function useLockScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onClose]);
}

const noopSubscribe = () => () => {};

function Portal({ children }: { children: ReactNode }) {
  // true on the client, false during SSR/hydration — without a setState-in-effect round trip.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return isClient ? createPortal(children, document.body) : null;
}

/** Centered floating window — scales up from depth like a visionOS sheet. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useLockScroll(open);
  useEscape(open, onClose);
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
            <motion.div
              className="absolute inset-0 bg-black/65 backdrop-blur-[6px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              tabIndex={-1}
              className={cn(
                "glass-sheet rim relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] outline-none sm:rounded-[28px]",
                widths[size],
              )}
              initial={{ opacity: 0, scale: 0.92, y: 30, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95, y: 20, filter: "blur(6px)" }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
            >
              {(title || description) && (
                <div className="flex items-start justify-between gap-4 border-b border-ink/[0.07] px-6 pt-6 pb-4">
                  <div>
                    {title && (
                      <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
                        {title}
                      </h2>
                    )}
                    {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
                  </div>
                  <button
                    onClick={onClose}
                    className="neu-press rounded-full p-2 text-ink-3 shadow-[var(--shadow-neu-sm)] hover:text-ink"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
              {footer && (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink/[0.07] bg-surface-lo px-6 py-4">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** Side sheet that glides in from the right edge. */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useLockScroll(open);
  useEscape(open, onClose);
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[80]">
            <motion.div
              className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              className="glass-sheet absolute top-2 right-2 bottom-2 flex flex-col overflow-hidden rounded-[26px]"
              style={{ width: `min(${width}px, calc(100vw - 16px))` }}
              initial={{ x: "105%" }}
              animate={{ x: 0 }}
              exit={{ x: "105%" }}
              transition={{ type: "spring", stiffness: 300, damping: 34 }}
            >
              <div className="flex items-center justify-between border-b border-ink/[0.07] px-6 py-4">
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                <button
                  onClick={onClose}
                  className="neu-press rounded-full p-2 text-ink-3 shadow-[var(--shadow-neu-sm)] hover:text-ink"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
              {footer && (
                <div className="flex items-center justify-end gap-2 border-t border-ink/[0.07] px-6 py-4">{footer}</div>
              )}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** visionOS-style segmented control with a sliding glass thumb. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  return (
    <div
      role="tablist"
      className={cn("glass-inset inline-flex items-center gap-1 rounded-full p-1", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative rounded-full font-medium transition-colors",
              size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
              active ? "text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full border border-white/15 bg-gradient-to-b from-white/[0.14] to-white/[0.06] shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_4px_14px_-4px_rgb(0_0_0/0.8)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Lightweight popover menu anchored to its trigger. */
export function Menu({
  trigger,
  items,
  align = "right",
}: {
  trigger: ReactNode;
  items: { label: ReactNode; onClick?: () => void; href?: string; danger?: boolean; icon?: ReactNode }[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  useEscape(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className={cn(
              "glass-sheet absolute z-50 mt-2 min-w-48 overflow-hidden rounded-2xl p-1.5",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {items.map((item, i) => {
              const cls = cn(
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition",
                item.danger ? "text-danger hover:bg-danger/10" : "text-ink-2 hover:bg-surface-lo hover:text-ink hover:shadow-[var(--shadow-neu-inset-sm)]",
              );
              return item.href ? (
                <a key={i} href={item.href} className={cls} role="menuitem">
                  {item.icon}
                  {item.label}
                </a>
              ) : (
                <button
                  key={i}
                  role="menuitem"
                  className={cls}
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Confirmation dialog built on Modal (native confirm() is avoided for consistency). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button className="h-9 rounded-full px-4 text-sm text-ink-2 hover:bg-ink/[0.06]" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              "h-9 rounded-full px-4 text-sm font-medium transition disabled:opacity-50",
              danger ? "bg-danger/20 text-danger hover:bg-danger/30" : "bg-spectral text-white",
            )}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </>
      }
    />
  );
}

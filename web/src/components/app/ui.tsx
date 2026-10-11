"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Lock, Sparkles } from "lucide-react";
import { Badge, Button, Glass } from "@/components/spatial";
import { featureLabels, requiredPlanFor, type Feature } from "@/lib/plans";
import { invoiceStatusMeta, quoteStatusMeta, stageMeta } from "@/lib/domain";
import type { InvoiceStatus, JobStage, QuoteStatus } from "@/lib/types";
import { cn, titleCase } from "@/lib/utils";
import { useAuth } from "./auth-provider";

/* ── Page header ───────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 px-1 pt-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-xs text-ink-3 transition hover:text-ink">
            ← {back.label}
          </Link>
        )}
        {eyebrow && <div className="mb-1.5 text-xs font-medium tracking-wide text-aqua-soft">{eyebrow}</div>}
        <h1 className="truncate text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── Plan gate ─────────────────────────────────────────────────────────── */

/** Renders children when the shop's plan includes `feature`; otherwise a spatial upsell panel. */
export function PlanGate({ feature, children }: { feature: Feature; children: ReactNode }) {
  const { can } = useAuth();
  if (can(feature)) return <>{children}</>;
  const plan = requiredPlanFor(feature);
  return (
    <Glass tier={2} rim className="mx-auto mt-10 max-w-xl p-10 text-center">
      <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-iris to-aqua shadow-[var(--shadow-glow-iris)]">
        <Lock className="size-7 text-white" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">{featureLabels[feature]} is on {titleCase(plan)}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-3">
        Upgrade in one click — no contracts, prorated instantly. Your data and settings carry over.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Button href="/app/settings?tab=billing">
          <Sparkles className="size-4" /> Upgrade to {titleCase(plan)}
        </Button>
        <Button href="/pricing" variant="secondary">
          Compare plans
        </Button>
      </div>
    </Glass>
  );
}

/* ── Stat card ─────────────────────────────────────────────────────────── */

export function StatCard({
  label,
  value,
  change,
  icon,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  change?: number;
  icon?: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  const up = (change ?? 0) >= 0;
  return (
    <Glass className={cn("relative overflow-hidden p-5", className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium tracking-wide text-ink-3">{label}</p>
        {icon && <span className="text-ink-4">{icon}</span>}
      </div>
      <p className="mt-3 text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{value}</p>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {change !== undefined && (
          <span className={cn("inline-flex items-center gap-0.5 font-medium", up ? "text-success" : "text-danger")}>
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-ink-4">{hint}</span>}
      </div>
    </Glass>
  );
}

/* ── Status badges ─────────────────────────────────────────────────────── */

export const StageBadge = ({ stage }: { stage: JobStage }) => (
  <Badge tone={stageMeta[stage]?.tone ?? "neutral"} dot>
    {stageMeta[stage]?.label ?? stage}
  </Badge>
);

export const QuoteStatusBadge = ({ status }: { status: QuoteStatus }) => (
  <Badge tone={quoteStatusMeta[status]?.tone ?? "neutral"} dot>
    {quoteStatusMeta[status]?.label ?? status}
  </Badge>
);

export const InvoiceStatusBadge = ({ status }: { status: InvoiceStatus }) => (
  <Badge tone={invoiceStatusMeta[status]?.tone ?? "neutral"} dot>
    {invoiceStatusMeta[status]?.label ?? status}
  </Badge>
);

/* ── Table ─────────────────────────────────────────────────────────────── */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-ink/[0.07] px-4 py-3 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-ink-4 uppercase",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("border-b border-ink/[0.04] px-4 py-3 align-middle text-ink-2", className)}>{children}</td>;
}

/** Clickable table row that navigates like a link while keeping semantic table markup. */
export function RowLink({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-ink/[0.04]"
      onMouseEnter={() => router.prefetch(href)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a,button,input,select,label")) return;
        router.push(href);
      }}
    >
      {children}
    </tr>
  );
}

/* ── Search / filter bar ───────────────────────────────────────────────── */

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-4 flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 text-xs text-ink-3">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-1">
        <Button size="xs" variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button size="xs" variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { CalendarClock, CheckSquare, Flame } from "lucide-react";
import type { Job } from "@/lib/types";
import { customerName, priorityMeta, vehicleLabel } from "@/lib/domain";
import { cn, formatMoney } from "@/lib/utils";
import { Avatar, Badge } from "@/components/spatial";

function when(job: Job) {
  if (!job.scheduledStart) return null;
  const d = new Date(job.scheduledStart);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return sameDay ? `Today ${time}` : `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${time}`;
}

/** Compact job tile used on the live board and in lists. */
export function JobCard({ job, highlight, dragging }: { job: Job; highlight?: boolean; dragging?: boolean }) {
  const done = job.checklist?.filter((c) => c.done).length ?? 0;
  const total = job.checklist?.length ?? 0;
  const scheduled = when(job);
  return (
    <div
      className={cn(
        "glass group relative rounded-[18px] p-3.5 transition-all duration-300",
        dragging ? "scale-[1.03] rotate-[1.5deg] shadow-[var(--shadow-lift)]" : "hover:-translate-y-0.5 hover:border-ink/20",
        highlight && "shadow-[var(--shadow-glow-aqua)]",
      )}
    >
      {highlight && <span className="pointer-events-none absolute inset-0 animate-pulse rounded-[18px] ring-1 ring-aqua/60" aria-hidden />}
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/app/jobs/${job._id}`}
          className="min-w-0 text-sm leading-snug font-medium text-ink hover:text-aqua-soft"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span className="mr-1.5 font-mono text-[11px] text-ink-4">#{job.number}</span>
          {job.title}
        </Link>
        {(job.priority === "high" || job.priority === "rush") && (
          <Badge tone={priorityMeta[job.priority].tone} className="shrink-0">
            <Flame className="size-3" aria-hidden />
            {priorityMeta[job.priority].label}
          </Badge>
        )}
      </div>
      <p className="mt-1.5 truncate text-xs text-ink-3">
        {customerName(job.customer)}
        {job.vehicle && <span className="text-ink-4"> · {vehicleLabel(job.vehicle)}</span>}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-[11px] text-ink-4">
          {scheduled && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="size-3" aria-hidden />
              {scheduled}
            </span>
          )}
          {total > 0 && (
            <span className={cn("inline-flex items-center gap-1", done === total && "text-success")}>
              <CheckSquare className="size-3" aria-hidden />
              {done}/{total}
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-ink tabular-nums">{formatMoney(job.totals?.total, "USD", true)}</span>
      </div>
      {total > 0 && (
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-ink/[0.06]">
          <div className="h-full rounded-full bg-gradient-to-r from-iris to-aqua" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}
      {job.assignees?.length > 0 && (
        <div className="mt-3 flex -space-x-1.5">
          {job.assignees.slice(0, 4).map((u) => (
            <span key={u._id} className="rounded-full ring-2 ring-void" title={u.name}>
              <Avatar name={u.name} size={22} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

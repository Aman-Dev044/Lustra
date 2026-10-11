"use client";

import type { ReactNode } from "react";

/** Spectral palette for chart series — tuned for contrast against the dark glass field. */
export const chartColors = ["#ff6a2b", "#45c4ff", "#f472b6", "#fb923c", "#34d399", "#60a5fa", "#fbbf24", "#a3e635", "#ff9a66", "#38bdf8"];

export const axisProps = {
  stroke: "rgb(103 114 140 / 0.55)",
  tick: { fill: "#9b9b98", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export const gridProps = { stroke: "rgb(255 255 255 / 0.06)", strokeDasharray: "3 6", vertical: false } as const;

type TooltipEntry = { name?: ReactNode; value?: number | string; color?: string; dataKey?: unknown; payload?: { fill?: string } };

/** Frosted-glass tooltip used by every Recharts chart in the ops pages. */
export function GlassTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: ReactNode;
  formatter?: (value: number, name: string) => ReactNode;
  labelFormatter?: (label: ReactNode) => ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-2 min-w-36 rounded-2xl px-3.5 py-2.5 text-xs shadow-2xl">
      {label !== undefined && label !== "" && <p className="mb-1.5 font-medium text-ink">{labelFormatter ? labelFormatter(label) : label}</p>}
      <ul className="space-y-1">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-4 text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: p.color ?? p.payload?.fill }} />
              {String(p.name ?? p.dataKey ?? "")}
            </span>
            <span className="font-medium text-ink tabular-nums">
              {formatter ? formatter(Number(p.value), String(p.name ?? "")) : String(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartCard({ title, subtitle, action, children, className }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`glass rounded-[var(--radius-card)] p-5 ${className ?? ""}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-4">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

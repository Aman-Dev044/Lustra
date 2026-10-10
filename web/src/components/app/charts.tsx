"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/utils";

type TooltipEntry = { name?: string; value?: number | string; color?: string; dataKey?: string | number };

/** Glass tooltip shared by every recharts chart in the app. */
export function GlassTooltip({
  active,
  payload,
  label,
  money = true,
  labelFormatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  money?: boolean;
  labelFormatter?: (l: string | number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-2 min-w-36 rounded-2xl px-3.5 py-2.5 text-xs">
      {label !== undefined && <p className="mb-1.5 text-ink-3">{labelFormatter ? labelFormatter(label) : label}</p>}
      {payload.map((p) => (
        <p key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-ink-2">
            <span className="size-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-ink tabular-nums">
            {money && p.dataKey !== "jobs" ? formatMoney(Number(p.value), "USD", true) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export const axisProps = {
  stroke: "rgb(226 232 255 / 0.32)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const shortDate = (d: string | number) =>
  new Date(String(d)).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function RevenueAreaChart({
  data,
  height = 260,
}: {
  data: { date: string; revenue: number; jobs?: number }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 6, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="rev-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c5cff" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.45} />
            <stop offset="60%" stopColor="#22d3ee" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgb(255 255 255 / 0.05)" vertical={false} />
        <XAxis dataKey="date" {...axisProps} tickFormatter={shortDate} minTickGap={28} />
        <YAxis {...axisProps} tickFormatter={(v) => formatMoney(Number(v), "USD", true)} width={56} />
        <Tooltip
          cursor={{ stroke: "rgb(255 255 255 / 0.15)", strokeDasharray: "4 4" }}
          content={(p) => (
            <GlassTooltip
              active={p.active}
              payload={p.payload as unknown as TooltipEntry[]}
              label={p.label as string}
              labelFormatter={shortDate}
            />
          )}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="url(#rev-stroke)"
          strokeWidth={2.5}
          fill="url(#rev-fill)"
          activeDot={{ r: 5, fill: "#22d3ee", stroke: "#04050a", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

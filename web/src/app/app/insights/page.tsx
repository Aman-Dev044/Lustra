"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { motion } from "motion/react";
import { Area, ComposedChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  Crown,
  FileClock,
  Gem,
  HeartPulse,
  Package,
  Receipt,
  TrendingDown,
  TrendingUp,
  UserX,
} from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import type { Insights } from "@/lib/types";
import { customerName } from "@/lib/domain";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { Avatar, Badge, Button, EmptyState, Glass, Skeleton } from "@/components/spatial";
import { PageHeader, PlanGate, Table, Td, Th } from "@/components/app/ui";
import { ChartCard, GlassTooltip, axisProps, gridProps } from "@/components/app/ops-charts";

type Opportunity = Insights["opportunities"][number];

const oppIcon: Record<Opportunity["kind"], typeof Gem> = {
  followup_quotes: FileClock,
  coating_anniversary: Gem,
  idle_capacity: CalendarClock,
  lapsed_vips: UserX,
  unpaid_invoices: Receipt,
  low_stock: Package,
  membership_upsell: Crown,
};

const riskTone = { high: "danger", medium: "warning", low: "neutral" } as const;

export default function InsightsPage() {
  return (
    <PlanGate feature="ai_insights">
      <InsightsView />
    </PlanGate>
  );
}

function InsightsView() {
  const { data, loading, error } = useApi<Insights>("/insights");

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <BrainCircuit className="size-3.5" /> Lustra Intelligence
          </span>
        }
        title="AI Insights"
        description="Forecasts, risks and the highest-value moves for your shop this week — recalculated continuously from your data."
      />
      {error && !data ? (
        <Glass>
          <EmptyState title="Insights are unavailable right now" description={error.message} />
        </Glass>
      ) : loading || !data ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <HealthCard health={data.health} />
            <ForecastCard forecast={data.forecast} />
          </div>
          <Opportunities items={data.opportunities} />
          <ChurnTable rows={data.churnRisk} />
        </>
      )}
    </>
  );
}

function HealthCard({ health }: { health: Insights["health"] }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const score = Math.max(0, Math.min(100, Math.round(health.score)));
  const color = score >= 75 ? "#34d399" : score >= 50 ? "#fbbf24" : "#fb7185";
  const label = score >= 75 ? "Thriving" : score >= 50 ? "Stable — room to grow" : "Needs attention";
  return (
    <Glass tier={2} rim className="p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <HeartPulse className="size-4 text-plasma" /> Business health
      </h2>
      <div className="relative mx-auto my-5 size-48">
        <svg viewBox="0 0 180 180" className="size-full -rotate-90">
          <defs>
            <linearGradient id="health-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#7c5cff" />
              <stop offset="1" stopColor={color} />
            </linearGradient>
          </defs>
          <circle cx="90" cy="90" r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="14" />
          <motion.circle
            cx="90"
            cy="90"
            r={r}
            fill="none"
            stroke="url(#health-ring)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - score / 100) }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 10px ${color}88)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-semibold tracking-tight tabular-nums">{score}</span>
          <span className="text-xs text-ink-3">{label}</span>
        </div>
      </div>
      <ul className="space-y-3">
        {health.factors.map((f) => (
          <li key={f.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-2">{f.label}</span>
              <span className="text-ink tabular-nums">{Math.round(f.score)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: f.score >= 75 ? "linear-gradient(90deg,#22d3ee,#34d399)" : f.score >= 50 ? "linear-gradient(90deg,#fb923c,#fbbf24)" : "linear-gradient(90deg,#f472b6,#fb7185)" }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(3, Math.min(100, f.score))}%` }}
                transition={{ duration: 1, delay: 0.2 }}
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-4">{f.hint}</p>
          </li>
        ))}
      </ul>
    </Glass>
  );
}

function ForecastCard({ forecast }: { forecast: Insights["forecast"] }) {
  const series = useMemo(
    () =>
      forecast.series.map((p) => ({
        ...p,
        label: format(parseISO(p.date), "MMM d"),
        band: [p.lower, p.upper] as [number, number],
      })),
    [forecast.series],
  );
  // API returns trend as a direction ("up" | "down" | "flat") plus trendPct; tolerate a numeric trend too.
  const raw = forecast as Insights["forecast"] & { trend: number | string; trendPct?: number };
  const pct = typeof raw.trend === "number" ? raw.trend : Number(raw.trendPct ?? 0);
  const up = typeof raw.trend === "string" ? raw.trend !== "down" : pct >= 0;
  return (
    <ChartCard
      title="Revenue forecast"
      subtitle="Actual daily revenue, model prediction and 80% confidence band"
      action={
        <div className="text-right">
          <p className="text-[11px] text-ink-4">Next 30 days</p>
          <p className="text-xl font-semibold tabular-nums">{formatMoney(forecast.next30, "USD", true)}</p>
          <p className={cn("inline-flex items-center gap-1 text-xs font-medium", up ? "text-success" : "text-danger")}>
            {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {Number.isFinite(pct) ? `${Math.abs(pct).toFixed(1)}% trend` : up ? "Trending up" : "Trending down"}
          </p>
        </div>
      }
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: 6, left: -6, bottom: 0 }}>
            <defs>
              <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#22d3ee" stopOpacity={0.25} />
                <stop offset="1" stopColor="#7c5cff" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...axisProps} minTickGap={28} />
            <YAxis {...axisProps} tickFormatter={(v: number) => formatMoney(v, "USD", true)} width={60} />
            <Tooltip
              cursor={{ stroke: "rgb(255 255 255 / 0.15)" }}
              content={
                <GlassTooltip
                  formatter={(v) => (Number.isFinite(v) ? formatMoney(v) : "—")}
                />
              }
            />
            <Area dataKey="band" name="Confidence" stroke="none" fill="url(#band)" isAnimationActive={false} />
            <Line dataKey="predicted" name="Predicted" stroke="#22d3ee" strokeWidth={2} strokeDasharray="6 5" dot={false} />
            <Line dataKey="actual" name="Actual" stroke="#a594ff" strokeWidth={2.5} dot={false} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-ink-4">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded bg-iris-soft" /> Actual
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded border-t-2 border-dashed border-aqua" /> Predicted
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded bg-aqua/20" /> Confidence band
        </span>
      </div>
    </ChartCard>
  );
}

function Opportunities({ items }: { items: Opportunity[] }) {
  const sorted = [...items].sort((a, b) => b.impact - a.impact);
  const total = sorted.reduce((s, o) => s + o.impact, 0);
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-end justify-between px-1">
        <div>
          <h2 className="text-sm font-semibold">Opportunities</h2>
          <p className="text-xs text-ink-4">Ranked by estimated revenue impact</p>
        </div>
        {total > 0 && (
          <p className="text-xs text-ink-3">
            <span className="text-spectral text-lg font-semibold">{formatMoney(total, "USD", true)}</span> on the table
          </p>
        )}
      </div>
      {sorted.length === 0 ? (
        <Glass>
          <EmptyState title="Nothing urgent" description="Your pipeline, collections and stock are all in great shape." />
        </Glass>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((o, i) => {
            const Icon = oppIcon[o.kind] ?? Gem;
            return (
              <motion.div key={o.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Glass className="flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:border-white/20">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-iris/40 to-aqua/30 text-white">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{o.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-3">{o.description}</p>
                    </div>
                  </div>
                  <div className="mt-auto flex items-end justify-between pt-5">
                    <div>
                      <p className="text-[10px] tracking-wider text-ink-4 uppercase">Est. impact</p>
                      <p className="text-lg font-semibold text-success tabular-nums">{formatMoney(o.impact, "USD", true)}</p>
                      {o.count > 0 && <p className="text-[11px] text-ink-4">{o.count} item{o.count === 1 ? "" : "s"}</p>}
                    </div>
                    <Button size="sm" href={o.action.href}>
                      {o.action.label} <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                </Glass>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ChurnTable({ rows }: { rows: Insights["churnRisk"] }) {
  return (
    <Glass className="mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] p-5">
        <div>
          <h2 className="text-sm font-semibold">Churn-risk radar</h2>
          <p className="text-xs text-ink-4">Customers overdue versus their own visit rhythm</p>
        </div>
        <Button size="sm" variant="secondary" href="/app/campaigns?segment=lapsed">
          Win back all lapsed
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-4">No customers at risk. Retention is excellent.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Customer</Th>
              <Th>Risk</Th>
              <Th>Last visit</Th>
              <Th className="text-right">Usual interval</Th>
              <Th className="text-right">Days overdue</Th>
              <Th className="text-right">Lifetime value</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.customer._id} className="hover:bg-white/[0.03]">
                <Td>
                  <Link href={`/app/customers/${r.customer._id}`} className="flex items-center gap-2.5 text-ink hover:text-aqua-soft">
                    <Avatar name={customerName(r.customer)} size={28} />
                    {customerName(r.customer)}
                  </Link>
                </Td>
                <Td>
                  <Badge tone={riskTone[r.risk]} dot>
                    {r.risk}
                  </Badge>
                </Td>
                <Td>{formatDate(r.lastVisitAt)}</Td>
                <Td className="text-right tabular-nums">{Math.round(r.avgIntervalDays)} days</Td>
                <Td className={cn("text-right tabular-nums", r.risk === "high" && "text-danger")}>{Math.round(r.daysOverdue)}</Td>
                <Td className="text-right font-medium text-ink tabular-nums">{formatMoney(r.lifetimeValue)}</Td>
                <Td className="text-right">
                  <Button size="xs" variant="secondary" href={`/app/messages?customer=${r.customer._id}`}>
                    Win back
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Glass>
  );
}

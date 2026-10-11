"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addDays, format, parseISO, subDays } from "date-fns";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, CalendarRange, DollarSign, Lock, Percent, Receipt, Sparkles, TrendingUp, UserPlus, Wallet, Wrench } from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import type { AnalyticsOverview, EarningsRow, ServiceCategory } from "@/lib/types";
import { categoryMeta, stageMeta } from "@/lib/domain";
import { cn, formatMoney, formatNumber, formatPercent, titleCase } from "@/lib/utils";
import { Avatar, Button, Glass, Segmented, Skeleton } from "@/components/spatial";
import { PageHeader, StatCard } from "@/components/app/ui";
import { useAuth } from "@/components/app/auth-provider";
import { ChartCard, GlassTooltip, axisProps, chartColors, gridProps } from "@/components/app/ops-charts";

type Range = "7d" | "30d" | "90d" | "365d";
const rangeDays: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };

/** Typical material cost as a share of ticket price, by service category (industry benchmarks). */
const materialRatio: Partial<Record<ServiceCategory, number>> = {
  ppf: 0.22,
  wrap: 0.25,
  tint: 0.15,
  ceramic: 0.12,
  correction: 0.06,
  detailing: 0.08,
  interior: 0.07,
  marine: 0.1,
  maintenance: 0.08,
  lawn: 0.1,
};

export default function AnalyticsPage() {
  const { can } = useAuth();
  const [range, setRange] = useState<Range>("30d");
  const { data, loading } = useApi<AnalyticsOverview>("/analytics/overview", { range });

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Revenue, conversion, technician output and pipeline — live from every bay."
        actions={
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: "7d", label: "7D" },
              { value: "30d", label: "30D" },
              { value: "90d", label: "90D" },
              { value: "365d", label: "1Y" },
            ]}
          />
        }
      />
      {loading || !data ? <LoadingState /> : <Dashboard data={data} range={range} />}
      {can("profit_analytics") ? (
        data && <ProfitSection data={data} range={range} />
      ) : (
        <Upsell title="Profit analytics" body="See true margin after labor and materials, by category and by technician." plan="Pro" />
      )}
      {can("capacity_planner") ? <CapacityHeatmap /> : <Upsell title="Bay capacity planner" body="Spot empty bays two weeks out and fill them with targeted offers." plan="Enterprise" />}
    </>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-80" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function Dashboard({ data, range }: { data: AnalyticsOverview; range: Range }) {
  const { kpis } = data;
  const series = useMemo(
    () =>
      data.revenueSeries.map((p) => ({
        ...p,
        label: format(parseISO(p.date), range === "365d" ? "MMM yy" : "MMM d"),
      })),
    [data.revenueSeries, range],
  );
  const categories = data.byCategory.filter((c) => c.revenue > 0);
  const categoryTotal = categories.reduce((s, c) => s + c.revenue, 0);
  const maxPipeline = Math.max(1, ...data.pipeline.map((p) => p.count));
  const maxTech = Math.max(1, ...data.technicians.map((t) => t.revenue));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={formatMoney(kpis.revenue, "USD", true)} change={kpis.revenueChange} hint="vs prior period" icon={<DollarSign className="size-4" />} />
        <StatCard label="Jobs completed" value={formatNumber(kpis.jobsCompleted)} change={kpis.jobsChange} hint="vs prior period" icon={<Wrench className="size-4" />} />
        <StatCard label="Average ticket" value={formatMoney(kpis.avgTicket)} icon={<Receipt className="size-4" />} />
        <StatCard label="Quote conversion" value={formatPercent(kpis.conversionRate, 1)} icon={<Percent className="size-4" />} hint="quotes approved" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Outstanding balance" value={formatMoney(kpis.outstanding)} icon={<Wallet className="size-4" />} hint="unpaid invoices" />
        <StatCard label="New customers" value={formatNumber(kpis.newCustomers)} icon={<UserPlus className="size-4" />} hint={`last ${rangeDays[range]} days`} />
      </div>

      <ChartCard title="Revenue & jobs" subtitle="Collected revenue (area) and completed jobs (bars)">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ff6a2b" stopOpacity={0.55} />
                  <stop offset="1" stopColor="#ff6a2b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#ff9a66" />
                  <stop offset="1" stopColor="#45c4ff" />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} minTickGap={24} />
              <YAxis yAxisId="rev" {...axisProps} tickFormatter={(v: number) => formatMoney(v, "USD", true)} width={64} />
              <YAxis yAxisId="jobs" orientation="right" {...axisProps} allowDecimals={false} width={32} />
              <Tooltip
                cursor={{ stroke: "rgb(255 255 255 / 0.15)" }}
                content={<GlassTooltip formatter={(v, n) => (n === "Revenue" ? formatMoney(v) : formatNumber(v))} />}
              />
              <Bar yAxisId="jobs" dataKey="jobs" name="Jobs" fill="rgb(34 211 238 / 0.35)" radius={[6, 6, 2, 2]} maxBarSize={16} />
              <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke="url(#revStroke)" strokeWidth={2.5} fill="url(#revFill)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue by category">
          {categories.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-4">No revenue in this period.</p>
          ) : (
            <div className="grid items-center gap-4 sm:grid-cols-[200px_1fr]">
              <div className="relative h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} dataKey="revenue" nameKey="category" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none">
                      {categories.map((c, i) => (
                        <Cell key={c.category} fill={categoryMeta[c.category as ServiceCategory]?.color ?? chartColors[i % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<GlassTooltip formatter={(v) => formatMoney(v)} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] tracking-wider text-ink-4 uppercase">Total</span>
                  <span className="text-lg font-semibold tabular-nums">{formatMoney(categoryTotal, "USD", true)}</span>
                </div>
              </div>
              <ul className="space-y-2">
                {categories
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((c, i) => (
                    <li key={c.category} className="flex items-center gap-3 text-sm">
                      <span className="size-2.5 rounded-full" style={{ background: categoryMeta[c.category as ServiceCategory]?.color ?? chartColors[i % chartColors.length] }} />
                      <span className="flex-1 text-ink-2">{categoryMeta[c.category as ServiceCategory]?.label ?? titleCase(c.category)}</span>
                      <span className="text-xs text-ink-4 tabular-nums">{((c.revenue / categoryTotal) * 100).toFixed(0)}%</span>
                      <span className="w-20 text-right font-medium text-ink tabular-nums">{formatMoney(c.revenue, "USD", true)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Top services" subtitle="By revenue">
          <ul className="space-y-1">
            {data.topServices.slice(0, 8).map((s, i) => (
              <li key={s.name} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-ink/[0.03]">
                <span className="w-5 text-xs text-ink-4 tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{s.name}</span>
                <span className="text-xs text-ink-4 tabular-nums">{s.count}×</span>
                <span className="w-24 text-right font-medium tabular-nums">{formatMoney(s.revenue)}</span>
              </li>
            ))}
            {data.topServices.length === 0 && <li className="py-12 text-center text-sm text-ink-4">No services sold yet.</li>}
          </ul>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Customer sources" subtitle="Where new customers came from">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sources.map((s) => ({ ...s, label: titleCase(s.source) }))} layout="vertical" margin={{ left: 0, right: 12 }}>
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" {...axisProps} allowDecimals={false} />
                <YAxis type="category" dataKey="label" {...axisProps} width={78} />
                <Tooltip cursor={{ fill: "rgb(255 255 255 / 0.04)" }} content={<GlassTooltip />} />
                <Bar dataKey="count" name="Customers" radius={[3, 8, 8, 3]} maxBarSize={18}>
                  {data.sources.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Technician leaderboard" subtitle="Revenue delivered">
          <ul className="space-y-3">
            {data.technicians.slice(0, 6).map((t, i) => (
              <li key={t.user?._id ?? i} className="flex items-center gap-3">
                <Avatar name={t.user?.name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate text-ink">
                      {i === 0 && <Sparkles className="mr-1 inline size-3.5 text-warning" />}
                      {t.user?.name ?? "Unassigned"}
                    </span>
                    <span className="font-medium tabular-nums">{formatMoney(t.revenue, "USD", true)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-iris to-aqua" style={{ width: `${(t.revenue / maxTech) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-ink-4">{t.jobs} jobs</p>
                </div>
              </li>
            ))}
            {data.technicians.length === 0 && <li className="py-12 text-center text-sm text-ink-4">No assigned jobs yet.</li>}
          </ul>
        </ChartCard>

        <ChartCard title="Pipeline" subtitle="Open jobs by stage">
          <ul className="space-y-2.5">
            {data.pipeline.map((p) => {
              const meta = stageMeta[p.stage];
              return (
                <li key={p.stage}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-ink-2">{meta?.label ?? p.stage}</span>
                    <span className="text-ink-4 tabular-nums">
                      {p.count} · {formatMoney(p.value, "USD", true)}
                    </span>
                  </div>
                  <div className="mx-auto h-7 overflow-hidden rounded-lg bg-ink/[0.04]" style={{ width: "100%" }}>
                    <div
                      className="mx-auto h-full rounded-lg transition-all"
                      style={{
                        width: `${Math.max(6, (p.count / maxPipeline) * 100)}%`,
                        background: `linear-gradient(90deg, ${meta?.color ?? "#ff6a2b"}55, ${meta?.color ?? "#ff6a2b"})`,
                        boxShadow: `0 0 18px -4px ${meta?.color ?? "#ff6a2b"}`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}

function ProfitSection({ data, range }: { data: AnalyticsOverview; range: Range }) {
  const to = useMemo(() => new Date(), []);
  const from = useMemo(() => subDays(to, rangeDays[range]), [to, range]);
  const { data: earnings } = useApi<EarningsRow[]>("/earnings", { from: from.toISOString(), to: to.toISOString() });
  const revenue = data.kpis.revenue;
  const materials = data.byCategory.reduce((s, c) => s + c.revenue * (materialRatio[c.category as ServiceCategory] ?? 0.1), 0);
  const labor = (earnings ?? []).reduce((s, r) => s + r.total, 0);
  const profit = revenue - materials - labor;
  const margin = revenue ? (profit / revenue) * 100 : 0;
  const bars = [
    { label: "Revenue", value: revenue, color: "#ff6a2b" },
    { label: "Materials (est.)", value: -materials, color: "#fb923c" },
    { label: "Labor & commissions", value: -labor, color: "#f472b6" },
    { label: "Gross profit", value: profit, color: "#34d399" },
  ];
  const max = Math.max(1, revenue);

  return (
    <ChartCard
      className="mt-4"
      title="Profit analytics"
      subtitle="Revenue minus estimated materials (by category benchmarks) and actual payroll for the period"
      action={
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", margin >= 40 ? "bg-success/15 text-success" : margin >= 20 ? "bg-warning/15 text-warning" : "bg-danger/15 text-danger")}>
          {margin.toFixed(1)}% margin
        </span>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <ul className="space-y-3">
          {bars.map((b) => (
            <li key={b.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-ink-2">{b.label}</span>
                <span className={cn("font-medium tabular-nums", b.value < 0 ? "text-ink-3" : "text-ink")}>{formatMoney(b.value)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-ink/[0.05]">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (Math.abs(b.value) / max) * 100)}%`, background: `linear-gradient(90deg, ${b.color}66, ${b.color})` }} />
              </div>
            </li>
          ))}
        </ul>
        <div className="rounded-3xl bg-ink/[0.04] p-5">
          <TrendingUp className="size-5 text-success" />
          <p className="mt-3 text-xs text-ink-3">Gross profit per completed job</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{formatMoney(data.kpis.jobsCompleted ? profit / data.kpis.jobsCompleted : 0)}</p>
          <p className="mt-3 text-xs leading-relaxed text-ink-4">
            Tip: PPF and wrap carry the highest material share. Bundling ceramic over PPF lifts margin per hour of bay time.
          </p>
        </div>
      </div>
    </ChartCard>
  );
}

function CapacityHeatmap() {
  const from = useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)), []);
  const to = useMemo(() => addDays(from, 13), [from]);
  const { data, loading } = useApi<{ bays: number; days: { date: string; hours: { hour: number; booked: number }[] }[] }>("/analytics/capacity", {
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const hours = useMemo(() => {
    const set = new Set<number>();
    data?.days.forEach((d) => d.hours.forEach((h) => set.add(h.hour)));
    return Array.from(set).sort((a, b) => a - b);
  }, [data]);
  const bays = Math.max(1, data?.bays ?? 1);
  const util = data
    ? data.days.reduce((s, d) => s + d.hours.reduce((x, h) => x + h.booked, 0), 0) / Math.max(1, data.days.reduce((s, d) => s + d.hours.length, 0) * bays)
    : 0;

  return (
    <ChartCard
      className="mt-4"
      title="Bay capacity — next 14 days"
      subtitle={`${bays} bays · darker cells are fully booked; bright gaps are revenue waiting to be filled`}
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.06] px-3 py-1 text-xs text-ink-2">
          <CalendarRange className="size-3.5" /> {(util * 100).toFixed(0)}% utilized
        </span>
      }
    >
      {loading || !data ? (
        <Skeleton className="h-64" />
      ) : data.days.length === 0 || hours.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-4">Set your working hours in Settings → Booking to see capacity.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-1 text-[10px]">
            <thead>
              <tr>
                <th />
                {hours.map((h) => (
                  <th key={h} className="px-0.5 font-normal text-ink-4">
                    {h % 12 || 12}
                    {h < 12 ? "a" : "p"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.days.map((d) => {
                const byHour = new Map(d.hours.map((h) => [h.hour, h.booked]));
                return (
                  <tr key={d.date}>
                    <th className="pr-2 text-left font-normal whitespace-nowrap text-ink-3">{format(parseISO(d.date), "EEE d")}</th>
                    {hours.map((h) => {
                      const booked = byHour.get(h);
                      const ratio = booked === undefined ? -1 : booked / bays;
                      return (
                        <td key={h}>
                          <div
                            title={booked === undefined ? "Closed" : `${booked}/${bays} bays booked`}
                            className="size-7 rounded-md border border-ink/[0.05]"
                            style={{
                              background:
                                ratio < 0
                                  ? "repeating-linear-gradient(45deg, rgb(255 255 255 / 0.02) 0 3px, transparent 3px 6px)"
                                  : ratio === 0
                                    ? "rgb(34 211 238 / 0.08)"
                                    : `rgb(124 92 255 / ${0.25 + ratio * 0.7})`,
                              boxShadow: ratio >= 1 ? "0 0 10px -2px rgb(124 92 255 / 0.9)" : undefined,
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-ink-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-aqua/10" /> Open
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-iris/50" /> Partly booked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-iris" /> Full
            </span>
          </div>
        </div>
      )}
    </ChartCard>
  );
}

function Upsell({ title, body, plan }: { title: string; body: string; plan: string }) {
  return (
    <Glass className="mt-4 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-iris to-aqua">
        <Lock className="size-5 text-white" />
      </span>
      <div className="flex-1">
        <p className="font-semibold text-ink">
          {title} <span className="ml-1 rounded-full bg-iris/15 px-2 py-0.5 text-[10px] text-iris-soft">{plan}</span>
        </p>
        <p className="mt-1 text-sm text-ink-3">{body}</p>
      </div>
      <Button href="/app/settings?tab=billing" size="sm">
        <BarChart3 className="size-4" /> Upgrade to {plan}
      </Button>
      <Link href="/pricing" className="sr-only">
        Compare plans
      </Link>
    </Glass>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  BrainCircuit,
  Route,
  CalendarCheck2,
  CheckCircle2,
  Circle,
  DollarSign,
  Gauge,
  Link2,
  Percent,
  Receipt,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useApi } from "@/lib/hooks/use-api";
import type { ActivityLog, AnalyticsOverview, Insights, Job, Paginated } from "@/lib/types";
import { customerName, stageMeta, vehicleLabel } from "@/lib/domain";
import { cn, formatMoney, formatPercent, formatTime, relativeTime } from "@/lib/utils";
import { Avatar, Badge, Button, EmptyState, Glass, Segmented, Skeleton } from "@/components/spatial";
import { useAuth } from "@/components/app/auth-provider";
import { StatCard, StageBadge } from "@/components/app/ui";
import { RevenueAreaChart } from "@/components/app/charts";
import { JobCreateModal } from "@/components/app/job-create-modal";

type Range = "7d" | "30d" | "90d";

function greeting(h: number) {
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, shop, can } = useAuth();
  const [range, setRange] = useState<Range>("30d");
  const [creating, setCreating] = useState(false);
  const [today] = useState(() => {
    const s = new Date();
    s.setHours(0, 0, 0, 0);
    const e = new Date(s);
    e.setDate(e.getDate() + 1);
    return { from: s.toISOString(), to: e.toISOString(), hour: new Date().getHours() };
  });

  const { data: overview, loading } = useApi<AnalyticsOverview>("/analytics/overview", { range });
  const { data: todays } = useApi<Paginated<Job>>("/jobs", { from: today.from, to: today.to, pageSize: 50, sort: "scheduledStart" });
  const { data: activityRaw } = useApi<ActivityLog[] | Paginated<ActivityLog>>("/activity", { limit: 12 });
  const activity = Array.isArray(activityRaw) ? activityRaw : (activityRaw?.items ?? []);

  const todayJobs = useMemo(
    () =>
      (todays?.items ?? [])
        .filter((j) => j.stage !== "cancelled")
        .sort((a, b) => new Date(a.scheduledStart ?? 0).getTime() - new Date(b.scheduledStart ?? 0).getTime()),
    [todays],
  );

  const mobileToday = todayJobs.filter((j) => j.mobile && j.stage !== "completed");
  const k = overview?.kpis;
  const firstName = user.name.split(" ")[0];
  const bookingUrl = typeof window !== "undefined" ? `${window.location.origin}/book/${shop.slug}` : `/book/${shop.slug}`;

  return (
    <div className="space-y-5">
      {/* Hero greeting */}
      <Glass tier={2} rim className="relative overflow-hidden rounded-[28px] p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-iris/30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 size-72 rounded-full bg-aqua/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-ink-3">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · {shop.name}
            </p>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              {greeting(today.hour)}, <span className="text-spectral">{firstName}</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-ink-2">
              {todayJobs.length
                ? `${todayJobs.length} job${todayJobs.length === 1 ? "" : "s"} on the books today${
                    k ? ` · ${formatMoney(k.outstanding, "USD", true)} outstanding` : ""
                  }.`
                : "No jobs scheduled today — a perfect moment to send a few quotes."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href="/app/quotes/new">
              <Sparkles className="size-4" /> AI quote
            </Button>
            <Button variant="secondary" onClick={() => setCreating(true)}>
              <Wrench className="size-4" /> New job
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(bookingUrl);
                  toast.success("Booking link copied");
                } catch {
                  toast.error("Couldn't copy — your browser blocked clipboard access");
                }
              }}
            >
              <Link2 className="size-4" /> Booking link
            </Button>
          </div>
        </div>
      </Glass>

      <Onboarding />

      {(can("ai_insights") || mobileToday.length > 0) && (
        <div className={cn("grid gap-5", can("ai_insights") && mobileToday.length > 0 && "xl:grid-cols-[1.6fr_1fr]")}>
          {can("ai_insights") && <InsightsCard />}
          {mobileToday.length > 0 && <RouteCard jobs={mobileToday} />}
        </div>
      )}

      {/* KPIs */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-medium text-ink-2">Performance</h2>
        <Segmented
          size="sm"
          value={range}
          onChange={setRange}
          options={[
            { value: "7d", label: "7D" },
            { value: "30d", label: "30D" },
            { value: "90d", label: "90D" },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {loading || !k ? (
          Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[124px] rounded-[22px]" />)
        ) : (
          <>
            <StatCard label="Revenue" value={formatMoney(k.revenue, "USD", true)} change={k.revenueChange} icon={<DollarSign className="size-4" />} hint="vs prior period" />
            <StatCard label="Jobs completed" value={k.jobsCompleted} change={k.jobsChange} icon={<CalendarCheck2 className="size-4" />} />
            <StatCard label="Average ticket" value={formatMoney(k.avgTicket, "USD", true)} icon={<Gauge className="size-4" />} />
            <StatCard label="Quote conversion" value={formatPercent(k.conversionRate)} icon={<Percent className="size-4" />} />
            <StatCard
              label="Outstanding"
              value={formatMoney(k.outstanding, "USD", true)}
              icon={<Receipt className="size-4" />}
              hint={<Link href="/app/invoices?status=sent,partial,overdue" className="hover:text-ink">View invoices →</Link>}
              className="col-span-2 lg:col-span-1"
            />
          </>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Glass className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Revenue</h2>
              <p className="text-xs text-ink-4">Payments collected per day</p>
            </div>
            {k && <span className="text-xl font-semibold tabular-nums">{formatMoney(k.revenue)}</span>}
          </div>
          {overview ? <RevenueAreaChart data={overview.revenueSeries} /> : <Skeleton className="h-[260px]" />}
        </Glass>

        <Glass className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pipeline</h2>
            <Link href="/app/board" className="text-xs text-aqua-soft hover:text-white">
              Open board →
            </Link>
          </div>
          <Pipeline pipeline={overview?.pipeline} />
        </Glass>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Glass className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Today</h2>
            <Link href="/app/calendar" className="text-xs text-aqua-soft hover:text-white">
              Calendar →
            </Link>
          </div>
          {!todays ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : todayJobs.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck2 className="size-7" />}
              title="Nothing scheduled today"
              description="Share your booking link or schedule a job from the calendar."
              action={
                <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
                  Schedule a job
                </Button>
              }
              className="py-8"
            />
          ) : (
            <ol className="relative space-y-2 before:absolute before:top-2 before:bottom-2 before:left-[54px] before:w-px before:bg-white/[0.08]">
              {todayJobs.map((j) => (
                <li key={j._id}>
                  <Link href={`/app/jobs/${j._id}`} className="group flex items-center gap-4 rounded-2xl p-2 transition hover:bg-white/[0.05]">
                    <span className="w-10 shrink-0 text-right text-xs text-ink-3 tabular-nums">{formatTime(j.scheduledStart)}</span>
                    <span
                      className="relative z-10 size-2.5 shrink-0 rounded-full ring-4 ring-[#0b0e1c]"
                      style={{ background: stageMeta[j.stage].color, boxShadow: `0 0 12px ${stageMeta[j.stage].color}` }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink group-hover:text-aqua-soft">
                        <span className="mr-1.5 font-mono text-[11px] text-ink-4">#{j.number}</span>
                        {j.title}
                      </span>
                      <span className="block truncate text-xs text-ink-4">
                        {customerName(j.customer)} · {vehicleLabel(j.vehicle)}
                        {j.bay ? ` · Bay ${j.bay}` : ""}
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <StageBadge stage={j.stage} />
                    </span>
                    <span className="w-16 text-right text-sm font-medium tabular-nums">{formatMoney(j.totals?.total, "USD", true)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Glass>

        <Glass className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Recent activity</h2>
          {!activityRaw ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-4">Activity from your team shows up here in real time.</p>
          ) : (
            <ul className="space-y-3.5">
              {activity.map((a) => (
                <li key={a._id} className="flex gap-3">
                  <Avatar name={a.actor?.name ?? "Lustra"} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-ink-2">{a.summary}</p>
                    <p className="mt-0.5 text-[11px] text-ink-4">
                      {a.actor?.name ?? "Automation"} · {relativeTime(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Glass>
      </div>

      <JobCreateModal open={creating} onClose={() => setCreating(false)} onCreated={(j) => router.push(`/app/jobs/${j._id}`)} />
    </div>
  );
}

function Pipeline({ pipeline }: { pipeline?: AnalyticsOverview["pipeline"] }) {
  if (!pipeline) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    );
  }
  const rows = pipeline.filter((p) => p.stage !== "cancelled");
  const max = Math.max(1, ...rows.map((p) => p.value));
  return (
    <ul className="space-y-3.5">
      {rows.map((p) => (
        <li key={p.stage}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-ink-2">
              <span className="size-2 rounded-full" style={{ background: stageMeta[p.stage]?.color }} />
              {stageMeta[p.stage]?.label ?? p.stage}
              <span className="text-ink-4">{p.count}</span>
            </span>
            <span className="font-medium text-ink tabular-nums">{formatMoney(p.value, "USD", true)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${Math.max(3, (p.value / max) * 100)}%`,
                background: `linear-gradient(90deg, ${stageMeta[p.stage]?.color}88, ${stageMeta[p.stage]?.color})`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Onboarding() {
  const { shop, isManager } = useAuth();
  const done = new Set(shop.onboarding?.completedSteps ?? []);
  if (shop.booking?.enabled) done.add("booking");
  const steps = [
    { key: "services", label: "Add your services & prices", href: "/app/settings?tab=services" },
    { key: "booking", label: "Turn on online booking", href: "/app/settings?tab=booking" },
    { key: "team", label: "Invite your team", href: "/app/settings?tab=team" },
    { key: "payments", label: "Connect payments", href: "/app/settings?tab=billing" },
  ];
  const remaining = steps.filter((s) => !done.has(s.key)).length;
  if (!isManager || remaining === 0) return null;
  const pct = ((steps.length - remaining) / steps.length) * 100;
  return (
    <Glass className="p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="md:w-64">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Finish setting up</h2>
            <Badge tone="iris">{steps.length - remaining}/{steps.length}</Badge>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gradient-to-r from-iris to-aqua" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <ul className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => {
            const ok = done.has(s.key);
            return (
              <li key={s.key}>
                <Link
                  href={s.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-sm transition",
                    ok ? "border-success/20 bg-success/[0.06] text-ink-3 line-through" : "border-white/[0.08] bg-white/[0.03] text-ink-2 hover:border-aqua/40 hover:text-ink",
                  )}
                >
                  {ok ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <Circle className="size-4 shrink-0 text-ink-4" />}
                  <span className="flex-1">{s.label}</span>
                  {!ok && <ArrowRight className="size-3.5 text-ink-4" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </Glass>
  );
}

function InsightsCard() {
  const { data, loading } = useApi<Insights>("/insights");
  const score = Math.round(data?.health.score ?? 0);
  const tone = score >= 75 ? "#34d399" : score >= 50 ? "#22d3ee" : "#fbbf24";
  const r = 30;
  const circ = 2 * Math.PI * r;
  const top = [...(data?.opportunities ?? [])].sort((a, b) => b.impact - a.impact).slice(0, 2);
  return (
    <Glass rim className="relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -top-20 -right-10 size-48 rounded-full bg-iris/20 blur-3xl" aria-hidden />
      <div className="relative mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <BrainCircuit className="size-4 text-iris-soft" /> AI Insights
        </h2>
        <Link href="/app/insights" className="text-xs text-aqua-soft hover:text-white">
          All insights →
        </Link>
      </div>
      {loading || !data ? (
        <div className="flex gap-4">
          <Skeleton className="size-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 sm:flex-col sm:gap-1">
            <svg width="80" height="80" viewBox="0 0 80 80" role="img" aria-label={`Business health ${score} out of 100`}>
              <circle cx="40" cy="40" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="7" />
              <circle
                cx="40"
                cy="40"
                r={r}
                fill="none"
                stroke={tone}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - score / 100)}
                transform="rotate(-90 40 40)"
                style={{ filter: `drop-shadow(0 0 6px ${tone})`, transition: "stroke-dashoffset 1s ease" }}
              />
              <text x="40" y="46" textAnchor="middle" className="fill-ink text-[18px] font-semibold">
                {score}
              </text>
            </svg>
            <span className="text-[11px] text-ink-4">Health score</span>
          </div>
          <ul className="min-w-0 flex-1 space-y-2">
            {top.length === 0 && <li className="text-sm text-ink-4">No open opportunities — nice and tidy.</li>}
            {top.map((o) => (
              <li key={o.id}>
                <Link href={o.action.href} className="group flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3.5 py-2.5 transition hover:bg-white/[0.08]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{o.title}</span>
                    <span className="block truncate text-[11px] text-ink-4">{o.description}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold text-success tabular-nums">+{formatMoney(o.impact, "USD", true)}</span>
                    <span className="text-[10px] text-ink-4 group-hover:text-aqua-soft">{o.action.label} →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Glass>
  );
}

function RouteCard({ jobs }: { jobs: Job[] }) {
  const ordered = [...jobs].sort((a, b) => (a.routeOrder ?? 99) - (b.routeOrder ?? 99) || new Date(a.scheduledStart ?? 0).getTime() - new Date(b.scheduledStart ?? 0).getTime());
  return (
    <Glass className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Route className="size-4 text-aqua-soft" /> Today&apos;s route
        </h2>
        <Link href="/app/routes" className="text-xs text-aqua-soft hover:text-white">
          Optimize →
        </Link>
      </div>
      <ol className="relative space-y-2.5 before:absolute before:top-3 before:bottom-3 before:left-[11px] before:w-px before:border-l before:border-dashed before:border-white/15">
        {ordered.slice(0, 4).map((j, i) => (
          <li key={j._id}>
            <Link href={`/app/jobs/${j._id}`} className="relative flex items-center gap-3 rounded-xl py-0.5 hover:text-aqua-soft">
              <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-iris to-aqua text-[10px] font-bold text-white">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{customerName(j.customer)}</span>
                <span className="block truncate text-[11px] text-ink-4">{j.serviceAddress || "Address missing"}</span>
              </span>
              <span className="text-xs text-ink-3 tabular-nums">{formatTime(j.eta ?? j.scheduledStart)}</span>
            </Link>
          </li>
        ))}
      </ol>
      {ordered.length > 4 && <p className="mt-3 text-xs text-ink-4">+{ordered.length - 4} more stops</p>}
    </Glass>
  );
}

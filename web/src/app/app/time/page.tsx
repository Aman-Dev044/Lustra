"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, endOfWeek, format, isSameDay, startOfWeek, subWeeks } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight, Clock, Coffee, Play, Square, Wrench } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Job, Paginated, TimeEntry, User } from "@/lib/types";
import { cn, formatDuration, formatMoney, formatTime } from "@/lib/utils";
import { Button, Field, Glass, Input, Modal, Select, Skeleton } from "@/components/spatial";
import { PageHeader, Table, Td, Th } from "@/components/app/ui";
import { useAuth } from "@/components/app/auth-provider";
import { GlassTooltip, axisProps, gridProps } from "@/components/app/ops-charts";

const listOf = <T,>(d: T[] | Paginated<T> | undefined) => (Array.isArray(d) ? d : (d?.items ?? []));

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

const hms = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");
};

export default function TimeClockPage() {
  const { user, isManager } = useAuth();
  const { data: status, refresh } = useApi<{ active: TimeEntry | null }>("/time/status");
  const active = status?.active ?? null;
  const now = useNow(!!active);
  const { data: jobsData } = useApi<Paginated<Job>>("/jobs", { stage: "scheduled,in_progress,quality_check", pageSize: 50 });
  const jobs = jobsData?.items ?? [];
  const [jobId, setJobId] = useState("");
  const [busy, setBusy] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [tips, setTips] = useState("");
  const [note, setNote] = useState("");

  const { data: team } = useApi<User[]>(isManager ? "/team" : null);
  const [viewUser, setViewUser] = useState(user._id);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), [weekOffset]);
  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const { data: entriesData, loading } = useApi<Paginated<TimeEntry> | TimeEntry[]>("/time", {
    user: viewUser,
    from: weekStart.toISOString(),
    to: weekEnd.toISOString(),
    pageSize: 200,
  });
  const entries = useMemo(
    () => listOf(entriesData).sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()),
    [entriesData],
  );

  const entryMinutes = (e: TimeEntry) => (e.clockOut ? e.minutes : (now - new Date(e.clockIn).getTime()) / 60000);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const chart = days.map((d) => ({
    day: format(d, "EEE"),
    hours: Math.round((entries.filter((e) => isSameDay(new Date(e.clockIn), d)).reduce((s, e) => s + entryMinutes(e), 0) / 60) * 10) / 10,
  }));
  const weekMinutes = entries.reduce((s, e) => s + entryMinutes(e), 0);
  const weekTips = entries.reduce((s, e) => s + (e.tips ?? 0), 0);
  const viewed = team?.find((u) => u._id === viewUser) ?? user;

  async function clockIn() {
    setBusy(true);
    try {
      await api.post("/time/clock-in", jobId ? { job: jobId } : {});
      toast.success("Clocked in — have a great shift");
      invalidate("/time");
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function clockOut() {
    setBusy(true);
    try {
      await api.post("/time/clock-out", { tips: Number(tips) || 0, note: note || undefined });
      toast.success("Clocked out");
      setClockingOut(false);
      setTips("");
      setNote("");
      invalidate("/time", "/earnings");
      await refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const activeJob = active?.job && typeof active.job === "object" ? (active.job as Job) : jobs.find((j) => j._id === active?.job);

  return (
    <>
      <PageHeader title="Time clock" description="Clock in from any device. Hours, tips and job time flow straight into payroll." />

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Glass tier={2} rim className="flex flex-col items-center p-8 text-center">
          <p className="text-xs font-medium tracking-[0.18em] text-ink-3 uppercase">{format(now, "EEEE, MMM d")}</p>
          <div className="relative my-8">
            {active && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-success/30" aria-hidden />}
            <button
              onClick={() => (active ? setClockingOut(true) : void clockIn())}
              disabled={busy}
              className={cn(
                "relative flex size-48 flex-col items-center justify-center rounded-full border transition-all duration-500 active:scale-95 disabled:opacity-60",
                active
                  ? "border-success/40 bg-[radial-gradient(circle_at_30%_25%,rgb(52_211_153/0.35),rgb(11_14_28/0.9)_70%)] shadow-[0_0_80px_-10px_rgb(52_211_153/0.6),inset_0_1px_0_rgb(255_255_255/0.2)]"
                  : "border-ink/15 bg-[radial-gradient(circle_at_30%_25%,rgb(124_92_255/0.45),rgb(11_14_28/0.9)_70%)] shadow-[0_0_80px_-10px_rgb(124_92_255/0.6),inset_0_1px_0_rgb(255_255_255/0.2)] hover:scale-[1.03]",
              )}
              aria-label={active ? "Clock out" : "Clock in"}
            >
              {active ? <Square className="mb-2 size-7 fill-success text-success" /> : <Play className="mb-2 size-8 fill-white text-white" />}
              <span className="text-lg font-semibold text-ink">{active ? "Clock out" : "Clock in"}</span>
            </button>
          </div>
          {active ? (
            <>
              <p className="font-mono text-4xl font-semibold tracking-tight text-ink tabular-nums">{hms(now - new Date(active.clockIn).getTime())}</p>
              <p className="mt-2 text-sm text-ink-3">
                On the clock since {formatTime(active.clockIn)}
                {activeJob && (
                  <>
                    {" "}
                    · <Wrench className="inline size-3.5" /> #{activeJob.number} {activeJob.title}
                  </>
                )}
              </p>
            </>
          ) : (
            <div className="w-full max-w-xs">
              <Field label="Working on a job? (optional)">
                <Select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                  <option value="">General shop time</option>
                  {jobs.map((j) => (
                    <option key={j._id} value={j._id}>
                      #{j.number} · {j.title}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
        </Glass>

        <div className="space-y-4">
          <Glass className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">
                  {viewed._id === user._id ? "My week" : `${viewed.name}'s week`}
                </h2>
                <p className="text-xs text-ink-4">
                  {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isManager && team && (
                  <Select value={viewUser} onChange={(e) => setViewUser(e.target.value)} className="h-9 w-44 rounded-full text-xs" aria-label="Teammate">
                    {team.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                )}
                <div className="glass-inset flex items-center rounded-full">
                  <button onClick={() => setWeekOffset((w) => w + 1)} className="rounded-full p-2 text-ink-3 hover:text-ink" aria-label="Previous week">
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                    disabled={weekOffset === 0}
                    className="rounded-full p-2 text-ink-3 hover:text-ink disabled:opacity-30"
                    aria-label="Next week"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-ink/[0.04] p-3">
                <p className="text-[11px] text-ink-4">Hours</p>
                <p className="text-xl font-semibold tabular-nums">{(weekMinutes / 60).toFixed(1)}</p>
              </div>
              <div className="rounded-2xl bg-ink/[0.04] p-3">
                <p className="text-[11px] text-ink-4">Est. wages</p>
                <p className="text-xl font-semibold tabular-nums">{formatMoney((weekMinutes / 60) * (viewed.hourlyRate ?? 0))}</p>
              </div>
              <div className="rounded-2xl bg-ink/[0.04] p-3">
                <p className="text-[11px] text-ink-4">Tips</p>
                <p className="text-xl font-semibold tabular-nums">{formatMoney(weekTips)}</p>
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hoursBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#22d3ee" />
                      <stop offset="1" stopColor="#7c5cff" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="day" {...axisProps} />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "rgb(30 42 68 / 0.04)" }} content={<GlassTooltip formatter={(v) => `${v} h`} />} />
                  <Bar dataKey="hours" name="Hours" fill="url(#hoursBar)" radius={[8, 8, 3, 3]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Glass>

          <Glass className="overflow-hidden">
            <div className="border-b border-ink/[0.07] px-5 py-3">
              <h2 className="text-sm font-semibold">Entries</h2>
            </div>
            {loading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : entries.length === 0 ? (
              <p className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-ink-4">
                <Coffee className="size-4" /> No time recorded this week.
              </p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Day</Th>
                    <Th>In</Th>
                    <Th>Out</Th>
                    <Th>Job</Th>
                    <Th className="text-right">Tips</Th>
                    <Th className="text-right">Duration</Th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => {
                    const job = e.job && typeof e.job === "object" ? (e.job as Job) : null;
                    return (
                      <tr key={e._id} className="hover:bg-ink/[0.03]">
                        <Td className="text-ink">{format(new Date(e.clockIn), "EEE, MMM d")}</Td>
                        <Td className="tabular-nums">{formatTime(e.clockIn)}</Td>
                        <Td className="tabular-nums">
                          {e.clockOut ? (
                            formatTime(e.clockOut)
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-success">
                              <Clock className="size-3.5" /> Active
                            </span>
                          )}
                        </Td>
                        <Td>{job ? `#${job.number} ${job.title}` : <span className="text-ink-4">{e.note || "General"}</span>}</Td>
                        <Td className="text-right tabular-nums">{e.tips ? formatMoney(e.tips) : "—"}</Td>
                        <Td className="text-right font-medium text-ink tabular-nums">{formatDuration(entryMinutes(e))}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Glass>
        </div>
      </div>

      <Modal
        open={clockingOut}
        onClose={() => setClockingOut(false)}
        title="Clock out"
        description={active ? `You worked ${formatDuration((now - new Date(active.clockIn).getTime()) / 60000)} this shift.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setClockingOut(false)}>
              Keep working
            </Button>
            <Button onClick={clockOut} loading={busy}>
              <Square className="size-3.5 fill-current" /> Clock out
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Cash tips received ($)">
            <Input type="number" min={0} step="0.01" value={tips} onChange={(e) => setTips(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Shift note (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Finished correction stage 2 on the M3" />
          </Field>
        </div>
      </Modal>
    </>
  );
}

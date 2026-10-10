"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, ChevronLeft, ChevronRight, Plus, Repeat } from "lucide-react";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { CalendarBlock, Job, Paginated } from "@/lib/types";
import { customerName, stageMeta, vehicleLabel } from "@/lib/domain";
import { cn, formatTime } from "@/lib/utils";
import { Button, Glass, Segmented, Skeleton } from "@/components/spatial";
import { useAuth } from "@/components/app/auth-provider";
import { PageHeader } from "@/components/app/ui";
import { JobCreateModal, type JobDraftDefaults } from "@/components/app/job-create-modal";
import { BlockModal, SlotChooser, blockMeta, blockUserName, hatchStyle, type BlockDraft } from "@/components/app/calendar-blocks";

type View = "day" | "week" | "month";
type Capacity = { bays: number; days: { date: string; hours: { hour: number; booked: number }[] }[] };

const HOUR_START = 7;
const HOUR_END = 20;
const HOUR_H = 56;
const SNAP = 15;
const GRID_H = (HOUR_END - HOUR_START) * HOUR_H;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

/** Minutes since HOUR_START for a date, clamped to the visible grid. */
const gridMinutes = (d: Date) => (d.getHours() - HOUR_START) * 60 + d.getMinutes();
const jobStart = (j: Job) => new Date(j.scheduledStart!);
const jobEnd = (j: Job) => (j.scheduledEnd ? new Date(j.scheduledEnd) : new Date(jobStart(j).getTime() + 60 * 60000));

type Override = { id: string; start: Date; end: Date; bay?: number };

/** Portion of a block that falls inside one day's visible grid (null when it doesn't touch that day). */
function blockSegment(b: CalendarBlock, day: Date) {
  const dayStart = new Date(day);
  dayStart.setHours(HOUR_START, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(HOUR_END, 0, 0, 0);
  const s = new Date(Math.max(new Date(b.start).getTime(), dayStart.getTime()));
  const e = new Date(Math.min(new Date(b.end).getTime(), dayEnd.getTime()));
  if (b.allDay) {
    const bs = startOfDay(new Date(b.start)).getTime();
    const be = new Date(b.end).getTime();
    return day.getTime() >= bs && startOfDay(day).getTime() < be ? { start: dayStart, end: dayEnd } : null;
  }
  return e > s ? { start: s, end: e } : null;
}

const blockTouchesDay = (b: CalendarBlock, day: Date) => {
  const ds = startOfDay(day).getTime();
  return new Date(b.start).getTime() < ds + 86400000 && new Date(b.end).getTime() > ds;
};

export default function CalendarPage() {
  const router = useRouter();
  const { shop, can } = useAuth();
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [draft, setDraft] = useState<JobDraftDefaults | null>(null);
  const [override, setOverride] = useState<Override | null>(null);
  const [blockDraft, setBlockDraft] = useState<BlockDraft | null>(null);
  const [slot, setSlot] = useState<{ at: Date; bay?: number } | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const range = useMemo(() => {
    if (view === "day") return { from: anchor, to: addDays(anchor, 1) };
    if (view === "week") {
      const s = startOfWeek(anchor, { weekStartsOn: 1 });
      return { from: s, to: addDays(s, 7) };
    }
    const s = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
    return { from: s, to: addDays(endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }), 1) };
  }, [view, anchor]);

  const { data, loading, mutate } = useApi<Paginated<Job>>("/jobs", {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    pageSize: 200,
  });
  const showCapacity = can("capacity_planner") && view !== "month";
  const { data: capacity } = useApi<Capacity>(showCapacity ? "/analytics/capacity" : null, {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });

  const { data: blocksRaw } = useApi<CalendarBlock[] | Paginated<CalendarBlock>>("/calendar/blocks", {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });
  const blocks = useMemo(() => (Array.isArray(blocksRaw) ? blocksRaw : (blocksRaw?.items ?? [])), [blocksRaw]);

  const jobs = useMemo(
    () => (data?.items ?? []).filter((j) => j.scheduledStart && j.stage !== "cancelled"),
    [data],
  );
  const bays = Math.max(1, shop.booking?.bays ?? 2);
  const days = view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(range.from, i)) : [anchor];

  const shift = (dir: 1 | -1) =>
    setAnchor((a) => (view === "day" ? addDays(a, dir) : view === "week" ? addWeeks(a, dir) : addMonths(a, dir)));

  const title =
    view === "day"
      ? format(anchor, "EEEE, MMMM d")
      : view === "week"
        ? `${format(range.from, "MMM d")} – ${format(addDays(range.from, 6), "MMM d, yyyy")}`
        : format(anchor, "MMMM yyyy");

  async function commit(o: Override) {
    const job = jobs.find((j) => j._id === o.id);
    if (!job) return;
    const body: Record<string, unknown> = { scheduledStart: o.start.toISOString(), scheduledEnd: o.end.toISOString() };
    if (o.bay) body.bay = o.bay;
    const prev = data;
    mutate((p) =>
      p ? { ...p, items: p.items.map((j) => (j._id === o.id ? { ...j, scheduledStart: o.start.toISOString(), scheduledEnd: o.end.toISOString(), bay: o.bay ?? j.bay } : j)) } : p,
    );
    setOverride(null);
    try {
      await api.patch(`/jobs/${o.id}`, body);
      toast.success(`#${job.number} moved to ${format(o.start, "EEE h:mm a")}${o.bay ? ` · Bay ${o.bay}` : ""}`);
      invalidate("/jobs", "/analytics");
    } catch (e) {
      if (prev) mutate(prev);
      toast.error(errorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Drag to reschedule, pull the bottom edge to resize, click an empty slot to book — hold Alt and drag to block time."
        actions={
          <>
            <Button variant="secondary" onClick={() => setBlockDraft({ start: nextHalfHour(), end: new Date(nextHalfHour().getTime() + 3600000) })}>
              <CalendarPlus className="size-4" /> Block time
            </Button>
            <Button onClick={() => setDraft({ start: null })}>
              <Plus className="size-4" /> New job
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setAnchor(startOfDay(new Date()))}>
            Today
          </Button>
          <div className="glass flex items-center rounded-full">
            <button onClick={() => shift(-1)} className="rounded-full p-2 text-ink-2 hover:bg-white/10 hover:text-ink" aria-label="Previous">
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={() => shift(1)} className="rounded-full p-2 text-ink-2 hover:bg-white/10 hover:text-ink" aria-label="Next">
              <ChevronRight className="size-4" />
            </button>
          </div>
          <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
        </div>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
        />
      </div>

      {loading && !data ? (
        <Skeleton className="h-[70vh] rounded-[24px]" />
      ) : view === "month" ? (
        <MonthGrid
          from={range.from}
          anchor={anchor}
          jobs={jobs}
          blocks={blocks}
          onBlock={(b) => setBlockDraft({ block: b })}
          onDay={(d) => {
            setAnchor(d);
            setView("day");
          }}
          onJob={(j) => router.push(`/app/jobs/${j._id}`)}
        />
      ) : (
        <Glass className="overflow-hidden rounded-[24px]">
          <div className="overflow-x-auto">
            <div className={cn(view === "week" ? "min-w-[860px]" : bays > 3 ? "min-w-[720px]" : "")}>
              {/* Column headers */}
              <div className="flex border-b border-white/[0.07]">
                <div className="w-14 shrink-0" />
                {view === "week"
                  ? days.map((d) => (
                      <div key={d.toISOString()} className="flex-1 border-l border-white/[0.05] px-2 py-2.5 text-center">
                        <button onClick={() => { setAnchor(d); setView("day"); }} className="group">
                          <span className="block text-[11px] tracking-wider text-ink-4 uppercase">{format(d, "EEE")}</span>
                          <span
                            className={cn(
                              "mt-0.5 inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold group-hover:bg-white/10",
                              isSameDay(d, now) && "bg-spectral text-white shadow-[var(--shadow-glow-iris)]",
                            )}
                          >
                            {format(d, "d")}
                          </span>
                        </button>
                        {capacity && <CapacityStrip day={capacity.days.find((c) => isSameDay(parseISO(c.date), d))} bays={capacity.bays} />}
                      </div>
                    ))
                  : Array.from({ length: bays }, (_, b) => (
                      <div key={b} className="flex-1 border-l border-white/[0.05] px-2 py-3 text-center text-xs font-medium text-ink-2">
                        Bay {b + 1}
                        {b === 0 && capacity && <CapacityStrip day={capacity.days.find((c) => isSameDay(parseISO(c.date), anchor))} bays={capacity.bays} />}
                      </div>
                    ))}
              </div>

              {/* Time grid */}
              <div className="relative flex max-h-[calc(100dvh-300px)] min-h-[420px] overflow-y-auto">
                <div className="w-14 shrink-0">
                  {HOURS.map((h) => (
                    <div key={h} style={{ height: HOUR_H }} className="relative">
                      <span className="absolute -top-2 right-2 text-[10px] text-ink-4 tabular-nums">
                        {format(new Date(2000, 0, 1, h), "h a")}
                      </span>
                    </div>
                  ))}
                </div>
                <TimeColumns
                  columns={
                    view === "week"
                      ? days.map((d) => ({ key: d.toISOString(), day: d, bay: undefined as number | undefined }))
                      : Array.from({ length: bays }, (_, b) => ({ key: `bay-${b}`, day: anchor, bay: b + 1 }))
                  }
                  jobs={jobs}
                  view={view}
                  now={now}
                  override={override}
                  setOverride={setOverride}
                  onCommit={commit}
                  onOpen={(j) => router.push(`/app/jobs/${j._id}`)}
                  blocks={blocks}
                  onBlock={(b) => setBlockDraft({ block: b })}
                  onRange={(start, end, bay) => setBlockDraft({ start, end, bay })}
                  onSlot={(start, bay) => setSlot({ at: start, bay })}
                />
              </div>
            </div>
          </div>
        </Glass>
      )}

      <SlotChooser
        at={slot?.at ?? null}
        onClose={() => setSlot(null)}
        onJob={() => {
          if (!slot) return;
          setDraft({ start: slot.at, end: new Date(slot.at.getTime() + 2 * 3600000), bay: slot.bay });
          setSlot(null);
        }}
        onBlock={(kind) => {
          if (!slot) return;
          setBlockDraft({ start: slot.at, end: new Date(slot.at.getTime() + 3600000), bay: slot.bay, kind });
          setSlot(null);
        }}
      />
      <BlockModal draft={blockDraft} onClose={() => setBlockDraft(null)} />

      <JobCreateModal
        open={!!draft}
        onClose={() => setDraft(null)}
        defaults={draft ?? undefined}
        onCreated={() => invalidate("/jobs")}
      />
    </div>
  );
}

function CapacityStrip({ day, bays }: { day?: Capacity["days"][number]; bays: number }) {
  if (!day) return <div className="mt-2 h-1.5" />;
  const hours = day.hours.filter((h) => h.hour >= HOUR_START && h.hour < HOUR_END);
  const peak = Math.max(0, ...hours.map((h) => h.booked));
  return (
    <div className="mt-2 flex h-1.5 gap-px overflow-hidden rounded-full" title={`Peak ${peak}/${bays} bays booked`}>
      {hours.map((h) => {
        const r = bays ? h.booked / bays : 0;
        return (
          <span
            key={h.hour}
            className="flex-1"
            style={{
              background: r === 0 ? "rgb(255 255 255 / 0.06)" : r >= 1 ? "#fb7185" : r >= 0.6 ? "#fbbf24" : "#22d3ee",
              opacity: r === 0 ? 1 : 0.4 + r * 0.6,
            }}
          />
        );
      })}
    </div>
  );
}

function TimeColumns({
  columns,
  jobs,
  view,
  now,
  override,
  setOverride,
  onCommit,
  onOpen,
  onSlot,
  blocks,
  onBlock,
  onRange,
}: {
  blocks: CalendarBlock[];
  onBlock: (b: CalendarBlock) => void;
  onRange: (start: Date, end: Date, bay?: number) => void;
  columns: { key: string; day: Date; bay?: number }[];
  jobs: Job[];
  view: View;
  now: Date;
  override: Override | null;
  setOverride: (o: Override | null) => void;
  onCommit: (o: Override) => void;
  onOpen: (j: Job) => void;
  onSlot: (start: Date, bay?: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    job: Job;
    mode: "move" | "resize";
    x0: number;
    y0: number;
    start: Date;
    end: Date;
    colIndex: number;
    moved: boolean;
  } | null>(null);

  // Alt/Option-drag on empty grid space sweeps out a range to block.
  const sel = useRef<{ col: number; from: number; to: number } | null>(null);
  const suppressClick = useRef(false);
  const [ghost, setGhost] = useState<{ col: number; from: number; to: number } | null>(null);
  const minutesAt = (clientY: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const m = Math.round((((clientY - rect.top) / HOUR_H) * 60) / SNAP) * SNAP;
    return Math.max(0, Math.min((HOUR_END - HOUR_START) * 60, m));
  };
  const atMinutes = (day: Date, m: number) => {
    const d = new Date(day);
    d.setHours(HOUR_START, 0, 0, 0);
    return new Date(d.getTime() + m * 60000);
  };

  const colIndexFor = (j: Job) =>
    view === "week"
      ? columns.findIndex((c) => isSameDay(c.day, jobStart(j)))
      : Math.min(columns.length, Math.max(1, j.bay ?? 1)) - 1;

  function begin(e: React.PointerEvent, job: Job, mode: "move" | "resize") {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { job, mode, x0: e.clientX, y0: e.clientY, start: jobStart(job), end: jobEnd(job), colIndex: colIndexFor(job), moved: false };
  }

  function move(e: React.PointerEvent) {
    if (sel.current && ref.current) {
      sel.current.to = minutesAt(e.clientY);
      setGhost({ ...sel.current });
      return;
    }
    const d = drag.current;
    if (!d || !ref.current) return;
    const dy = e.clientY - d.y0;
    const dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dy) < 4 && Math.abs(dx) < 4) return;
    d.moved = true;
    const deltaMin = Math.round(((dy / HOUR_H) * 60) / SNAP) * SNAP;
    if (d.mode === "resize") {
      const end = new Date(Math.max(d.start.getTime() + SNAP * 60000, d.end.getTime() + deltaMin * 60000));
      setOverride({ id: d.job._id, start: d.start, end });
      return;
    }
    const colW = ref.current.getBoundingClientRect().width / columns.length;
    const colShift = Math.round(dx / colW);
    const targetCol = Math.min(columns.length - 1, Math.max(0, d.colIndex + colShift));
    const dayShift = view === "week" ? differenceInCalendarDays(columns[targetCol]!.day, columns[d.colIndex]!.day) : 0;
    const ms = deltaMin * 60000 + dayShift * 86400000;
    setOverride({
      id: d.job._id,
      start: new Date(d.start.getTime() + ms),
      end: new Date(d.end.getTime() + ms),
      bay: view === "day" ? columns[targetCol]!.bay : undefined,
    });
  }

  function end() {
    if (sel.current) {
      const { col, from, to } = sel.current;
      sel.current = null;
      setGhost(null);
      const a = Math.min(from, to);
      const b = Math.max(from, to);
      if (b - a >= SNAP) {
        suppressClick.current = true;
        const c = columns[col]!;
        onRange(atMinutes(c.day, a), atMinutes(c.day, b), c.bay);
      }
      return;
    }
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      setOverride(null);
      onOpen(d.job);
      return;
    }
    if (override && override.id === d.job._id) onCommit(override);
  }

  return (
    <div ref={ref} className="relative flex flex-1" style={{ height: GRID_H }} onPointerMove={move} onPointerUp={end} onPointerCancel={() => { drag.current = null; setOverride(null); }}>
      {columns.map((col, ci) => {
        const colBlocks = blocks
          .filter((b) => (view === "week" || !b.bay || b.bay === col.bay))
          .map((b) => ({ b, seg: blockSegment(b, col.day) }))
          .filter((x): x is { b: CalendarBlock; seg: { start: Date; end: Date } } => !!x.seg);
        const colJobs = jobs
          .map((j) => (override?.id === j._id ? { ...j, scheduledStart: override.start.toISOString(), scheduledEnd: override.end.toISOString(), bay: override.bay ?? j.bay } : j))
          .filter((j) => {
            if (!isSameDay(jobStart(j), col.day)) return false;
            return view === "week" || Math.min(columns.length, Math.max(1, j.bay ?? 1)) === col.bay;
          });
        const lanes = layoutLanes(colJobs);
        const isToday = isSameDay(col.day, now);
        return (
          <div
            key={col.key}
            className={cn("relative flex-1 border-l border-white/[0.05]", isToday && view === "week" && "bg-white/[0.015]")}
            onPointerDown={(e) => {
              if (!e.altKey || e.target !== e.currentTarget || !ref.current) return;
              e.preventDefault();
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              const m = minutesAt(e.clientY);
              sel.current = { col: ci, from: m, to: m + SNAP };
              setGhost({ ...sel.current });
            }}
            onClick={(e) => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              if (e.target !== e.currentTarget) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const mins = Math.floor(((e.clientY - rect.top) / HOUR_H) * 2) * 30;
              const start = new Date(col.day);
              start.setHours(HOUR_START, 0, 0, 0);
              onSlot(new Date(start.getTime() + mins * 60000), col.bay);
            }}
          >
            {HOURS.map((h) => (
              <div key={h} style={{ top: (h - HOUR_START) * HOUR_H }} className="pointer-events-none absolute inset-x-0 border-t border-white/[0.045]" />
            ))}
            {colBlocks.map(({ b, seg }) => {
              const meta = blockMeta[b.kind];
              const top = (gridMinutes(seg.start) / 60) * HOUR_H;
              const height = Math.max(20, ((seg.end.getTime() - seg.start.getTime()) / 3600000) * HOUR_H - 2);
              const who = blockUserName(b);
              return (
                <button
                  key={`blk-${b._id}`}
                  onClick={() => onBlock(b)}
                  className="absolute inset-x-1 z-[5] overflow-hidden rounded-xl border px-2 py-1 text-left backdrop-blur-[2px] transition hover:brightness-125"
                  style={{ top, height, ...hatchStyle(b.kind) }}
                  aria-label={`${meta.label}: ${b.title}${who ? ` · ${who}` : ""}`}
                >
                  <p className="flex items-center gap-1 truncate text-[10px] font-semibold" style={{ color: meta.color }}>
                    <meta.icon className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{b.title}</span>
                  </p>
                  {height > 36 && <p className="truncate text-[10px] text-ink-3">{who ?? "Whole shop"}{b.allDay ? " · all day" : ""}</p>}
                </button>
              );
            })}
            {ghost && ghost.col === ci && (
              <div
                className="pointer-events-none absolute inset-x-1 z-40 rounded-xl border border-dashed border-plasma/70 bg-plasma/15"
                style={{
                  top: (Math.min(ghost.from, ghost.to) / 60) * HOUR_H,
                  height: Math.max(8, (Math.abs(ghost.to - ghost.from) / 60) * HOUR_H),
                }}
              />
            )}
            {isToday && gridMinutes(now) >= 0 && gridMinutes(now) <= (HOUR_END - HOUR_START) * 60 && (
              <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: (gridMinutes(now) / 60) * HOUR_H }}>
                <div className="relative h-px bg-plasma shadow-[0_0_8px_var(--color-plasma)]">
                  <span className="absolute -top-[4px] -left-[4px] size-[9px] rounded-full bg-plasma" />
                </div>
              </div>
            )}
            {colJobs.map((j) => {
              const s = jobStart(j);
              const en = jobEnd(j);
              const top = Math.max(0, (gridMinutes(s) / 60) * HOUR_H);
              const height = Math.max(26, ((en.getTime() - s.getTime()) / 3600000) * HOUR_H - 3);
              const lane = lanes.get(j._id) ?? { index: 0, count: 1 };
              const meta = stageMeta[j.stage];
              const active = override?.id === j._id;
              return (
                <div
                  key={j._id}
                  role="button"
                  tabIndex={0}
                  aria-label={`#${j.number} ${j.title}, ${formatTime(s)} to ${formatTime(en)}`}
                  onKeyDown={(e) => e.key === "Enter" && onOpen(j)}
                  onPointerDown={(e) => begin(e, j, "move")}
                  className={cn(
                    "group absolute cursor-grab touch-none overflow-hidden rounded-xl border px-2 py-1 text-left backdrop-blur-md transition-shadow select-none active:cursor-grabbing",
                    active ? "z-30 shadow-[var(--shadow-lift)] ring-1 ring-white/40" : "z-10 hover:z-20 hover:shadow-[var(--shadow-float)]",
                  )}
                  style={{
                    top,
                    height,
                    left: `calc(${(lane.index / lane.count) * 100}% + 3px)`,
                    width: `calc(${100 / lane.count}% - 6px)`,
                    background: `linear-gradient(180deg, ${meta.color}33, ${meta.color}1a)`,
                    borderColor: `${meta.color}55`,
                    boxShadow: `inset 3px 0 0 ${meta.color}`,
                  }}
                >
                  <p className="truncate text-[11px] font-semibold text-ink">
                    {j.recurrence && <Repeat className="mr-1 inline size-3 text-aqua-soft" aria-label="Repeats" />}
                    <span className="font-mono text-ink-3">#{j.number}</span> {j.title}
                  </p>
                  {height > 40 && (
                    <p className="truncate text-[10px] text-ink-2">
                      {formatTime(s)} – {formatTime(en)}
                    </p>
                  )}
                  {height > 58 && <p className="truncate text-[10px] text-ink-3">{customerName(j.customer)} · {vehicleLabel(j.vehicle)}</p>}
                  <span
                    onPointerDown={(e) => begin(e, j, "resize")}
                    className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100"
                    aria-hidden
                  >
                    <span className="mx-auto mt-0.5 block h-1 w-8 rounded-full bg-white/50" />
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** Greedy lane assignment so overlapping jobs sit side by side. */
function layoutLanes(jobs: Job[]) {
  const sorted = [...jobs].sort((a, b) => jobStart(a).getTime() - jobStart(b).getTime());
  const result = new Map<string, { index: number; count: number }>();
  let cluster: Job[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = 0;
  const flush = () => {
    cluster.forEach((j) => result.set(j._id, { index: result.get(j._id)!.index, count: laneEnds.length }));
    cluster = [];
    laneEnds = [];
  };
  for (const j of sorted) {
    const s = jobStart(j).getTime();
    const e = jobEnd(j).getTime();
    if (cluster.length && s >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e);
    } else laneEnds[lane] = e;
    result.set(j._id, { index: lane, count: 1 });
    cluster.push(j);
    clusterEnd = Math.max(clusterEnd, e);
  }
  flush();
  return result;
}

function MonthGrid({
  from,
  anchor,
  jobs,
  blocks,
  onBlock,
  onDay,
  onJob,
}: {
  from: Date;
  anchor: Date;
  jobs: Job[];
  blocks: CalendarBlock[];
  onBlock: (b: CalendarBlock) => void;
  onDay: (d: Date) => void;
  onJob: (j: Job) => void;
}) {
  const weeks = Math.ceil((differenceInCalendarDays(addDays(endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }), 1), from)) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(from, i));
  const today = new Date();
  return (
    <Glass className="overflow-hidden rounded-[24px]">
      <div className="grid grid-cols-7 border-b border-white/[0.07]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-2.5 text-center text-[11px] tracking-wider text-ink-4 uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const dayJobs = jobs.filter((j) => isSameDay(jobStart(j), d)).sort((a, b) => jobStart(a).getTime() - jobStart(b).getTime());
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "min-h-[110px] border-r border-b border-white/[0.05] p-1.5 sm:p-2",
                !isSameMonth(d, anchor) && "bg-black/20 opacity-50",
              )}
            >
              <button
                onClick={() => onDay(d)}
                className={cn(
                  "mb-1 inline-flex size-7 items-center justify-center rounded-full text-xs hover:bg-white/10",
                  isSameDay(d, today) ? "bg-spectral font-semibold text-white" : "text-ink-2",
                )}
                aria-label={format(d, "EEEE, MMMM d")}
              >
                {format(d, "d")}
              </button>
              <ul className="space-y-1">
                {blocks
                  .filter((b) => blockTouchesDay(b, d))
                  .slice(0, 2)
                  .map((b) => (
                    <li key={`blk-${b._id}`}>
                      <button
                        onClick={() => onBlock(b)}
                        className="flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-left text-[10px]"
                        style={{ ...hatchStyle(b.kind), color: blockMeta[b.kind].color }}
                      >
                        <span className="truncate">{b.title}</span>
                      </button>
                    </li>
                  ))}
                {dayJobs.slice(0, 3).map((j) => (
                  <li key={j._id}>
                    <button
                      onClick={() => onJob(j)}
                      className="flex w-full items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-left text-[10px] text-ink-2 hover:bg-white/[0.08]"
                      style={{ background: `${stageMeta[j.stage].color}1f` }}
                    >
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: stageMeta[j.stage].color }} />
                      <span className="hidden tabular-nums sm:inline">{format(jobStart(j), "h:mma").toLowerCase()}</span>
                      {j.recurrence && <Repeat className="size-2.5 shrink-0 text-aqua-soft" aria-label="Repeats" />}
                      <span className="truncate">{j.title}</span>
                    </button>
                  </li>
                ))}
                {dayJobs.length > 3 && (
                  <li>
                    <button onClick={() => onDay(d)} className="px-1.5 text-[10px] text-aqua-soft hover:text-white">
                      +{dayJobs.length - 3} more
                    </button>
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </Glass>
  );
}

function nextHalfHour() {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}

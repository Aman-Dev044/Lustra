"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Radio, Search } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Job, JobStage, User } from "@/lib/types";
import { boardStages, customerName, stageMeta, vehicleLabel } from "@/lib/domain";
import { cn, formatMoney } from "@/lib/utils";
import { Avatar, Button, Skeleton } from "@/components/spatial";
import { PageHeader } from "@/components/app/ui";
import { JobCard } from "@/components/app/job-card";
import { JobCreateModal } from "@/components/app/job-create-modal";
import { useRealtime, useSocketEvent } from "@/components/app/realtime-provider";

type Board = { columns: Partial<Record<JobStage, Job[]>> };

export default function BoardPage() {
  const router = useRouter();
  const { data, mutate, loading } = useApi<Board>("/jobs/board");
  const { data: team } = useApi<User[]>("/team");
  const { presence, connected } = useRealtime();
  const [q, setQ] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  function pulse(id: string) {
    setFlash((s) => new Set(s).add(id));
    clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      setTimeout(() => {
        setFlash((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      }, 2200),
    );
  }

  // Apply a pushed job update in place so every screen moves the card at the same moment.
  useSocketEvent<Job>("job:updated", (job) => {
    if (!job?._id) return;
    mutate((prev) => (prev ? placeJob(prev, job) : prev));
    pulse(job._id);
  });
  useSocketEvent<Job>("job:created", (job) => job?._id && pulse(job._id));

  const allJobs = useMemo(() => Object.values(data?.columns ?? {}).flat() as Job[], [data]);
  const activeJob = allJobs.find((j) => j._id === activeId) ?? null;

  const matches = (j: Job) => {
    if (assignee && !j.assignees?.some((a) => a._id === assignee)) return false;
    if (!q) return true;
    const hay = `${j.number} ${j.title} ${customerName(j.customer)} ${vehicleLabel(j.vehicle)}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  };

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const to = e.over?.id as JobStage | undefined;
    const job = allJobs.find((j) => j._id === e.active.id);
    if (!to || !job || job.stage === to) return;
    const snapshot = data;
    mutate((prev) => (prev ? placeJob(prev, { ...job, stage: to }) : prev));
    try {
      await api.patch<Job>(`/jobs/${job._id}/stage`, { stage: to });
      toast.success(`#${job.number} → ${stageMeta[to].label}`);
      invalidate("/analytics", "/activity");
    } catch (err) {
      if (snapshot) mutate(snapshot);
      toast.error(errorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Live Board"
        description="Drag jobs between stages — every device updates instantly."
        actions={
          <>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs",
                connected ? "border-success/30 bg-success/10 text-success" : "border-ink/10 text-ink-3",
              )}
            >
              <Radio className="size-3.5" aria-hidden />
              {connected ? `Live · ${presence.length || 1} online` : "Reconnecting…"}
            </span>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New job
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="glass-inset flex h-10 w-full items-center gap-2 rounded-full px-4 sm:w-72">
          <Search className="size-4 text-ink-4" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by #, customer, vehicle…"
            aria-label="Filter jobs"
            className="h-full flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <button
          onClick={() => setAssignee(null)}
          aria-pressed={!assignee}
          className={cn(
            "h-9 rounded-full border px-3.5 text-xs transition",
            !assignee ? "border-aqua/40 bg-aqua/10 text-ink" : "border-ink/10 text-ink-3 hover:text-ink",
          )}
        >
          Everyone
        </button>
        {(team ?? [])
          .filter((u) => u.active)
          .map((u) => (
            <button
              key={u._id}
              onClick={() => setAssignee(assignee === u._id ? null : u._id)}
              aria-pressed={assignee === u._id}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-xs transition",
                assignee === u._id ? "border-aqua/40 bg-aqua/10 text-ink" : "border-ink/10 text-ink-3 hover:text-ink",
              )}
            >
              <Avatar name={u.name} size={26} />
              {u.name.split(" ")[0]}
            </button>
          ))}
      </div>

      {loading && !data ? (
        <div className="flex gap-3 overflow-hidden">
          {boardStages.map((s) => (
            <Skeleton key={s} className="h-[60vh] w-[290px] shrink-0 rounded-[24px]" />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
          <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-4 sm:mx-0 sm:px-0">
            {boardStages.map((stage) => {
              const jobs = (data?.columns?.[stage] ?? []).filter(matches);
              return (
                <Column key={stage} stage={stage} jobs={jobs}>
                  {jobs.map((j) => (
                    <DraggableCard key={j._id} job={j} highlight={flash.has(j._id)} hidden={activeId === j._id} />
                  ))}
                </Column>
              );
            })}
          </div>
          <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.16,1,0.3,1)" }}>
            {activeJob ? <JobCard job={activeJob} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <JobCreateModal open={creating} onClose={() => setCreating(false)} onCreated={(j) => router.push(`/app/jobs/${j._id}`)} />
    </div>
  );
}

/** Move/replace a job inside the board columns according to its (possibly new) stage. */
function placeJob(board: Board, job: Job): Board {
  const columns: Board["columns"] = {};
  for (const [stage, list] of Object.entries(board.columns) as [JobStage, Job[]][]) {
    columns[stage] = list.filter((j) => j._id !== job._id);
  }
  if (boardStages.includes(job.stage)) {
    const existing = Object.values(board.columns).flat().find((j) => j?._id === job._id);
    const merged = existing ? { ...existing, ...job, customer: job.customer ?? existing.customer, vehicle: job.vehicle ?? existing.vehicle } : job;
    columns[job.stage] = [merged as Job, ...(columns[job.stage] ?? [])];
  }
  return { columns };
}

function Column({ stage, jobs, children }: { stage: JobStage; jobs: Job[]; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = stageMeta[stage];
  const value = jobs.reduce((s, j) => s + (j.totals?.total ?? 0), 0);
  return (
    <section
      ref={setNodeRef}
      aria-label={`${meta.label} column`}
      className={cn(
        "glass flex max-h-[calc(100dvh-260px)] min-h-[50vh] w-[290px] shrink-0 snap-start flex-col rounded-[24px] transition-all duration-200",
        isOver && "border-aqua/40 bg-ink/[0.08] shadow-[var(--shadow-glow-aqua)]",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }} />
          <h2 className="text-sm font-semibold">{meta.label}</h2>
          <span className="rounded-full bg-ink/[0.07] px-2 py-0.5 text-[11px] text-ink-3">{jobs.length}</span>
        </div>
        <span className="text-xs text-ink-3 tabular-nums">{formatMoney(value, "USD", true)}</span>
      </header>
      <div className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-3">
        {children}
        {jobs.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-ink/10 px-3 py-8 text-center text-xs text-ink-4">Drop jobs here</div>
        )}
      </div>
    </section>
  );
}

function DraggableCard({ job, highlight, hidden }: { job: Job; highlight: boolean; hidden: boolean }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: job._id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-roledescription="Draggable job"
      className={cn("cursor-grab touch-none rounded-[18px] active:cursor-grabbing", hidden && "opacity-30")}
    >
      <JobCard job={job} highlight={highlight} />
    </div>
  );
}

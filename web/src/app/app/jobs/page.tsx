"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Wrench, X } from "lucide-react";
import { useApi, useDebounced } from "@/lib/hooks/use-api";
import { useCreateParam, usePage } from "@/lib/hooks/use-list-state";
import type { Job, JobStage, Paginated } from "@/lib/types";
import { customerName, stageMeta, vehicleLabel } from "@/lib/domain";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";
import { Avatar, Button, EmptyState, Glass, Input, Skeleton } from "@/components/spatial";
import { PageHeader, Pagination, RowLink, StageBadge, Table, Td, Th, Toolbar } from "@/components/app/ui";
import { ExportButton } from "@/components/app/export-button";
import { JobCreateModal } from "@/components/app/job-create-modal";

const STAGES = Object.keys(stageMeta) as JobStage[];
const PAGE_SIZE = 25;

export default function JobsPage() {
  return (
    <Suspense>
      <JobsView />
    </Suspense>
  );
}

function JobsView() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [stages, setStages] = useState<JobStage[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = usePage(JSON.stringify([dq, stages, from, to]));
  const [creating, setCreating] = useCreateParam();

  const { data, loading } = useApi<Paginated<Job>>("/jobs", {
    q: dq,
    stage: stages.join(",") || undefined,
    from: from ? new Date(`${from}T00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    page,
    pageSize: PAGE_SIZE,
    customer: params.get("customer") ?? undefined,
  });

  const toggleStage = (s: JobStage) => setStages((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  const closeCreate = () => setCreating(false);
  const filtered = !!(dq || stages.length || from || to);

  return (
    <div>
      <PageHeader
        title="Jobs"
        description={data ? `${data.total} job${data.total === 1 ? "" : "s"}` : "Every job across every bay"}
        actions={
          <>
            <ExportButton entity="jobs" query={{ q: dq || undefined, stage: stages.join(",") || undefined }} />
            <Button variant="secondary" href="/app/board">
              Board view
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New job
            </Button>
          </>
        }
      />

      <Toolbar>
        <div className="glass-inset flex h-10 w-full items-center gap-2 rounded-full px-4 sm:w-72">
          <Search className="size-4 text-ink-4" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search jobs…"
            aria-label="Search jobs"
            className="h-full flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 w-[150px] rounded-full" aria-label="From date" />
          <span className="text-xs text-ink-4">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 w-[150px] rounded-full" aria-label="To date" />
        </div>
        {filtered && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setQ("");
              setStages([]);
              setFrom("");
              setTo("");
            }}
          >
            <X className="size-3.5" /> Clear
          </Button>
        )}
      </Toolbar>
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by stage">
        {STAGES.map((s) => {
          const on = stages.includes(s);
          return (
            <button
              key={s}
              onClick={() => toggleStage(s)}
              aria-pressed={on}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
                on ? "border-ink/25 bg-ink/[0.1] text-ink" : "border-ink/[0.08] text-ink-3 hover:text-ink",
              )}
            >
              <span className="size-1.5 rounded-full" style={{ background: stageMeta[s].color }} />
              {stageMeta[s].label}
            </button>
          );
        })}
      </div>

      <Glass className="overflow-hidden">
        {loading && !data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={<Wrench className="size-7" />}
            title={filtered ? "No jobs match those filters" : "No jobs yet"}
            description={filtered ? "Try widening the date range or clearing filters." : "Create your first job or let customers book online."}
            action={!filtered && <Button onClick={() => setCreating(true)}>New job</Button>}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Job</Th>
                    <Th>Customer</Th>
                    <Th>Stage</Th>
                    <Th>Scheduled</Th>
                    <Th>Crew</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((j) => (
                    <RowLink key={j._id} href={`/app/jobs/${j._id}`}>
                      <Td>
                        <span className="mr-2 font-mono text-xs text-ink-4">#{j.number}</span>
                        <span className="text-ink">{j.title}</span>
                      </Td>
                      <Td>
                        <span className="block text-ink-2">{customerName(j.customer)}</span>
                        <span className="text-xs text-ink-4">{vehicleLabel(j.vehicle)}</span>
                      </Td>
                      <Td>
                        <StageBadge stage={j.stage} />
                      </Td>
                      <Td className="whitespace-nowrap text-xs">{j.scheduledStart ? formatDateTime(j.scheduledStart) : "—"}</Td>
                      <Td>
                        <div className="flex -space-x-1.5">
                          {j.assignees?.slice(0, 3).map((u) => (
                            <span key={u._id} title={u.name} className="rounded-full ring-2 ring-void">
                              <Avatar name={u.name} size={24} />
                            </span>
                          ))}
                        </div>
                      </Td>
                      <Td className="text-right font-medium text-ink tabular-nums">{formatMoney(j.totals?.total)}</Td>
                    </RowLink>
                  ))}
                </tbody>
              </Table>
            </div>
            {/* Mobile cards */}
            <ul className="divide-y divide-ink/[0.05] md:hidden">
              {data.items.map((j) => (
                <li key={j._id}>
                  <Link href={`/app/jobs/${j._id}`} className="block px-4 py-3.5 active:bg-ink/[0.05]">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-ink">
                        <span className="mr-1.5 font-mono text-xs text-ink-4">#{j.number}</span>
                        {j.title}
                      </p>
                      <span className="text-sm font-medium tabular-nums">{formatMoney(j.totals?.total, "USD", true)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-4">
                      {customerName(j.customer)} · {vehicleLabel(j.vehicle)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <StageBadge stage={j.stage} />
                      {j.scheduledStart && <span className="text-[11px] text-ink-4">{formatDateTime(j.scheduledStart)}</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />
          </>
        )}
      </Glass>

      <JobCreateModal
        open={creating}
        onClose={closeCreate}
        defaults={{ customerId: params.get("customer") }}
        onCreated={(j) => router.push(`/app/jobs/${j._id}`)}
      />
    </div>
  );
}

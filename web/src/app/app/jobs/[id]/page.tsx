"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  CalendarClock,
  Car,
  Check,
  Copy,
  FileCheck2,
  Link2,
  MoreHorizontal,
  Phone,
  Mail,
  Plus,
  QrCode,
  Receipt,
  ScanSearch,
  Send,
  ShieldCheck,
  Trash2,
  X,
  Navigation,
  Truck,
  Repeat,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { serializeLineItems } from "@/lib/line-items";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Invoice, Job, JobStage, LineItem, Recurrence, User } from "@/lib/types";
import { boardStages, customerName, priorityMeta, stageMeta, vehicleLabel } from "@/lib/domain";
import { cn, formatDateTime, formatDuration, relativeTime, toDateTimeInput } from "@/lib/utils";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Glass,
  Input,
  Menu,
  Modal,
  Select,
  Skeleton,
  Switch,
  Textarea,
} from "@/components/spatial";
import { useAuth } from "@/components/app/auth-provider";
import { useSocketEvent } from "@/components/app/realtime-provider";
import { PageHeader, StageBadge } from "@/components/app/ui";
import { DocumentsPanel } from "@/components/app/documents-panel";
import { RecurrenceEditor, RecurrencePill } from "@/components/app/recurrence-editor";
import { LineItemsEditor, TotalsPanel, computeTotals } from "@/components/app/line-items-editor";

const userId = (u: unknown) => (typeof u === "string" ? u : (u as User | null | undefined)?._id ?? "");

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { shop, can, isManager } = useAuth();
  const { data: job, loading, error, refresh, mutate } = useApi<Job>(`/jobs/${id}`);
  const { data: team } = useApi<User[]>("/team");
  // Unsaved service edits; null means "show what the server has".
  const [draft, setDraft] = useState<LineItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const [omwOpen, setOmwOpen] = useState(false);

  const items = draft ?? job?.lineItems ?? [];
  const dirty = draft !== null;

  useSocketEvent<Job>("job:updated", (j) => {
    if (j?._id === id) void refresh();
  });

  if (error && !job) {
    return (
      <EmptyState
        title="Job not found"
        description="It may have been deleted, or you don't have access."
        action={<Button href="/app/jobs">Back to jobs</Button>}
      />
    );
  }
  if (loading || !job) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/portal/${job.portalToken}` : "";
  const liveTotals = dirty ? computeTotals(items, 0, shop.taxRate) : job.totals;
  const durationMin = (job.lineItems ?? []).reduce((s, i) => s + (i.durationMinutes ?? 0) * (i.qty || 1), 0);

  async function patch(body: Partial<Job> | Record<string, unknown>, success?: string) {
    try {
      const updated = await api.patch<Job>(`/jobs/${id}`, body);
      mutate(updated);
      invalidate("/jobs", "/analytics");
      if (success) toast.success(success);
      return updated;
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function moveStage(stage: JobStage) {
    if (!job || stage === job.stage) return;
    const prev = job;
    mutate({ ...job, stage });
    try {
      const updated = await api.patch<Job>(`/jobs/${id}/stage`, { stage });
      mutate(updated);
      invalidate("/jobs", "/analytics", "/activity");
      toast.success(`Moved to ${stageMeta[stage].label}`);
    } catch (e) {
      mutate(prev);
      toast.error(errorMessage(e));
    }
  }

  async function saveItems() {
    setSaving(true);
    const updated = await patch({ lineItems: serializeLineItems(items) }, "Services saved");
    if (updated) setDraft(null);
    setSaving(false);
  }

  async function createInvoice() {
    if (!job) return;
    if (job.invoice) return router.push(`/app/invoices/${typeof job.invoice === "string" ? job.invoice : userId(job.invoice)}`);
    setInvoicing(true);
    try {
      const inv = await api.post<Invoice>(`/invoices/from-job/${id}`);
      invalidate("/invoices", "/jobs");
      toast.success(`Invoice #${inv.number} created`);
      router.push(`/app/invoices/${inv._id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setInvoicing(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api.delete(`/jobs/${id}`);
      invalidate("/jobs", "/analytics");
      toast.success("Job deleted");
      router.push("/app/jobs");
    } catch (e) {
      toast.error(errorMessage(e));
      setDeleting(false);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard access was blocked");
    }
  }

  return (
    <div>
      <PageHeader
        back={{ href: "/app/jobs", label: "Jobs" }}
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span className="font-mono">#{job.number}</span>
            <StageBadge stage={job.stage} />
            {job.priority !== "normal" && <Badge tone={priorityMeta[job.priority].tone}>{priorityMeta[job.priority].label}</Badge>}
            {job.mobile && (
              <Badge tone="aqua">
                <Truck className="size-3" /> Mobile
              </Badge>
            )}
            <RecurrencePill recurrence={job.recurrence} />
          </span>
        }
        title={job.title}
        description={`Created ${relativeTime(job.createdAt)}${durationMin ? ` · ${formatDuration(durationMin)} of work` : ""}`}
        actions={
          <>
            {job.mobile && (job.stage === "scheduled" || job.stage === "in_progress") && (
              <Button variant="secondary" size="sm" onClick={() => setOmwOpen(true)}>
                <Navigation className="size-4" /> On my way
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setQrOpen(true)}>
              <QrCode className="size-4" /> Customer portal
            </Button>
            <Button size="sm" onClick={createInvoice} loading={invoicing}>
              <Receipt className="size-4" /> {job.invoice ? "View invoice" : "Create invoice"}
            </Button>
            <Menu
              trigger={
                <Button variant="secondary" size="icon" className="size-9" aria-label="More actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
              items={[
                { label: "New inspection", href: `/app/inspections?new=1&job=${id}`, icon: <ScanSearch className="size-4" /> },
                { label: "Issue warranty certificate", href: `/app/certificates?new=1&job=${id}`, icon: <ShieldCheck className="size-4" /> },
                { label: "Message customer", href: `/app/messages?customer=${job.customer?._id}`, icon: <Send className="size-4" /> },
                ...(isManager ? [{ label: "Delete job", onClick: () => setConfirmDelete(true), danger: true, icon: <Trash2 className="size-4" /> }] : []),
              ]}
            />
          </>
        }
      />

      <StageStepper stage={job.stage} onMove={moveStage} />

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-5">
          <Glass className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Services</h2>
              {dirty && (
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setDraft(null)}
                  >
                    Discard
                  </Button>
                  <Button size="xs" onClick={saveItems} loading={saving}>
                    Save changes
                  </Button>
                </div>
              )}
            </div>
            <LineItemsEditor
              items={items}
              size={job.vehicle?.size ?? "medium"}
              onChange={setDraft}
            />
          </Glass>

          <LineItemScheduling job={job} team={team ?? []} enabled={can("line_item_scheduling")} onSaved={mutate} dirty={dirty} />

          <Checklist job={job} onSaved={mutate} />

          <DocumentsPanel jobId={job._id} customerId={job.customer?._id} />

          <Timeline job={job} onSaved={mutate} />
        </div>

        <div className="space-y-5">
          <Glass className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Totals</h2>
            <TotalsPanel totals={liveTotals} />
            {dirty && <p className="mt-2 text-[11px] text-warning">Unsaved changes — totals preview</p>}
          </Glass>

          <Glass className="p-5">
            <div className="flex items-start gap-3">
              <Avatar name={customerName(job.customer)} size={42} />
              <div className="min-w-0 flex-1">
                <Link href={`/app/customers/${job.customer?._id}`} className="text-sm font-semibold hover:text-aqua-soft">
                  {customerName(job.customer)}
                </Link>
                <div className="mt-1 space-y-0.5 text-xs text-ink-3">
                  {job.customer?.phone && (
                    <a href={`tel:${job.customer.phone}`} className="flex items-center gap-1.5 hover:text-ink">
                      <Phone className="size-3" /> {job.customer.phone}
                    </a>
                  )}
                  {job.customer?.email && (
                    <a href={`mailto:${job.customer.email}`} className="flex items-center gap-1.5 truncate hover:text-ink">
                      <Mail className="size-3" /> {job.customer.email}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-ink/[0.04] p-3">
              <span className="glass flex size-10 items-center justify-center rounded-xl text-aqua-soft">
                <Car className="size-5" />
              </span>
              <div className="min-w-0 text-sm">
                <p className="truncate text-ink">{vehicleLabel(job.vehicle)}</p>
                <p className="truncate text-xs text-ink-4">
                  {[job.vehicle?.color, job.vehicle?.plate, job.vehicle?.size && `${job.vehicle.size} size`].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
            </div>
          </Glass>

          <ScheduleCard job={job} team={team ?? []} bays={shop.booking?.bays ?? 2} onSave={patch} />

          <MobileRepeatCard job={job} onSave={patch} onOnMyWay={() => setOmwOpen(true)} />

          {job.notes && (
            <Glass className="p-5">
              <h2 className="mb-2 text-sm font-semibold">Customer notes</h2>
              <p className="text-sm whitespace-pre-wrap text-ink-2">{job.notes}</p>
            </Glass>
          )}
        </div>
      </div>

      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="Live customer portal" description="Your customer tracks progress, approves work, signs and pays from this link." size="sm">
        <div className="flex flex-col items-center gap-5">
          <div className="rounded-3xl bg-white p-4 shadow-[var(--shadow-glow-iris)]">
            <QRCodeSVG value={portalUrl} size={180} bgColor="#ffffff" fgColor="#0b0e1c" level="M" />
          </div>
          <div className="glass-inset flex w-full items-center gap-2 rounded-full p-1 pl-4">
            <Link2 className="size-4 shrink-0 text-ink-4" />
            <span className="flex-1 truncate font-mono text-xs text-ink-2">{portalUrl}</span>
            <Button size="xs" onClick={() => copy(portalUrl, "Portal link")}>
              <Copy className="size-3.5" /> Copy
            </Button>
          </div>
          <Button variant="ghost" size="sm" href={`/portal/${job.portalToken}`}>
            Preview as customer →
          </Button>
        </div>
      </Modal>

      <OnMyWayModal open={omwOpen} job={job} onClose={() => setOmwOpen(false)} onSent={mutate} />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={deleting}
        danger
        title={`Delete job #${job.number}?`}
        description="This removes the job, its timeline and checklist. Invoices already issued are kept."
        confirmLabel="Delete job"
      />
    </div>
  );
}

function StageStepper({ stage, onMove }: { stage: JobStage; onMove: (s: JobStage) => void }) {
  const idx = boardStages.indexOf(stage);
  return (
    <Glass className="p-2">
      <ol className="flex gap-1 overflow-x-auto" aria-label="Job stage">
        {boardStages.map((s, i) => {
          const reached = idx >= i && stage !== "cancelled";
          const current = s === stage;
          return (
            <li key={s} className="min-w-[110px] flex-1">
              <button
                onClick={() => onMove(s)}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-xs transition",
                  current ? "bg-ink/[0.1] text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]" : "text-ink-3 hover:bg-ink/[0.05] hover:text-ink",
                )}
              >
                <span
                  className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px]", reached ? "border-transparent text-void" : "border-ink/15")}
                  style={reached ? { background: stageMeta[s].color } : undefined}
                >
                  {reached && !current ? <Check className="size-3" /> : i + 1}
                </span>
                <span className="truncate">{stageMeta[s].label}</span>
              </button>
            </li>
          );
        })}
        <li className="min-w-[100px]">
          <button
            onClick={() => onMove(stage === "cancelled" ? "lead" : "cancelled")}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs transition",
              stage === "cancelled" ? "bg-danger/15 text-danger" : "text-ink-4 hover:bg-danger/10 hover:text-danger",
            )}
          >
            <X className="size-3.5" /> {stage === "cancelled" ? "Reopen" : "Cancel"}
          </button>
        </li>
      </ol>
    </Glass>
  );
}

function ScheduleCard({
  job,
  team,
  bays,
  onSave,
}: {
  job: Job;
  team: User[];
  bays: number;
  onSave: (body: Record<string, unknown>, msg?: string) => Promise<Job | undefined>;
}) {
  const [edit, setEdit] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [bay, setBay] = useState(1);
  const [assignees, setAssignees] = useState<string[]>([]);

  function beginEdit() {
    setStart(toDateTimeInput(job.scheduledStart));
    setEnd(toDateTimeInput(job.scheduledEnd));
    setBay(job.bay ?? 1);
    setAssignees((job.assignees ?? []).map((a) => a._id));
    setEdit(true);
  }

  async function save() {
    if (start && end && new Date(end) <= new Date(start)) return toast.error("End must be after start");
    const ok = await onSave(
      {
        scheduledStart: start ? new Date(start).toISOString() : null,
        scheduledEnd: end ? new Date(end).toISOString() : null,
        bay,
        assignees,
      },
      "Schedule updated",
    );
    if (ok) setEdit(false);
  }

  return (
    <Glass className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4 text-ink-3" /> Schedule & crew
        </h2>
        {!edit && (
          <Button size="xs" variant="ghost" onClick={beginEdit}>
            Edit
          </Button>
        )}
      </div>
      {!edit ? (
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-4">Start</dt>
            <dd className="text-right text-ink-2">{job.scheduledStart ? formatDateTime(job.scheduledStart) : "Not scheduled"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-4">End</dt>
            <dd className="text-right text-ink-2">{job.scheduledEnd ? formatDateTime(job.scheduledEnd) : "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-4">Bay</dt>
            <dd className="text-ink-2">{job.bay ? `Bay ${job.bay}` : "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <dt className="text-ink-4">Crew</dt>
            <dd className="flex flex-wrap justify-end gap-1.5">
              {job.assignees?.length ? (
                job.assignees.map((u) => (
                  <span key={u._id} className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.05] py-0.5 pr-2.5 pl-0.5 text-xs">
                    <Avatar name={u.name} size={20} /> {u.name.split(" ")[0]}
                  </span>
                ))
              ) : (
                <span className="text-xs text-ink-4">Unassigned</span>
              )}
            </dd>
          </div>
        </dl>
      ) : (
        <div className="space-y-3">
          <Field label="Start">
            <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End">
            <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <Field label="Bay">
            <Select value={bay} onChange={(e) => setBay(Number(e.target.value))}>
              {Array.from({ length: Math.max(1, bays) }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Bay {i + 1}
                </option>
              ))}
            </Select>
          </Field>
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-2">Crew</p>
            <div className="flex flex-wrap gap-1.5">
              {team
                .filter((u) => u.active)
                .map((u) => {
                  const on = assignees.includes(u._id);
                  return (
                    <button
                      key={u._id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setAssignees((a) => (on ? a.filter((x) => x !== u._id) : [...a, u._id]))}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-xs transition",
                        on ? "border-aqua/50 bg-aqua/10 text-ink" : "border-ink/10 text-ink-3",
                      )}
                    >
                      <Avatar name={u.name} size={20} /> {u.name.split(" ")[0]}
                    </button>
                  );
                })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" onClick={() => setEdit(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              Save
            </Button>
          </div>
        </div>
      )}
    </Glass>
  );
}

function LineItemScheduling({
  job,
  team,
  enabled,
  onSaved,
  dirty,
}: {
  job: Job;
  team: User[];
  enabled: boolean;
  onSaved: (j: Job) => void;
  dirty: boolean;
}) {
  const items = (job.lineItems ?? []).filter((i) => i._id);
  if (!items.length) return null;

  async function update(itemId: string, body: Record<string, unknown>) {
    try {
      const updated = await api.patch<Job>(`/jobs/${job._id}/line-items/${itemId}`, body);
      onSaved(updated);
      invalidate("/jobs");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Glass className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Line-item scheduling</h2>
          <p className="text-xs text-ink-4">Give each service its own technician and time window.</p>
        </div>
        {!enabled && (
          <Button size="xs" variant="secondary" href="/app/settings?tab=billing">
            Enterprise
          </Button>
        )}
      </div>
      {!enabled ? (
        <p className="rounded-2xl border border-dashed border-ink/10 px-4 py-5 text-center text-xs text-ink-3">
          Split work across specialists — e.g. PPF installer on the front clip while a detailer handles the interior. Available on Enterprise.
        </p>
      ) : dirty ? (
        <p className="text-xs text-warning">Save your service changes first.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it._id} className="grid gap-2 rounded-2xl bg-ink/[0.03] p-3 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto] sm:items-center">
              <span className="truncate text-sm text-ink">{it.name}</span>
              <Select
                aria-label={`Technician for ${it.name}`}
                value={userId(it.assignee)}
                onChange={(e) => update(it._id!, { assignee: e.target.value || null })}
                className="h-9 text-xs"
              >
                <option value="">Unassigned</option>
                {team.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </Select>
              <Input
                type="datetime-local"
                aria-label={`Start for ${it.name}`}
                defaultValue={toDateTimeInput(it.scheduledStart)}
                onBlur={(e) => e.target.value !== toDateTimeInput(it.scheduledStart) && update(it._id!, { scheduledStart: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="h-9 text-xs"
              />
              <Input
                type="datetime-local"
                aria-label={`End for ${it.name}`}
                defaultValue={toDateTimeInput(it.scheduledEnd)}
                onBlur={(e) => e.target.value !== toDateTimeInput(it.scheduledEnd) && update(it._id!, { scheduledEnd: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="h-9 text-xs"
              />
              <Select
                aria-label={`Status for ${it.name}`}
                value={it.status ?? "pending"}
                onChange={(e) => update(it._id!, { status: e.target.value })}
                className="h-9 text-xs"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </Select>
            </li>
          ))}
        </ul>
      )}
    </Glass>
  );
}

function Checklist({ job, onSaved }: { job: Job; onSaved: (j: Job) => void }) {
  const [label, setLabel] = useState("");
  const list = job.checklist ?? [];
  const done = list.filter((c) => c.done).length;

  async function save(checklist: { _id?: string; label: string; done: boolean }[]) {
    onSaved({ ...job, checklist: checklist as Job["checklist"] });
    try {
      const updated = await api.patch<Job>(`/jobs/${job._id}/checklist`, { checklist });
      onSaved(updated);
    } catch (e) {
      onSaved(job);
      toast.error(errorMessage(e));
    }
  }

  return (
    <Glass className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <FileCheck2 className="size-4 text-ink-3" /> Quality checklist
        </h2>
        {list.length > 0 && (
          <span className="text-xs text-ink-3 tabular-nums">
            {done}/{list.length}
          </span>
        )}
      </div>
      {list.length > 0 && (
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
          <div className="h-full rounded-full bg-gradient-to-r from-iris to-aqua transition-[width] duration-500" style={{ width: `${(done / list.length) * 100}%` }} />
        </div>
      )}
      <ul className="space-y-1">
        {list.map((c, i) => (
          <li key={c._id ?? i} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-ink/[0.04]">
            <button
              role="checkbox"
              aria-checked={c.done}
              onClick={() => save(list.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))}
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-md border transition",
                c.done ? "border-transparent bg-gradient-to-br from-iris to-aqua text-white" : "border-ink/20 hover:border-aqua/60",
              )}
            >
              {c.done && <Check className="size-3.5" />}
            </button>
            <span className={cn("flex-1 text-sm", c.done ? "text-ink-4 line-through" : "text-ink-2")}>{c.label}</span>
            <button
              onClick={() => save(list.filter((_, j) => j !== i))}
              className="rounded-full p-1 text-ink-4 opacity-0 transition group-hover:opacity-100 hover:text-danger focus:opacity-100"
              aria-label={`Remove ${c.label}`}
            >
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          void save([...list, { label: label.trim(), done: false }]);
          setLabel("");
        }}
      >
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Add a check, e.g. Panel wipe with IPA" className="h-9" aria-label="New checklist item" />
        <Button type="submit" size="sm" variant="secondary" aria-label="Add checklist item">
          <Plus className="size-4" />
        </Button>
      </form>
    </Glass>
  );
}

function Timeline({ job, onSaved }: { job: Job; onSaved: (j: Job) => void }) {
  const [msg, setMsg] = useState("");
  const [posting, setPosting] = useState(false);
  const events = [...(job.timeline ?? [])].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim()) return;
    setPosting(true);
    try {
      const updated = await api.post<Job>(`/jobs/${job._id}/notes`, { message: msg.trim() });
      onSaved(updated);
      setMsg("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPosting(false);
    }
  }

  const dot: Record<string, string> = {
    stage: "#ff9a66",
    payment: "#34d399",
    note: "#45c4ff",
    message: "#60a5fa",
    inspection: "#fbbf24",
    quote: "#f472b6",
  };

  return (
    <Glass className="p-5">
      <h2 className="mb-4 text-sm font-semibold">Timeline</h2>
      <form onSubmit={post} className="mb-5">
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Add an internal note — the whole team sees it instantly" className="min-h-20" aria-label="New note" />
        <div className="mt-2 flex justify-end">
          <Button type="submit" size="sm" loading={posting} disabled={!msg.trim()}>
            Post note
          </Button>
        </div>
      </form>
      {events.length === 0 ? (
        <p className="text-sm text-ink-4">No activity yet.</p>
      ) : (
        <ol className="relative space-y-4 before:absolute before:top-1 before:bottom-1 before:left-[5px] before:w-px before:bg-ink/[0.08]">
          {events.map((ev) => (
            <li key={ev._id} className="relative flex gap-4 pl-0">
              <span className="relative z-10 mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-void" style={{ background: dot[ev.type] ?? "#94a3b8" }} />
              <div className="min-w-0">
                <p className="text-sm text-ink-2">{ev.message}</p>
                <p className="mt-0.5 text-[11px] text-ink-4">
                  {typeof ev.by === "object" && ev.by?.name ? `${ev.by.name} · ` : ""}
                  {relativeTime(ev.at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Glass>
  );
}

function MobileRepeatCard({
  job,
  onSave,
  onOnMyWay,
}: {
  job: Job;
  onSave: (body: Record<string, unknown>, msg?: string) => Promise<Job | undefined>;
  onOnMyWay: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [address, setAddress] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);

  function beginEdit() {
    setMobile(!!job.mobile);
    setAddress(job.serviceAddress ?? job.customer?.address ?? "");
    setRecurrence(
      job.recurrence ? { frequency: job.recurrence.frequency, intervalDays: job.recurrence.intervalDays, endsAt: job.recurrence.endsAt ?? null } : null,
    );
    setEditing(true);
  }

  async function save() {
    if (mobile && !address.trim()) return toast.error("Mobile jobs need a service address");
    const ok = await onSave({ mobile, serviceAddress: mobile ? address.trim() : undefined, recurrence }, "Job updated");
    if (ok) setEditing(false);
  }

  const parent = job.recurrence?.parent;
  const parentId = parent ? (typeof parent === "string" ? parent : (parent as unknown as Job)._id) : null;
  const mapsUrl = job.serviceAddress ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.serviceAddress)}` : null;

  return (
    <Glass className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Truck className="size-4 text-ink-3" /> Location & repeat
        </h2>
        {!editing && (
          <Button size="xs" variant="ghost" onClick={beginEdit}>
            Edit
          </Button>
        )}
      </div>
      {!editing ? (
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-ink-4">Where</span>
            <span className="text-right text-ink-2">{job.mobile ? job.serviceAddress || "Address missing" : "In shop"}</span>
          </div>
          {job.mobile && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ink-4">ETA</span>
              {job.eta ? <Badge tone="aqua">Arriving {formatDateTime(job.eta)}</Badge> : <span className="text-xs text-ink-4">Not sent yet</span>}
            </div>
          )}
          {job.mobile && (
            <div className="flex flex-wrap gap-2">
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 items-center rounded-full border border-ink/10 px-3 text-xs text-ink-2 transition hover:bg-ink/[0.06] hover:text-ink"
                >
                  Navigate
                </a>
              )}
              <Button size="xs" variant="secondary" onClick={onOnMyWay}>
                <Navigation className="size-3.5" /> On my way
              </Button>
              <Button size="xs" variant="ghost" href="/app/routes">
                Route plan →
              </Button>
            </div>
          )}
          <div className="h-px bg-ink/[0.06]" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-ink-4">Repeats</span>
            {job.recurrence ? <RecurrencePill recurrence={job.recurrence} /> : <span className="text-ink-2">One-time</span>}
          </div>
          {parentId && (
            <Link href={`/app/jobs/${parentId}`} className="flex items-center gap-1.5 text-xs text-aqua-soft hover:text-ink">
              <Repeat className="size-3.5" /> View previous visit
            </Link>
          )}
          {job.recurrence?.generatedNext && <p className="text-xs text-ink-4">Next visit is already on the calendar.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl bg-ink/[0.04] px-3 py-2.5 text-sm">
            Mobile job
            <Switch checked={mobile} onChange={setMobile} label="Mobile job" />
          </div>
          {mobile && (
            <Field label="Service address">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, ZIP" />
            </Field>
          )}
          <RecurrenceEditor value={recurrence} onChange={setRecurrence} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              Save
            </Button>
          </div>
        </div>
      )}
    </Glass>
  );
}

const ETA_PRESETS = [10, 15, 20, 30];

function OnMyWayModal({ open, job, onClose, onSent }: { open: boolean; job: Job; onClose: () => void; onSent: (j: Job) => void }) {
  const [eta, setEta] = useState(15);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      const updated = await api.post<Job>(`/jobs/${job._id}/on-my-way`, { etaMinutes: eta });
      onSent(updated);
      invalidate("/jobs", "/messages");
      toast.success(`On-my-way text sent · ETA ${eta} min`);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="On my way"
      description={`Text ${job.customer?.firstName ?? "the customer"} a live ETA${job.customer?.phone ? ` at ${job.customer.phone}` : ""}.`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send} loading={sending}>
            <Navigation className="size-4" /> Send ETA
          </Button>
        </>
      }
    >
      <p className="mb-2 text-xs font-medium text-ink-2">Arriving in</p>
      <div className="grid grid-cols-4 gap-2">
        {ETA_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setEta(m)}
            aria-pressed={eta === m}
            className={cn(
              "rounded-2xl border py-3 text-center transition",
              eta === m ? "border-aqua/50 bg-aqua/10 text-ink shadow-[var(--shadow-glow-aqua)]" : "border-ink/10 text-ink-3 hover:text-ink",
            )}
          >
            <span className="block text-lg font-semibold tabular-nums">{m}</span>
            <span className="text-[10px]">min</span>
          </button>
        ))}
      </div>
      <Field label="Custom (minutes)" className="mt-3">
        <Input type="number" min={1} max={240} value={eta} onChange={(e) => setEta(Math.max(1, Math.min(240, Number(e.target.value) || 1)))} />
      </Field>
      {job.serviceAddress && <p className="mt-3 text-xs text-ink-4">Heading to {job.serviceAddress}</p>}
    </Modal>
  );
}

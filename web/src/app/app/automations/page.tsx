"use client";

import { useMemo, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Clock,
  Filter,
  FlaskConical,
  Mail,
  MessageSquare,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Workflow,
  X,
  Zap,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Automation, AutomationAction, AutomationTrigger, JobStage, Paginated } from "@/lib/types";
import { stageMeta } from "@/lib/domain";
import { cn, relativeTime } from "@/lib/utils";
import { Badge, Button, ConfirmDialog, Drawer, EmptyState, Field, Glass, Input, Modal, Select, Skeleton, Switch, Textarea } from "@/components/spatial";
import { PageHeader, PlanGate } from "@/components/app/ui";

const triggers: { value: AutomationTrigger; label: string; hint: string }[] = [
  { value: "job.created", label: "Job created", hint: "A new job is added from any source" },
  { value: "job.stage_changed", label: "Job stage changes", hint: "A job moves on the live board" },
  { value: "job.completed", label: "Job completed", hint: "Work is marked complete" },
  { value: "quote.sent", label: "Quote sent", hint: "A quote goes out to a customer" },
  { value: "quote.approved", label: "Quote approved", hint: "Customer approves & signs" },
  { value: "invoice.paid", label: "Invoice paid", hint: "Payment clears in full" },
  { value: "invoice.overdue", label: "Invoice overdue", hint: "Balance remains past due date" },
  { value: "booking.created", label: "Online booking", hint: "Someone books from your booking page" },
  { value: "customer.created", label: "New customer", hint: "A customer is added" },
  { value: "inspection.signed", label: "Inspection signed", hint: "Customer signs a walkaround" },
];
const triggerLabel = (t: string) => triggers.find((x) => x.value === t)?.label ?? t;

const actionTypes: { value: AutomationAction["type"]; label: string; icon: typeof Mail }[] = [
  { value: "send_sms", label: "Send SMS", icon: MessageSquare },
  { value: "send_email", label: "Send email", icon: Mail },
  { value: "wait", label: "Wait", icon: Clock },
  { value: "notify_team", label: "Notify team", icon: Bell },
  { value: "add_tag", label: "Add customer tag", icon: Tag },
  { value: "update_stage", label: "Move job stage", icon: GitBranch },
];
const actionMeta = (t: string) => actionTypes.find((a) => a.value === t) ?? actionTypes[0]!;

const conditionFields = ["job.stage", "job.total", "job.priority", "job.source", "customer.source", "customer.tags", "customer.visits", "invoice.total", "quote.total", "vehicle.type"];
const variables = ["{{customer.firstName}}", "{{job.number}}", "{{shop.name}}", "{{portalLink}}", "{{invoice.total}}"];

const listOf = <T,>(d: T[] | Paginated<T> | undefined) => (Array.isArray(d) ? d : (d?.items ?? []));

type Draft = Omit<Automation, "_id" | "runs" | "lastRunAt"> & { _id?: string };

const blankDraft = (): Draft => ({
  name: "",
  description: "",
  enabled: true,
  trigger: "job.completed",
  conditions: [],
  actions: [{ type: "send_sms", config: { template: "Hi {{customer.firstName}}, your vehicle is ready! — {{shop.name}}" } }],
});

export default function AutomationsPage() {
  return (
    <PlanGate feature="automations">
      <Automations />
    </PlanGate>
  );
}

function Automations() {
  const { data, loading, mutate } = useApi<Paginated<Automation> | Automation[]>("/automations", { pageSize: 100 });
  const { data: tplData } = useApi<Partial<Automation>[] | Paginated<Partial<Automation>>>("/automations/templates");
  const automations = listOf(data);
  const templates = listOf(tplData);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [gallery, setGallery] = useState(false);

  async function toggle(a: Automation, enabled: boolean) {
    mutate((prev) => {
      const items = listOf(prev).map((x) => (x._id === a._id ? { ...x, enabled } : x));
      return Array.isArray(prev) ? items : { ...(prev as Paginated<Automation>), items };
    });
    try {
      await api.patch(`/automations/${a._id}`, { enabled });
      toast.success(`${a.name} ${enabled ? "enabled" : "paused"}`);
    } catch (e) {
      toast.error(errorMessage(e));
      invalidate("/automations");
    }
  }

  const totalRuns = automations.reduce((s, a) => s + (a.runs ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Automations"
        description="Visual if-this-then-that workflows that text, email, tag and move jobs for you — 24/7."
        actions={
          <>
            <Button variant="secondary" onClick={() => setGallery(true)}>
              <Sparkles className="size-4" /> Templates
            </Button>
            <Button onClick={() => setDraft(blankDraft())}>
              <Plus className="size-4" /> New automation
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Glass className="p-5">
          <p className="text-xs text-ink-3">Active workflows</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{automations.filter((a) => a.enabled).length}</p>
        </Glass>
        <Glass className="p-5">
          <p className="text-xs text-ink-3">Total runs</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{totalRuns.toLocaleString()}</p>
        </Glass>
        <Glass className="p-5">
          <p className="text-xs text-ink-3">Est. hours saved</p>
          <p className="text-spectral mt-2 text-3xl font-semibold tabular-nums">{Math.round((totalRuns * 3) / 60).toLocaleString()}h</p>
        </Glass>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : automations.length === 0 ? (
        <Glass>
          <EmptyState
            icon={<Workflow className="size-7" />}
            title="No automations yet"
            description="Start from a proven template — review requests, booking confirmations and payment reminders take one click."
            action={
              <Button onClick={() => setGallery(true)}>
                <Sparkles className="size-4" /> Browse templates
              </Button>
            }
          />
        </Glass>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {automations.map((a) => (
            <Glass key={a._id} className={cn("flex flex-col p-5 transition", !a.enabled && "opacity-60")}>
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => setDraft({ ...a })} className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold text-ink hover:text-aqua-soft">{a.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-3">{a.description || "No description"}</p>
                </button>
                <Switch checked={a.enabled} onChange={(v) => void toggle(a, v)} label={`Enable ${a.name}`} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <Badge tone="iris">
                  <Zap className="size-3" /> {triggerLabel(a.trigger)}
                </Badge>
                {a.conditions.length > 0 && (
                  <Badge tone="neutral">
                    <Filter className="size-3" /> {a.conditions.length} condition{a.conditions.length > 1 ? "s" : ""}
                  </Badge>
                )}
                {a.actions.map((act, i) => {
                  const M = actionMeta(act.type);
                  return (
                    <Badge key={i} tone="aqua">
                      <M.icon className="size-3" /> {M.label}
                    </Badge>
                  );
                })}
              </div>
              <div className="mt-auto flex items-center justify-between pt-4 text-xs text-ink-4">
                <span>
                  {a.runs ?? 0} runs{a.lastRunAt ? ` · last ${relativeTime(a.lastRunAt)}` : ""}
                </span>
                <button onClick={() => setDraft({ ...a })} className="text-aqua-soft hover:text-ink">
                  Edit flow →
                </button>
              </div>
            </Glass>
          ))}
        </div>
      )}

      <Modal open={gallery} onClose={() => setGallery(false)} title="Automation templates" description="Battle-tested workflows from top-performing shops." size="lg">
        {templates.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-4">No templates available.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {templates.map((t, i) => (
              <button
                key={i}
                onClick={() => {
                  setGallery(false);
                  setDraft({
                    ...blankDraft(),
                    name: t.name ?? "Untitled",
                    description: t.description ?? "",
                    trigger: (t.trigger as AutomationTrigger) ?? "job.completed",
                    conditions: t.conditions ?? [],
                    actions: t.actions ?? [],
                  });
                }}
                className="rounded-2xl border border-ink/[0.08] bg-ink/[0.03] p-4 text-left transition hover:-translate-y-0.5 hover:border-aqua/40 hover:bg-ink/[0.06]"
              >
                <p className="text-sm font-medium text-ink">{t.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-ink-3">{t.description}</p>
                <p className="mt-3 text-[11px] text-iris-soft">
                  {triggerLabel(t.trigger ?? "")} → {(t.actions ?? []).map((a) => actionMeta(a.type).label).join(" → ")}
                </p>
              </button>
            ))}
          </div>
        )}
      </Modal>

      {draft && <Builder initial={draft} onClose={() => setDraft(null)} />}
    </>
  );
}

/* ── Visual builder ────────────────────────────────────────────────────── */

function Connector() {
  return (
    <div className="flex justify-center py-1" aria-hidden>
      <div className="relative h-8 w-px bg-gradient-to-b from-iris via-aqua to-iris shadow-[0_0_12px_var(--color-aqua)]">
        <motion.span
          className="absolute -left-[3px] size-[7px] rounded-full bg-aqua shadow-[0_0_10px_var(--color-aqua)]"
          animate={{ top: ["0%", "100%"] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}

function Node({ icon, title, tone, children, actions }: { icon: ReactNode; title: string; tone: "iris" | "aqua" | "plasma"; children: ReactNode; actions?: ReactNode }) {
  const ring = { iris: "from-iris to-iris-soft", aqua: "from-aqua to-info", plasma: "from-plasma to-ember" }[tone];
  return (
    <div className="glass-2 rim rounded-3xl p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <span className={cn("flex size-8 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", ring)}>{icon}</span>
        <p className="flex-1 text-sm font-semibold text-ink">{title}</p>
        {actions}
      </div>
      {children}
    </div>
  );
}

function Builder({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [log, setLog] = useState<string[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const trig = useMemo(() => triggers.find((t) => t.value === d.trigger), [d.trigger]);

  const setAction = (i: number, a: AutomationAction) => setD({ ...d, actions: d.actions.map((x, idx) => (idx === i ? a : x)) });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...d.actions];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    setD({ ...d, actions: next });
  };

  async function save() {
    if (!d.name.trim()) {
      toast.error("Give your automation a name");
      return;
    }
    if (!d.actions.length) {
      toast.error("Add at least one action");
      return;
    }
    setSaving(true);
    try {
      const body = { name: d.name, description: d.description, enabled: d.enabled, trigger: d.trigger, conditions: d.conditions, actions: d.actions };
      const saved = d._id ? await api.patch<Automation>(`/automations/${d._id}`, body) : await api.post<Automation>("/automations", body);
      setD({ ...d, _id: saved._id });
      invalidate("/automations");
      toast.success("Automation saved");
      return saved;
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    let id = d._id;
    if (!id) id = (await save())?._id;
    if (!id) return;
    setTesting(true);
    try {
      const r = await api.post<{ ok: boolean; log: string[] }>(`/automations/${id}/test`, {});
      setLog(r.log?.length ? r.log : [r.ok ? "Test run completed." : "Test run failed."]);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setTesting(false);
    }
  }

  async function remove() {
    if (!d._id) return onClose();
    try {
      await api.delete(`/automations/${d._id}`);
      invalidate("/automations");
      toast.success("Automation deleted");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      width={680}
      title={d._id ? "Edit automation" : "New automation"}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {d._id ? (
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={test} loading={testing}>
              <FlaskConical className="size-4" /> Test run
            </Button>
            <Button size="sm" onClick={() => void save()} loading={saving}>
              Save automation
            </Button>
          </div>
        </div>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Name">
          <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Post-coating review request" />
        </Field>
        <label className="flex h-11 items-center gap-2 text-sm text-ink-2">
          <Switch checked={d.enabled} onChange={(v) => setD({ ...d, enabled: v })} label="Enabled" /> Enabled
        </label>
        <Field label="Description" className="sm:col-span-2">
          <Input value={d.description ?? ""} onChange={(e) => setD({ ...d, description: e.target.value })} placeholder="What does this workflow do?" />
        </Field>
      </div>

      <Node icon={<Zap className="size-4" />} title="When this happens" tone="iris">
        <Select value={d.trigger} onChange={(e) => setD({ ...d, trigger: e.target.value as AutomationTrigger })} aria-label="Trigger">
          {triggers.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        {trig && <p className="mt-2 text-xs text-ink-4">{trig.hint}</p>}
      </Node>

      <Connector />

      <Node
        icon={<Filter className="size-4" />}
        title={d.conditions.length ? "Only if all of these match" : "Conditions (optional)"}
        tone="plasma"
        actions={
          <Button size="xs" variant="ghost" onClick={() => setD({ ...d, conditions: [...d.conditions, { field: "job.total", op: "gt", value: 500 }] })}>
            <Plus className="size-3.5" /> Add
          </Button>
        }
      >
        {d.conditions.length === 0 ? (
          <p className="text-xs text-ink-4">Runs every time the trigger fires.</p>
        ) : (
          <div className="space-y-2">
            {d.conditions.map((c, i) => (
              <div key={i} className="grid grid-cols-[1fr_92px_1fr_32px] gap-2">
                <Input
                  list="auto-fields"
                  value={c.field}
                  onChange={(e) => setD({ ...d, conditions: d.conditions.map((x, idx) => (idx === i ? { ...x, field: e.target.value } : x)) })}
                  className="h-10 font-mono text-xs"
                  aria-label="Field"
                />
                <Select
                  value={c.op}
                  onChange={(e) =>
                    setD({ ...d, conditions: d.conditions.map((x, idx) => (idx === i ? { ...x, op: e.target.value as typeof c.op } : x)) })
                  }
                  className="h-10 text-xs"
                  aria-label="Operator"
                >
                  <option value="eq">equals</option>
                  <option value="neq">not equal</option>
                  <option value="gt">greater than</option>
                  <option value="lt">less than</option>
                  <option value="contains">contains</option>
                </Select>
                <Input
                  value={String(c.value)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const value = raw !== "" && !Number.isNaN(Number(raw)) ? Number(raw) : raw;
                    setD({ ...d, conditions: d.conditions.map((x, idx) => (idx === i ? { ...x, value } : x)) });
                  }}
                  className="h-10 text-xs"
                  aria-label="Value"
                />
                <button
                  onClick={() => setD({ ...d, conditions: d.conditions.filter((_, idx) => idx !== i) })}
                  className="rounded-full text-ink-4 hover:text-danger"
                  aria-label="Remove condition"
                >
                  <X className="mx-auto size-4" />
                </button>
              </div>
            ))}
            <datalist id="auto-fields">
              {conditionFields.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
        )}
      </Node>

      {d.actions.map((a, i) => {
        const M = actionMeta(a.type);
        return (
          <div key={i}>
            <Connector />
            <Node
              icon={<M.icon className="size-4" />}
              title={`Step ${i + 1}`}
              tone="aqua"
              actions={
                <div className="flex items-center gap-0.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded-full p-1.5 text-ink-4 hover:bg-ink/10 hover:text-ink disabled:opacity-30" aria-label="Move up">
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === d.actions.length - 1}
                    className="rounded-full p-1.5 text-ink-4 hover:bg-ink/10 hover:text-ink disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setD({ ...d, actions: d.actions.filter((_, idx) => idx !== i) })}
                    className="rounded-full p-1.5 text-ink-4 hover:bg-danger/10 hover:text-danger"
                    aria-label="Remove step"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              }
            >
              <Select value={a.type} onChange={(e) => setAction(i, { type: e.target.value as AutomationAction["type"], config: {} })} className="mb-3" aria-label="Action type">
                {actionTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <ActionConfig action={a} onChange={(cfg) => setAction(i, { ...a, config: cfg })} />
            </Node>
          </div>
        );
      })}

      <Connector />
      <div className="flex justify-center">
        <Button variant="secondary" size="sm" onClick={() => setD({ ...d, actions: [...d.actions, { type: "send_sms", config: { template: "" } }] })}>
          <Plus className="size-4" /> Add step
        </Button>
      </div>

      <Modal open={!!log} onClose={() => setLog(null)} title="Test run" description="Simulated against your most recent matching record." size="md">
        <ol className="space-y-2 font-mono text-xs">
          {log?.map((line, i) => (
            <li key={i} className="flex gap-3 rounded-xl bg-surface-lo px-3 py-2 text-ink-2">
              <span className="text-aqua-soft">{String(i + 1).padStart(2, "0")}</span>
              <span className="whitespace-pre-wrap">{line}</span>
            </li>
          ))}
        </ol>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        danger
        title="Delete this automation?"
        description="Scheduled steps that haven't run yet will be cancelled."
        confirmLabel="Delete"
      />
    </Drawer>
  );
}

function ActionConfig({ action, onChange }: { action: AutomationAction; onChange: (cfg: Record<string, unknown>) => void }) {
  const cfg = action.config ?? {};
  const str = (k: string) => (typeof cfg[k] === "string" ? (cfg[k] as string) : "");
  const set = (k: string, v: unknown) => onChange({ ...cfg, [k]: v });

  switch (action.type) {
    case "send_sms":
    case "send_email":
      return (
        <div className="space-y-2">
          {action.type === "send_email" && <Input value={str("subject")} onChange={(e) => set("subject", e.target.value)} placeholder="Subject" className="h-10" aria-label="Email subject" />}
          <Textarea
            value={str("template")}
            onChange={(e) => set("template", e.target.value)}
            placeholder="Write your message…"
            className="min-h-24"
            aria-label="Message template"
          />
          <div className="flex flex-wrap gap-1">
            {variables.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => set("template", `${str("template")}${str("template").endsWith(" ") || !str("template") ? "" : " "}${v}`)}
                className="rounded-full border border-iris/30 bg-iris/10 px-2 py-0.5 font-mono text-[10px] text-iris-soft transition hover:bg-iris/20"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      );
    case "wait": {
      const hours = cfg.days !== undefined ? Number(cfg.days) * 24 : Number(cfg.hours ?? 24);
      const unit = cfg.days !== undefined || (hours % 24 === 0 && hours >= 24) ? "days" : "hours";
      const amount = unit === "days" ? hours / 24 : hours;
      const update = (amt: number, u: string) => onChange(u === "days" ? { days: Math.max(0, amt) } : { hours: Math.max(0, amt) });
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-3">Wait</span>
          <Input type="number" min={0} value={amount} onChange={(e) => update(Number(e.target.value), unit)} className="h-10 w-24" aria-label="Wait amount" />
          <Select value={unit} onChange={(e) => update(amount, e.target.value)} className="h-10 w-28" aria-label="Wait unit">
            <option value="hours">hours</option>
            <option value="days">days</option>
          </Select>
          <span className="text-sm text-ink-3">then continue</span>
        </div>
      );
    }
    case "notify_team":
      return (
        <div className="space-y-2">
          <Input value={str("title")} onChange={(e) => set("title", e.target.value)} placeholder="Notification title" className="h-10" aria-label="Notification title" />
          <Input value={str("message")} onChange={(e) => set("message", e.target.value)} placeholder="Details (supports variables)" className="h-10" aria-label="Notification message" />
        </div>
      );
    case "add_tag":
      return <Input value={str("tag")} onChange={(e) => set("tag", e.target.value)} placeholder="e.g. vip, coating-client" className="h-10" aria-label="Tag" />;
    case "update_stage":
      return (
        <Select value={str("stage") || "completed"} onChange={(e) => set("stage", e.target.value)} className="h-10" aria-label="Stage">
          {(Object.keys(stageMeta) as JobStage[]).map((s) => (
            <option key={s} value={s}>
              {stageMeta[s].label}
            </option>
          ))}
        </Select>
      );
  }
}

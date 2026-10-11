"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileUp,
  KeyRound,
  Link2,
  Lock,
  Pencil,
  Plug,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Unplug,
  Webhook as WebhookIcon,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { ApiKey, IntegrationProvider, IntegrationStatus, Paginated, PlanId, Webhook } from "@/lib/types";
import { parseCsv } from "@/lib/csv";
import { cn, formatDateTime, relativeTime, titleCase } from "@/lib/utils";
import { Badge, Button, ConfirmDialog, EmptyState, Field, Glass, Input, Modal, Segmented, Select, Skeleton, Switch } from "@/components/spatial";
import { PageHeader, Table, Td, Th } from "@/components/app/ui";
import { useAuth } from "@/components/app/auth-provider";

type Tab = "integrations" | "api-keys" | "webhooks" | "data";
const listOf = <T,>(d: T[] | Paginated<T> | undefined) => (Array.isArray(d) ? d : (d?.items ?? []));
const planRank: Record<PlanId, number> = { express: 0, pro: 1, enterprise: 2 };

export default function IntegrationsPage() {
  return (
    <Suspense fallback={null}>
      <Integrations />
    </Suspense>
  );
}

function Integrations() {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("tab") as Tab | null;
  const tab: Tab = raw && ["integrations", "api-keys", "webhooks", "data"].includes(raw) ? raw : "integrations";
  return (
    <>
      <PageHeader title="Integrations" description="Connect accounting, payments and messaging — or build your own with API keys and signed webhooks." />
      <div className="mb-5 overflow-x-auto">
        <Segmented
          value={tab}
          onChange={(v) => router.replace(`/app/integrations?tab=${v}`, { scroll: false })}
          options={[
            { value: "integrations", label: <><Plug className="size-4" /> Integrations</> },
            { value: "api-keys", label: <><KeyRound className="size-4" /> API keys</> },
            { value: "webhooks", label: <><WebhookIcon className="size-4" /> Webhooks</> },
            { value: "data", label: <><FileUp className="size-4" /> Import & export</> },
          ]}
        />
      </div>
      {tab === "integrations" && <Providers />}
      {tab === "api-keys" && (
        <DevGate>
          <ApiKeys />
        </DevGate>
      )}
      {tab === "webhooks" && (
        <DevGate>
          <Webhooks />
        </DevGate>
      )}
      {tab === "data" && <ImportExport />}
    </>
  );
}

function DevGate({ children }: { children: React.ReactNode }) {
  const { can } = useAuth();
  if (can("api_access")) return <>{children}</>;
  return (
    <Glass tier={2} rim className="mx-auto max-w-xl p-10 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-iris to-aqua">
        <Lock className="size-6 text-white" />
      </span>
      <h2 className="mt-5 text-xl font-semibold">Developer platform is on Enterprise</h2>
      <p className="mt-2 text-sm text-ink-3">API keys, signed webhooks and Zapier let you wire Lustra into anything.</p>
      <Button href="/app/settings?tab=billing" className="mt-6">
        Upgrade to Enterprise
      </Button>
    </Glass>
  );
}

/* ── Providers ─────────────────────────────────────────────────────────── */

const monogram: Record<IntegrationProvider, { text: string; bg: string }> = {
  quickbooks: { text: "QB", bg: "linear-gradient(135deg,#34d399,#059669)" },
  stripe: { text: "St", bg: "linear-gradient(135deg,#a594ff,#6d28d9)" },
  square: { text: "Sq", bg: "linear-gradient(135deg,#94a3b8,#334155)" },
  zapier: { text: "Zp", bg: "linear-gradient(135deg,#fb923c,#ea580c)" },
  google: { text: "Gb", bg: "linear-gradient(135deg,#60a5fa,#2563eb)" },
  twilio: { text: "Tw", bg: "linear-gradient(135deg,#fb7185,#e11d48)" },
  carfax: { text: "Cx", bg: "linear-gradient(135deg,#38bdf8,#0369a1)" },
  mailchimp: { text: "Mc", bg: "linear-gradient(135deg,#fbbf24,#ca8a04)" },
};

function Providers() {
  const { shop } = useAuth();
  const router = useRouter();
  const { data, loading } = useApi<IntegrationStatus[]>("/integrations");
  const [connecting, setConnecting] = useState<IntegrationStatus | null>(null);
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<{ name: string; lines: string[] } | null>(null);
  const [disconnecting, setDisconnecting] = useState<IntegrationStatus | null>(null);

  function handleError(e: unknown) {
    if (e instanceof ApiError && e.code === "PLAN_REQUIRED") {
      const plan = (e.details as { requiredPlan?: string } | undefined)?.requiredPlan;
      toast.error(`This integration needs the ${titleCase(plan ?? "a higher")} plan`, { action: { label: "Upgrade", onClick: () => router.push("/app/settings?tab=billing") } });
    } else toast.error(errorMessage(e));
  }

  async function connect() {
    if (!connecting) return;
    setBusy(connecting.provider);
    try {
      await api.post(`/integrations/${connecting.provider}/connect`, { account: account || undefined });
      invalidate("/integrations");
      toast.success(`${connecting.name} connected`);
      setConnecting(null);
      setAccount("");
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(null);
    }
  }

  async function act(i: IntegrationStatus, action: "disconnect" | "sync") {
    setBusy(i.provider);
    try {
      const r = await api.post<{ ok: boolean; synced?: number; log?: string[] }>(`/integrations/${i.provider}/${action}`);
      invalidate("/integrations");
      if (action === "sync") {
        toast.success(`${i.name}: ${r.synced ?? 0} records synced`);
        if (r.log?.length) setLog({ name: i.name, lines: r.log });
      } else {
        toast.success(`${i.name} disconnected`);
        setDisconnecting(null);
      }
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(null);
    }
  }

  if (loading)
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-52" />
        ))}
      </div>
    );

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(data ?? []).map((i) => {
          const m = monogram[i.provider] ?? { text: i.name.slice(0, 2), bg: "linear-gradient(135deg,#7c5cff,#22d3ee)" };
          const locked = !!i.requiredPlan && planRank[shop.plan] < planRank[i.requiredPlan];
          const connected = i.status === "connected";
          return (
            <Glass key={i.provider} className={cn("flex flex-col p-5", connected && "border-success/30")}>
              <div className="flex items-start justify-between">
                <span className="flex size-12 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-lg" style={{ background: m.bg }} aria-hidden>
                  {m.text}
                </span>
                {connected ? (
                  <Badge tone="success" dot>
                    Connected
                  </Badge>
                ) : locked ? (
                  <Badge tone="iris">
                    <Lock className="size-3" /> {titleCase(i.requiredPlan!)}
                  </Badge>
                ) : (
                  <Badge>Available</Badge>
                )}
              </div>
              <p className="mt-4 text-sm font-semibold text-ink">{i.name}</p>
              <p className="text-[11px] tracking-wide text-ink-4 uppercase">{i.category}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-3">{i.description}</p>
              {connected && (
                <p className="mt-3 text-[11px] text-ink-4">
                  {i.account && <span className="text-ink-2">{i.account} · </span>}
                  {i.lastSyncAt ? `Synced ${relativeTime(i.lastSyncAt)}` : `Connected ${relativeTime(i.connectedAt)}`}
                </p>
              )}
              <div className="mt-auto flex gap-2 pt-4">
                {connected ? (
                  <>
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => void act(i, "sync")} loading={busy === i.provider}>
                      <RefreshCw className="size-3.5" /> Sync now
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDisconnecting(i)} aria-label={`Disconnect ${i.name}`}>
                      <Unplug className="size-4" />
                    </Button>
                  </>
                ) : locked ? (
                  <Button size="sm" variant="outline" className="flex-1" href="/app/settings?tab=billing">
                    Upgrade to connect
                  </Button>
                ) : (
                  <Button size="sm" className="flex-1" onClick={() => setConnecting(i)}>
                    <Link2 className="size-3.5" /> Connect
                  </Button>
                )}
              </div>
            </Glass>
          );
        })}
      </div>

      <Modal
        open={!!connecting}
        onClose={() => setConnecting(null)}
        title={`Connect ${connecting?.name ?? ""}`}
        description="You'll be redirected to authorize in production. In this environment the connection is simulated."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConnecting(null)}>
              Cancel
            </Button>
            <Button onClick={connect} loading={!!busy}>
              Authorize <ArrowRight className="size-4" />
            </Button>
          </>
        }
      >
        <Field label="Account label (optional)" hint="e.g. the company file or account email">
          <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Apex Auto Spa LLC" />
        </Field>
      </Modal>
      <Modal open={!!log} onClose={() => setLog(null)} title={`${log?.name ?? ""} sync log`}>
        <ol className="space-y-1.5 font-mono text-xs">
          {log?.lines.map((l, i) => (
            <li key={i} className="rounded-xl bg-surface-lo px-3 py-2 text-ink-2">
              {l}
            </li>
          ))}
        </ol>
      </Modal>
      <ConfirmDialog
        open={!!disconnecting}
        onClose={() => setDisconnecting(null)}
        onConfirm={() => disconnecting && void act(disconnecting, "disconnect")}
        danger
        title={`Disconnect ${disconnecting?.name ?? ""}?`}
        description="Syncing stops immediately. Data already synced stays in both systems."
        confirmLabel="Disconnect"
      />
    </>
  );
}

/* ── API keys ──────────────────────────────────────────────────────────── */

function CopyField({ value, mono = true, label }: { value: string; mono?: boolean; label: string }) {
  return (
    <div className="glass-inset flex items-center gap-2 rounded-2xl py-1.5 pr-1.5 pl-4">
      <span className={cn("flex-1 truncate text-sm text-ink", mono && "font-mono text-xs")}>{value}</span>
      <Button
        size="xs"
        variant="secondary"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast.success(`${label} copied`);
        }}
        aria-label={`Copy ${label}`}
      >
        <Copy className="size-3.5" />
      </Button>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-2xl bg-ink/40 p-4 font-mono text-[11px] leading-relaxed text-ink-2">{code}</pre>
      <button
        onClick={() => {
          void navigator.clipboard.writeText(code);
          toast.success("Snippet copied");
        }}
        className="absolute top-2 right-2 rounded-lg bg-ink/10 p-1.5 text-ink-3 hover:text-ink"
        aria-label="Copy snippet"
      >
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}

function ApiKeys() {
  const { data, loading } = useApi<ApiKey[] | Paginated<ApiKey>>("/api-keys");
  const keys = listOf(data);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ name: string; key: string } | null>(null);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.lustra.app";

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const r = await api.post<{ apiKey: string; key: ApiKey }>("/api-keys", { name: name.trim() });
      setRevealed({ name: name.trim(), key: r.apiKey });
      setName("");
      invalidate("/api-keys");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function revoke() {
    if (!revoking) return;
    try {
      await api.delete(`/api-keys/${revoking._id}`);
      invalidate("/api-keys");
      toast.success(`${revoking.name} revoked`);
      setRevoking(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <div className="space-y-4">
        <Glass className="p-5">
          <form onSubmit={create} className="flex flex-col gap-2 sm:flex-row">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. “Website booking sync”" aria-label="Key name" />
            <Button type="submit" loading={creating} disabled={!name.trim()} className="h-11 shrink-0">
              <Plus className="size-4" /> Create key
            </Button>
          </form>
          {revealed && (
            <div className="mt-4 rounded-2xl border border-warning/40 bg-warning/10 p-4">
              <p className="text-sm font-semibold text-warning">Copy “{revealed.name}” now — it won&apos;t be shown again.</p>
              <div className="mt-3">
                <CopyField value={revealed.key} label="API key" />
              </div>
              <Button size="xs" variant="ghost" className="mt-2" onClick={() => setRevealed(null)}>
                I&apos;ve saved it
              </Button>
            </div>
          )}
        </Glass>
        <Glass className="overflow-hidden">
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : keys.length === 0 ? (
            <EmptyState icon={<KeyRound className="size-7" />} title="No API keys" description="Create a key to read and write Lustra data from your own systems." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Key</Th>
                  <Th>Created</Th>
                  <Th>Last used</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k._id} className={cn("hover:bg-ink/[0.03]", k.revokedAt && "opacity-50")}>
                    <Td className="text-ink">{k.name}</Td>
                    <Td className="font-mono text-xs">{k.prefix}••••••••</Td>
                    <Td>{relativeTime(k.createdAt)}</Td>
                    <Td>{k.lastUsedAt ? relativeTime(k.lastUsedAt) : "Never"}</Td>
                    <Td className="text-right">
                      {k.revokedAt ? (
                        <Badge tone="danger">Revoked</Badge>
                      ) : (
                        <Button size="xs" variant="danger" onClick={() => setRevoking(k)}>
                          Revoke
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Glass>
      </div>
      <Glass className="p-5">
        <p className="text-sm font-semibold">Quick start</p>
        <p className="mt-1 mb-3 text-xs text-ink-3">Every request authenticates as the shop owner with a Bearer token.</p>
        <CodeBlock
          code={`curl ${origin}/api/customers?pageSize=5 \\\n  -H "Authorization: Bearer lx_live_your_key_here"\n\ncurl -X POST ${origin}/api/jobs \\\n  -H "Authorization: Bearer lx_live_your_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '{"customer":"<id>","title":"Full detail"}'`}
        />
      </Glass>
      <ConfirmDialog
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={revoke}
        danger
        title={`Revoke ${revoking?.name ?? "key"}?`}
        description="Any integration using it stops working immediately."
        confirmLabel="Revoke key"
      />
    </div>
  );
}

/* ── Webhooks ──────────────────────────────────────────────────────────── */

const webhookEvents = [
  "job.created",
  "job.updated",
  "job.stage_changed",
  "job.completed",
  "quote.sent",
  "quote.approved",
  "invoice.created",
  "invoice.paid",
  "invoice.overdue",
  "booking.created",
  "customer.created",
  "lead.created",
  "inspection.signed",
];

const verifySnippet = `import crypto from "node:crypto";
import express from "express";

const app = express();
app.post("/lustra-webhook", express.raw({ type: "application/json" }), (req, res) => {
  const expected = "sha256=" + crypto
    .createHmac("sha256", process.env.LUSTRA_WEBHOOK_SECRET)
    .update(req.body) // raw bytes, not parsed JSON
    .digest("hex");
  const given = req.get("X-Lustra-Signature") ?? "";
  const ok = given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return res.status(401).end();

  const { event, data } = JSON.parse(req.body.toString());
  console.log("Lustra event", event, data);
  res.sendStatus(200);
});`;

function Webhooks() {
  const { data, loading } = useApi<Webhook[] | Paginated<Webhook>>("/webhooks");
  const hooks = listOf(data);
  const [editing, setEditing] = useState<Webhook | "new" | null>(null);
  const [deleting, setDeleting] = useState<Webhook | null>(null);
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function test(h: Webhook) {
    setTesting(h._id);
    try {
      const r = await api.post<{ status?: string; code?: number; durationMs?: number; error?: string }>(`/webhooks/${h._id}/test`);
      invalidate("/webhooks");
      if (r.status === "failed") toast.error(`Test delivery failed${r.code ? ` (HTTP ${r.code})` : ""}`);
      else toast.success(`Delivered${r.code ? ` · HTTP ${r.code}` : ""}${r.durationMs ? ` in ${r.durationMs} ms` : ""}`);
      setOpen(h._id);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setTesting(null);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api.delete(`/webhooks/${deleting._id}`);
      invalidate("/webhooks");
      toast.success("Webhook deleted");
      setDeleting(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_440px]">
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Add endpoint
          </Button>
        </div>
        {loading ? (
          <Skeleton className="h-40" />
        ) : hooks.length === 0 ? (
          <Glass>
            <EmptyState icon={<WebhookIcon className="size-7" />} title="No webhook endpoints" description="Get a signed POST the instant a job, quote, invoice or lead changes." />
          </Glass>
        ) : (
          hooks.map((h) => (
            <Glass key={h._id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-ink">{h.url}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {h.events.map((ev) => (
                      <Badge key={ev} tone="iris">
                        {ev}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge tone={h.active ? "success" : "neutral"} dot>
                    {h.active ? "Active" : "Paused"}
                  </Badge>
                  <Button size="xs" variant="secondary" onClick={() => void test(h)} loading={testing === h._id}>
                    <Send className="size-3.5" /> Test
                  </Button>
                  <button onClick={() => setEditing(h)} className="rounded-full p-1.5 text-ink-4 hover:bg-ink/10 hover:text-ink" aria-label="Edit webhook">
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => setDeleting(h)} className="rounded-full p-1.5 text-ink-4 hover:bg-danger/10 hover:text-danger" aria-label="Delete webhook">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-ink-4">Signing secret</span>
                <span className="font-mono text-xs text-ink-2">{shown[h._id] ? h.secret : "whsec_••••••••••••••••"}</span>
                <button onClick={() => setShown((s) => ({ ...s, [h._id]: !s[h._id] }))} className="text-ink-4 hover:text-ink" aria-label={shown[h._id] ? "Hide secret" : "Reveal secret"}>
                  {shown[h._id] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(h.secret);
                    toast.success("Secret copied");
                  }}
                  className="text-ink-4 hover:text-ink"
                  aria-label="Copy secret"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
              <button onClick={() => setOpen(open === h._id ? null : h._id)} className="mt-3 text-xs text-aqua-soft hover:text-ink">
                {open === h._id ? "Hide" : "Show"} recent deliveries ({h.deliveries.length})
              </button>
              {open === h._id && (
                <ul className="mt-2 space-y-1">
                  {h.deliveries.length === 0 && <li className="text-xs text-ink-4">No deliveries yet — send a test.</li>}
                  {[...h.deliveries].reverse().map((d, i) => (
                    <li key={i} className="flex items-center gap-3 rounded-xl bg-surface-lo px-3 py-2 font-mono text-[11px]">
                      {d.status === "success" ? <CheckCircle2 className="size-3.5 text-success" /> : <XCircle className="size-3.5 text-danger" />}
                      <span className="text-ink-2">{d.event}</span>
                      <span className="text-ink-4">{d.code ?? "—"}</span>
                      <span className="text-ink-4">{d.durationMs ?? "—"} ms</span>
                      <span className="ml-auto text-ink-4">{formatDateTime(d.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Glass>
          ))
        )}
      </div>
      <Glass className="h-fit p-5">
        <p className="text-sm font-semibold">Verify signatures</p>
        <p className="mt-1 mb-3 text-xs text-ink-3">
          Each delivery is a JSON POST <span className="font-mono">{"{ id, event, createdAt, data }"}</span> with an <span className="font-mono">X-Lustra-Signature</span> HMAC-SHA256 header.
        </p>
        <CodeBlock code={verifySnippet} />
      </Glass>
      <WebhookModal hook={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} danger title="Delete this endpoint?" description="Deliveries stop immediately." confirmLabel="Delete" />
    </div>
  );
}

function WebhookModal({ hook, onClose }: { hook: Webhook | "new" | null; onClose: () => void }) {
  const isNew = hook === "new";
  const [form, setForm] = useState({ url: "", events: ["job.created", "invoice.paid"] as string[], active: true });
  const [last, setLast] = useState<typeof hook>(null);
  const [saving, setSaving] = useState(false);
  if (hook !== last) {
    setLast(hook);
    if (hook && hook !== "new") setForm({ url: hook.url, events: hook.events, active: hook.active });
    else if (hook === "new") setForm({ url: "", events: ["job.created", "invoice.paid"], active: true });
  }
  const valid = /^https?:\/\/\S+$/.test(form.url) && form.events.length > 0;

  async function save() {
    setSaving(true);
    try {
      if (isNew) await api.post("/webhooks", form);
      else if (hook) await api.patch(`/webhooks/${hook._id}`, form);
      invalidate("/webhooks");
      toast.success(isNew ? "Endpoint added" : "Endpoint updated");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!hook}
      onClose={onClose}
      title={isNew ? "Add webhook endpoint" : "Edit endpoint"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!valid}>
            Save endpoint
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Endpoint URL">
          <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value.trim() })} placeholder="https://example.com/lustra-webhook" className="font-mono text-xs" />
        </Field>
        <Field label="Events" hint={`${form.events.length} selected`}>
          <div className="flex flex-wrap gap-1.5">
            {webhookEvents.map((ev) => {
              const on = form.events.includes(ev);
              return (
                <button
                  key={ev}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setForm({ ...form, events: on ? form.events.filter((x) => x !== ev) : [...form.events, ev] })}
                  className={cn("rounded-full border px-3 py-1 font-mono text-[11px] transition", on ? "border-iris/50 bg-iris/15 text-iris-soft" : "border-ink/10 text-ink-3 hover:text-ink")}
                >
                  {ev}
                </button>
              );
            })}
          </div>
        </Field>
        <label className="flex items-center gap-3 text-sm text-ink-2">
          <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Active" /> Active
        </label>
      </div>
    </Modal>
  );
}

/* ── Import & export ───────────────────────────────────────────────────── */

const exportEntities = ["customers", "vehicles", "jobs", "invoices", "payments", "inventory"] as const;
const importFields = [
  { key: "firstName", label: "First name", match: /^(first|first ?name|given)/i },
  { key: "lastName", label: "Last name", match: /^(last|last ?name|surname|family)/i },
  { key: "fullName", label: "Full name (split)", match: /^(name|full ?name|customer|client)$/i },
  { key: "email", label: "Email", match: /e-?mail/i },
  { key: "phone", label: "Phone", match: /phone|mobile|cell|tel/i },
  { key: "tags", label: "Tags", match: /tag/i },
  { key: "source", label: "Source", match: /source|referr/i },
  { key: "notes", label: "Notes", match: /note|comment/i },
] as const;
type ImportKey = (typeof importFields)[number]["key"];
type ImportResult = { created: number; updated: number; skipped: number; errors: { row: number; message: string }[] };

function ImportExport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<number, ImportKey | "">>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const header = rows?.[0] ?? [];
  const body = useMemo(() => rows?.slice(1) ?? [], [rows]);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ""));
      if (parsed.length < 2) return void toast.error("That CSV has no data rows");
      setRows(parsed);
      setFileName(file.name);
      setResult(null);
      const used = new Set<string>();
      const auto: Record<number, ImportKey | ""> = {};
      parsed[0]!.forEach((h, i) => {
        const f = importFields.find((x) => x.match.test(h.trim()) && !used.has(x.key));
        auto[i] = f?.key ?? "";
        if (f) used.add(f.key);
      });
      setMapping(auto);
    };
    reader.readAsText(file);
  }

  const mapped = useMemo(
    () =>
      body.map((r) => {
        const out: Record<string, string | string[]> = {};
        r.forEach((cell, i) => {
          const key = mapping[i];
          const v = cell.trim();
          if (!key || !v) return;
          if (key === "fullName") {
            const [first, ...rest] = v.split(/\s+/);
            out.firstName = out.firstName || first || "";
            out.lastName = out.lastName || rest.join(" ");
          } else if (key === "tags") out.tags = v.split(/[;|,]/).map((t) => t.trim()).filter(Boolean);
          else out[key] = v;
        });
        return out;
      }),
    [body, mapping],
  );
  const hasName = Object.values(mapping).some((k) => k === "firstName" || k === "fullName");

  async function runImport() {
    setImporting(true);
    try {
      const r = await api.post<ImportResult>("/import/customers", { rows: mapped });
      setResult(r);
      invalidate("/customers");
      toast.success(`Imported: ${r.created} new, ${r.updated} updated`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Glass className="h-fit p-5">
        <p className="text-sm font-semibold">Export</p>
        <p className="mt-1 mb-4 text-xs text-ink-3">Your data is yours. Download any table as CSV, anytime.</p>
        <div className="grid grid-cols-2 gap-2">
          {exportEntities.map((e) => (
            <a
              key={e}
              href={`/api/export/${e}`}
              download={`lustra-${e}.csv`}
              className="flex items-center justify-between rounded-2xl border border-ink/10 bg-ink/[0.03] px-3 py-2.5 text-sm text-ink-2 transition hover:border-aqua/40 hover:text-ink"
            >
              {titleCase(e)} <Download className="size-4" />
            </a>
          ))}
        </div>
      </Glass>

      <Glass className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Import customers from CSV</p>
            <p className="text-xs text-ink-3">Switching from another CRM? Matching emails/phones update instead of duplicating.</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <FileUp className="size-4" /> {rows ? "Choose another file" : "Choose CSV"}
          </Button>
        </div>

        {rows && (
          <div className="mt-5 space-y-5">
            <div>
              <p className="mb-2 text-xs font-medium text-ink-2">
                1. Map columns <span className="text-ink-4">· {fileName} · {body.length} rows</span>
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {header.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-2xl bg-ink/[0.03] px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-ink">{h || `Column ${i + 1}`}</span>
                    <ArrowRight className="size-3.5 text-ink-4" />
                    <Select value={mapping[i] ?? ""} onChange={(e) => setMapping({ ...mapping, [i]: e.target.value as ImportKey | "" })} className="h-8 w-36 text-xs" aria-label={`Map ${h}`}>
                      <option value="">Skip</option>
                      {importFields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-ink-2">2. Preview (first 5 rows)</p>
              <Table>
                <thead>
                  <tr>
                    {["firstName", "lastName", "email", "phone", "tags", "source"].map((k) => (
                      <Th key={k}>{titleCase(k.replace(/([A-Z])/g, " $1"))}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mapped.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      {["firstName", "lastName", "email", "phone", "tags", "source"].map((k) => (
                        <Td key={k} className="text-xs">
                          {Array.isArray(r[k]) ? (r[k] as string[]).join(", ") : (r[k] as string) || <span className="text-ink-4">—</span>}
                        </Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={runImport} loading={importing} disabled={!hasName}>
                3. Import {body.length} customers
              </Button>
              {!hasName && <span className="text-xs text-warning">Map a first-name or full-name column to continue.</span>}
            </div>
            {result && (
              <div className="rounded-2xl border border-ink/10 bg-ink/[0.03] p-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  {(
                    [
                      ["Created", result.created, "text-success"],
                      ["Updated", result.updated, "text-info"],
                      ["Skipped", result.skipped, "text-ink-3"],
                    ] as const
                  ).map(([l, v, c]) => (
                    <div key={l}>
                      <p className={cn("text-2xl font-semibold tabular-nums", c)}>{v}</p>
                      <p className="text-[11px] text-ink-4">{l}</p>
                    </div>
                  ))}
                </div>
                {result.errors.length > 0 && (
                  <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto text-xs">
                    {result.errors.map((e, i) => (
                      <li key={i} className="rounded-lg bg-danger/10 px-3 py-1.5 text-danger">
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </Glass>
    </div>
  );
}

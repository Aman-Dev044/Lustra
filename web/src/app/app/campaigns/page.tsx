"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarHeart, Crown, Gem, Mail, Megaphone, MessageSquare, Plus, Save, Send, Sparkles, Tag, UserX, Users, Wrench } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi, useDebounced } from "@/lib/hooks/use-api";
import type { Campaign, Customer, Paginated, SegmentType } from "@/lib/types";
import { customerName } from "@/lib/domain";
import { cn, formatDate, formatMoney, formatNumber } from "@/lib/utils";
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, Field, Glass, Input, Segmented, Skeleton, Textarea } from "@/components/spatial";
import { PageHeader, PlanGate, Table, Td, Th } from "@/components/app/ui";
import { useAuth } from "@/components/app/auth-provider";

const listOf = <T,>(d: T[] | Paginated<T> | undefined) => (Array.isArray(d) ? d : (d?.items ?? []));

const segments: { type: SegmentType; label: string; hint: string; icon: typeof Users; valueLabel?: string; placeholder?: string }[] = [
  { type: "all", label: "Everyone", hint: "All customers who opted in", icon: Users },
  { type: "lapsed", label: "Lapsed", hint: "No visit in N days", icon: UserX, valueLabel: "Days since last visit", placeholder: "120" },
  { type: "due_maintenance", label: "Due for maintenance", hint: "Coated / PPF clients due a wash", icon: Wrench },
  { type: "coating_anniversary", label: "Coating anniversary", hint: "Ceramic installed ~1 year ago", icon: Gem },
  { type: "vip", label: "VIPs", hint: "Top lifetime value", icon: Crown },
  { type: "members", label: "Members", hint: "Active membership holders", icon: CalendarHeart },
  { type: "tag", label: "By tag", hint: "Customers with a tag", icon: Tag, valueLabel: "Tag", placeholder: "fleet" },
];
const variables = ["{{customer.firstName}}", "{{shop.name}}", "{{bookingLink}}"];

type Draft = Omit<Campaign, "_id" | "status" | "sentAt" | "stats" | "createdAt"> & { _id?: string; status?: Campaign["status"] };

const blank = (type: SegmentType = "all"): Draft => ({
  name: type === "lapsed" ? "We miss you — win-back" : "Spring protection offer",
  channel: "sms",
  segment: { type, value: type === "lapsed" ? 120 : undefined },
  subject: "",
  body:
    type === "lapsed"
      ? "Hi {{customer.firstName}}, it's been a while! Enjoy 15% off your next detail at {{shop.name}} this month. Book in 30 seconds: {{bookingLink}}"
      : "Hi {{customer.firstName}}! Spring is here — lock in a maintenance wash + sealant refresh at {{shop.name}}. Book: {{bookingLink}}",
});

export default function CampaignsPage() {
  return (
    <PlanGate feature="campaigns">
      <Suspense fallback={null}>
        <Campaigns />
      </Suspense>
    </PlanGate>
  );
}

function Campaigns() {
  const params = useSearchParams();
  const router = useRouter();
  const preset = params.get("segment") as SegmentType | null;
  const [draft, setDraft] = useState<Draft | null>(() => (preset && segments.some((s) => s.type === preset) ? blank(preset) : null));
  const { data, loading } = useApi<Paginated<Campaign> | Campaign[]>("/campaigns", { pageSize: 100 });
  const campaigns = listOf(data);
  const totals = campaigns.reduce(
    (t, c) => ({ sent: t.sent + c.stats.delivered, booked: t.booked + c.stats.booked, revenue: t.revenue + c.stats.revenue }),
    { sent: 0, booked: 0, revenue: 0 },
  );

  if (draft)
    return (
      <Composer
        initial={draft}
        onBack={() => {
          setDraft(null);
          if (preset) router.replace("/app/campaigns");
        }}
      />
    );

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Smart-segment SMS & email blasts that fill empty bays — with booking and revenue attribution."
        actions={
          <Button onClick={() => setDraft(blank())}>
            <Plus className="size-4" /> New campaign
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Glass className="p-5">
          <p className="text-xs text-ink-3">Messages delivered</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{formatNumber(totals.sent)}</p>
        </Glass>
        <Glass className="p-5">
          <p className="text-xs text-ink-3">Bookings attributed</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{formatNumber(totals.booked)}</p>
        </Glass>
        <Glass className="p-5">
          <p className="text-xs text-ink-3">Revenue attributed</p>
          <p className="text-spectral mt-2 text-2xl font-semibold tabular-nums">{formatMoney(totals.revenue)}</p>
        </Glass>
      </div>
      <Glass className="overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="size-7" />}
            title="No campaigns yet"
            description="Win back lapsed customers or remind coating clients about their annual inspection."
            action={
              <Button onClick={() => setDraft(blank("lapsed"))}>
                <Sparkles className="size-4" /> Start a win-back
              </Button>
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Campaign</Th>
                <Th>Segment</Th>
                <Th>Status</Th>
                <Th className="text-right">Recipients</Th>
                <Th className="text-right">Delivered</Th>
                <Th className="text-right">Booked</Th>
                <Th className="text-right">Revenue</Th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c._id} className="cursor-pointer hover:bg-white/[0.03]" onClick={() => setDraft({ ...c })}>
                  <Td>
                    <span className="flex items-center gap-2.5">
                      {c.channel === "sms" ? <MessageSquare className="size-4 text-aqua-soft" /> : <Mail className="size-4 text-info" />}
                      <span>
                        <span className="block text-ink">{c.name}</span>
                        <span className="text-[11px] text-ink-4">{c.sentAt ? `Sent ${formatDate(c.sentAt)}` : `Created ${formatDate(c.createdAt)}`}</span>
                      </span>
                    </span>
                  </Td>
                  <Td>
                    {segments.find((s) => s.type === c.segment.type)?.label ?? c.segment.type}
                    {c.segment.value !== undefined && c.segment.value !== null && c.segment.value !== "" && <span className="text-ink-4"> · {String(c.segment.value)}</span>}
                  </Td>
                  <Td>
                    <Badge tone={c.status === "sent" ? "success" : "neutral"} dot>
                      {c.status}
                    </Badge>
                  </Td>
                  <Td className="text-right tabular-nums">{c.stats.recipients}</Td>
                  <Td className="text-right tabular-nums">{c.stats.delivered}</Td>
                  <Td className="text-right tabular-nums">{c.stats.booked}</Td>
                  <Td className="text-right font-medium text-ink tabular-nums">{formatMoney(c.stats.revenue)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Glass>
    </>
  );
}

function Composer({ initial, onBack }: { initial: Draft; onBack: () => void }) {
  const { shop } = useAuth();
  const [d, setD] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const sent = d.status === "sent";
  const segValue = useDebounced(d.segment.value, 300);
  const { data: preview, loading: previewLoading } = useApi<{ count: number; sample: Customer[] }>("/campaigns/preview", {
    type: d.segment.type,
    value: segValue === undefined ? undefined : String(segValue),
  });
  const [ta, setTa] = useState<HTMLTextAreaElement | null>(null);
  const sample = preview?.sample?.[0];
  const rendered = d.body
    .replaceAll("{{customer.firstName}}", sample?.firstName || "Alex")
    .replaceAll("{{shop.name}}", shop.name)
    .replaceAll("{{bookingLink}}", `lustra.app/book/${shop.slug}`);
  const segs = Math.max(1, Math.ceil(d.body.length / 160));

  function insert(v: string) {
    const start = ta?.selectionStart ?? d.body.length;
    const end = ta?.selectionEnd ?? d.body.length;
    setD({ ...d, body: d.body.slice(0, start) + v + d.body.slice(end) });
    requestAnimationFrame(() => ta?.focus());
  }

  async function save(silent = false) {
    setSaving(true);
    try {
      const body = { name: d.name, channel: d.channel, segment: d.segment, subject: d.channel === "email" ? d.subject : undefined, body: d.body };
      const saved = d._id ? await api.patch<Campaign>(`/campaigns/${d._id}`, body) : await api.post<Campaign>("/campaigns", body);
      setD((x) => ({ ...x, _id: saved._id }));
      invalidate("/campaigns");
      if (!silent) toast.success("Draft saved");
      return saved;
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function send() {
    setSending(true);
    try {
      const saved = await save(true);
      if (!saved) return;
      const c = await api.post<Campaign>(`/campaigns/${saved._id}/send`);
      invalidate("/campaigns", "/messages");
      toast.success(`Sent to ${c.stats?.recipients ?? preview?.count ?? 0} customers`);
      setConfirm(false);
      onBack();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  const segMeta = segments.find((s) => s.type === d.segment.type)!;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <button onClick={onBack} className="rounded-full p-2 text-ink-3 hover:bg-white/10 hover:text-ink" aria-label="Back to campaigns">
              <ArrowLeft className="size-5" />
            </button>
            {d.name || "Untitled campaign"}
          </span>
        }
        description={sent ? "This campaign has been sent." : "Pick an audience, write once, personalize automatically."}
        actions={
          !sent && (
            <>
              <Button variant="secondary" onClick={() => void save()} loading={saving}>
                <Save className="size-4" /> Save draft
              </Button>
              <Button onClick={() => setConfirm(true)} disabled={!d.body.trim() || !preview?.count}>
                <Send className="size-4" /> Send now
              </Button>
            </>
          )
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Glass className="p-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field label="Campaign name">
                <Input value={d.name} disabled={sent} onChange={(e) => setD({ ...d, name: e.target.value })} />
              </Field>
              <Field label="Channel">
                <Segmented
                  value={d.channel}
                  onChange={(v) => !sent && setD({ ...d, channel: v, subject: v === "email" && !d.subject ? `A little something from ${shop.name}` : d.subject })}
                  options={[
                    { value: "sms", label: <><MessageSquare className="size-4" /> SMS</> },
                    { value: "email", label: <><Mail className="size-4" /> Email</> },
                  ]}
                />
              </Field>
            </div>
          </Glass>

          <Glass className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Audience</h2>
              <span className="text-xs text-ink-3">
                {previewLoading ? "Counting…" : <><span className="text-lg font-semibold text-ink tabular-nums">{preview?.count ?? 0}</span> recipients</>}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {segments.map((s) => {
                const on = d.segment.type === s.type;
                return (
                  <button
                    key={s.type}
                    type="button"
                    disabled={sent}
                    onClick={() => setD({ ...d, segment: { type: s.type, value: s.type === "lapsed" ? 120 : s.type === "tag" ? "" : undefined } })}
                    className={cn("flex items-start gap-3 rounded-2xl border p-3.5 text-left transition", on ? "border-aqua/50 bg-aqua/10 shadow-[var(--shadow-glow-aqua)]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20")}
                    aria-pressed={on}
                  >
                    <s.icon className={cn("mt-0.5 size-4 shrink-0", on ? "text-aqua" : "text-ink-3")} />
                    <span>
                      <span className="block text-sm text-ink">{s.label}</span>
                      <span className="text-[11px] text-ink-4">{s.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {segMeta.valueLabel && (
              <Field label={segMeta.valueLabel} className="mt-3 max-w-xs">
                <Input
                  value={d.segment.value === undefined ? "" : String(d.segment.value)}
                  disabled={sent}
                  placeholder={segMeta.placeholder}
                  inputMode={segMeta.type === "lapsed" ? "numeric" : undefined}
                  onChange={(e) => setD({ ...d, segment: { ...d.segment, value: segMeta.type === "lapsed" ? Number(e.target.value.replace(/\D/g, "")) || "" : e.target.value } })}
                />
              </Field>
            )}
            {!!preview?.sample?.length && (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {preview.sample.slice(0, 6).map((c) => (
                    <span key={c._id} className="rounded-full ring-2 ring-[#0b0e1c]" title={customerName(c)}>
                      <Avatar name={customerName(c)} size={30} />
                    </span>
                  ))}
                </div>
                <span className="text-xs text-ink-3">
                  {preview.sample
                    .slice(0, 3)
                    .map((c) => c.firstName)
                    .join(", ")}
                  {preview.count > 3 ? ` and ${preview.count - 3} more` : ""}
                </span>
              </div>
            )}
          </Glass>

          <Glass className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Message</h2>
            {d.channel === "email" && (
              <Field label="Subject" className="mb-3">
                <Input value={d.subject ?? ""} disabled={sent} onChange={(e) => setD({ ...d, subject: e.target.value })} />
              </Field>
            )}
            <Textarea ref={setTa} value={d.body} disabled={sent} onChange={(e) => setD({ ...d, body: e.target.value })} className="min-h-36" aria-label="Message body" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {variables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={sent}
                    onClick={() => insert(v)}
                    className="rounded-full border border-iris/30 bg-iris/10 px-2 py-0.5 font-mono text-[10px] text-iris-soft transition hover:bg-iris/20"
                  >
                    {v}
                  </button>
                ))}
              </div>
              {d.channel === "sms" && (
                <span className={cn("text-[11px] tabular-nums", segs > 2 ? "text-warning" : "text-ink-4")}>
                  {d.body.length} chars · {segs} segment{segs > 1 ? "s" : ""} · ~{formatNumber(segs * (preview?.count ?? 0))} SMS
                </span>
              )}
            </div>
          </Glass>
        </div>

        <div className="xl:sticky xl:top-24 xl:self-start">
          <p className="mb-2 px-1 text-xs font-medium tracking-wide text-ink-3 uppercase">Live preview</p>
          <div className="mx-auto w-[300px] rounded-[44px] border border-white/15 bg-[#05060c] p-3 shadow-[var(--shadow-lift)]">
            <div className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,#0f1328,#070914)]">
              <div className="mx-auto mt-2 h-6 w-24 rounded-full bg-black" />
              <div className="px-4 pt-4 pb-3 text-center">
                <Avatar name={shop.name} size={40} className="mx-auto" />
                <p className="mt-1.5 text-xs font-medium text-ink">{shop.name}</p>
                <p className="text-[10px] text-ink-4">{d.channel === "sms" ? "Text message" : "Email"}</p>
              </div>
              <div className="min-h-[340px] px-3 pb-6">
                {d.channel === "email" && d.subject && <p className="mb-2 px-1 text-xs font-semibold text-ink">{d.subject}</p>}
                <div className={cn("max-w-[90%] rounded-3xl rounded-bl-lg px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap", d.channel === "sms" ? "bg-white/[0.12] text-ink" : "bg-white text-[#111]")}>
                  {rendered || <span className="opacity-50">Your message…</span>}
                </div>
                <p className="mt-1 px-2 text-[10px] text-ink-4">Now</p>
              </div>
            </div>
          </div>
          {sent && "stats" in initial && (
            <Glass className="mt-4 grid grid-cols-2 gap-3 p-4 text-center">
              {(["recipients", "delivered", "booked"] as const).map((k) => (
                <div key={k}>
                  <p className="text-lg font-semibold tabular-nums">{(initial as Campaign).stats[k]}</p>
                  <p className="text-[11px] text-ink-4 capitalize">{k}</p>
                </div>
              ))}
              <div>
                <p className="text-lg font-semibold text-success tabular-nums">{formatMoney((initial as Campaign).stats.revenue)}</p>
                <p className="text-[11px] text-ink-4">Revenue</p>
              </div>
            </Glass>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={send}
        loading={sending}
        title={`Send to ${preview?.count ?? 0} customers?`}
        description={`This ${d.channel === "sms" ? "text" : "email"} goes out immediately and can't be unsent. Customers who opted out are skipped automatically.`}
        confirmLabel="Send campaign"
      />
    </>
  );
}

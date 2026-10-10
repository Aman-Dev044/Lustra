"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, Gift, MoreHorizontal, Pencil, Plus, Search, Shuffle, Ticket, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Coupon, GiftCard, Paginated, ServiceCategory } from "@/lib/types";
import { categoryMeta } from "@/lib/domain";
import { cn, formatDate, formatDateTime, formatMoney, toDateInput } from "@/lib/utils";
import {
  Badge,
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  Field,
  Glass,
  Input,
  Menu,
  Modal,
  Segmented,
  Select,
  Skeleton,
  Switch,
  Textarea,
  TiltCard,
} from "@/components/spatial";
import { PageHeader, Table, Td, Th } from "@/components/app/ui";

const listOf = <T,>(d: T[] | Paginated<T> | undefined) => (Array.isArray(d) ? d : (d?.items ?? []));
type Tab = "coupons" | "gift-cards";

export default function PromotionsPage() {
  return (
    <Suspense fallback={null}>
      <Promotions />
    </Suspense>
  );
}

function Promotions() {
  const params = useSearchParams();
  const router = useRouter();
  const tab: Tab = params.get("tab") === "gift-cards" ? "gift-cards" : "coupons";
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Promotions"
        description="Coupons and e-gift cards that redeem straight onto invoices and online bookings."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> {tab === "coupons" ? "New coupon" : "Issue gift card"}
          </Button>
        }
      />
      <div className="mb-5">
        <Segmented
          value={tab}
          onChange={(v) => router.replace(`/app/promotions?tab=${v}`, { scroll: false })}
          options={[
            { value: "coupons", label: <><Ticket className="size-4" /> Coupons</> },
            { value: "gift-cards", label: <><Gift className="size-4" /> Gift cards</> },
          ]}
        />
      </div>
      {tab === "coupons" ? (
        <Coupons creating={creating} onCreatingChange={setCreating} />
      ) : (
        <GiftCards creating={creating} onCreatingChange={setCreating} />
      )}
    </>
  );
}

/* ── Coupons ───────────────────────────────────────────────────────────── */

function Coupons({ creating, onCreatingChange }: { creating: boolean; onCreatingChange: (v: boolean) => void }) {
  const { data, loading } = useApi<Paginated<Coupon> | Coupon[]>("/coupons", { pageSize: 200 });
  const coupons = listOf(data);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);

  async function toggle(c: Coupon, active: boolean) {
    try {
      await api.patch(`/coupons/${c._id}`, { active });
      invalidate("/coupons");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api.delete(`/coupons/${deleting._id}`);
      invalidate("/coupons");
      toast.success(`${deleting.code} deleted`);
      setDeleting(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Glass className="overflow-hidden">
      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={<Ticket className="size-7" />}
          title="No coupons yet"
          description="Launch a FIRSTCOAT 15% offer or a $50 off referral code in seconds."
          action={
            <Button onClick={() => onCreatingChange(true)}>
              <Plus className="size-4" /> Create coupon
            </Button>
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Discount</Th>
              <Th>Applies to</Th>
              <Th>Usage</Th>
              <Th>Expires</Th>
              <Th className="text-center">Active</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => {
              const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
              const pct = c.maxUses ? Math.min(100, (c.uses / c.maxUses) * 100) : 0;
              return (
                <tr key={c._id} className="hover:bg-white/[0.03]">
                  <Td>
                    <p className="font-mono text-sm font-semibold tracking-wider text-ink">{c.code}</p>
                    {c.description && <p className="max-w-xs truncate text-xs text-ink-4">{c.description}</p>}
                  </Td>
                  <Td>
                    <span className="font-medium text-ink">{c.type === "percent" ? `${c.value}% off` : `${formatMoney(c.value)} off`}</span>
                    {c.minSpend > 0 && <span className="block text-[11px] text-ink-4">min {formatMoney(c.minSpend)}</span>}
                  </Td>
                  <Td>
                    {c.categories.length === 0 ? (
                      <span className="text-ink-3">All services</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {c.categories.map((cat) => (
                          <Badge key={cat}>{categoryMeta[cat]?.label ?? cat}</Badge>
                        ))}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-xs text-ink-2 tabular-nums">
                      {c.uses} {c.maxUses ? `/ ${c.maxUses}` : "uses"}
                    </span>
                    {c.maxUses ? (
                      <span className="mt-1 block h-1.5 w-28 overflow-hidden rounded-full bg-white/[0.07]">
                        <span className={cn("block h-full rounded-full", pct >= 100 ? "bg-danger" : "bg-gradient-to-r from-iris to-aqua")} style={{ width: `${pct}%` }} />
                      </span>
                    ) : null}
                  </Td>
                  <Td>{c.expiresAt ? <span className={expired ? "text-danger" : ""}>{formatDate(c.expiresAt)}</span> : "Never"}</Td>
                  <Td className="text-center">
                    <Switch checked={c.active} onChange={(v) => void toggle(c, v)} label={`${c.code} active`} />
                  </Td>
                  <Td className="text-right">
                    <Menu
                      trigger={
                        <button className="rounded-full p-1.5 text-ink-4 hover:bg-white/10 hover:text-ink" aria-label={`Actions for ${c.code}`}>
                          <MoreHorizontal className="size-4" />
                        </button>
                      }
                      items={[
                        { label: "Edit", icon: <Pencil className="size-4" />, onClick: () => setEditing(c) },
                        { label: "Delete", icon: <Trash2 className="size-4" />, danger: true, onClick: () => setDeleting(c) },
                      ]}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <CouponModal
        coupon={creating ? "new" : editing}
        onClose={() => {
          onCreatingChange(false);
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        danger
        title={`Delete ${deleting?.code ?? "coupon"}?`}
        description="Invoices that already used it keep their discount."
        confirmLabel="Delete coupon"
      />
    </Glass>
  );
}

const genCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const emptyCoupon = { code: "", description: "", type: "percent" as Coupon["type"], value: "15", minSpend: "0", maxUses: "", expiresAt: "", active: true, categories: [] as ServiceCategory[] };

function CouponModal({ coupon, onClose }: { coupon: Coupon | "new" | null; onClose: () => void }) {
  const isNew = coupon === "new";
  const [form, setForm] = useState(emptyCoupon);
  const [last, setLast] = useState<typeof coupon>(null);
  const [saving, setSaving] = useState(false);

  if (coupon !== last) {
    setLast(coupon);
    if (coupon && coupon !== "new")
      setForm({
        code: coupon.code,
        description: coupon.description ?? "",
        type: coupon.type,
        value: String(coupon.value),
        minSpend: String(coupon.minSpend ?? 0),
        maxUses: coupon.maxUses ? String(coupon.maxUses) : "",
        expiresAt: coupon.expiresAt ? toDateInput(coupon.expiresAt) : "",
        active: coupon.active,
        categories: coupon.categories ?? [],
      });
    else if (coupon === "new") setForm({ ...emptyCoupon, code: genCode() });
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        code: form.code.trim().toUpperCase(),
        description: form.description || undefined,
        type: form.type,
        value: Number(form.value) || 0,
        minSpend: Number(form.minSpend) || 0,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
        active: form.active,
        categories: form.categories,
      };
      if (isNew) await api.post("/coupons", body);
      else if (coupon) await api.patch(`/coupons/${coupon._id}`, body);
      invalidate("/coupons");
      toast.success(isNew ? `Coupon ${body.code} created` : "Coupon updated");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const toggleCat = (c: ServiceCategory) =>
    setForm({ ...form, categories: form.categories.includes(c) ? form.categories.filter((x) => x !== c) : [...form.categories, c] });

  return (
    <Modal
      open={!!coupon}
      onClose={onClose}
      title={isNew ? "New coupon" : `Edit ${form.code}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!form.code || !Number(form.value)}>
            Save coupon
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code">
          <div className="flex gap-2">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "") })} className="font-mono tracking-wider" />
            <Button type="button" variant="secondary" size="icon" className="h-11 w-11 shrink-0" onClick={() => setForm({ ...form, code: genCode() })} aria-label="Generate code">
              <Shuffle className="size-4" />
            </Button>
          </div>
        </Field>
        <Field label="Description">
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Fall ceramic promo" />
        </Field>
        <Field label="Discount">
          <div className="flex gap-2">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Coupon["type"] })} className="w-36">
              <option value="percent">Percent</option>
              <option value="fixed">Fixed $</option>
            </Select>
            <Input type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} aria-label="Discount value" />
          </div>
        </Field>
        <Field label="Minimum spend ($)">
          <Input type="number" min={0} value={form.minSpend} onChange={(e) => setForm({ ...form, minSpend: e.target.value })} />
        </Field>
        <Field label="Max uses" hint="Leave empty for unlimited">
          <Input type="number" min={1} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
        </Field>
        <Field label="Expires on" hint="Leave empty to never expire">
          <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        </Field>
        <Field label="Applies to" hint={form.categories.length ? `${form.categories.length} categories selected` : "All service categories"} className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(categoryMeta) as ServiceCategory[]).map((c) => {
              const on = form.categories.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCat(c)}
                  aria-pressed={on}
                  className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition", on ? "border-aqua/50 bg-aqua/15 text-aqua-soft" : "border-white/10 text-ink-3 hover:text-ink")}
                >
                  <span className="size-1.5 rounded-full" style={{ background: categoryMeta[c].color }} />
                  {categoryMeta[c].label}
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

/* ── Gift cards ────────────────────────────────────────────────────────── */

const giftStatusTone = { active: "success", depleted: "neutral", void: "danger" } as const;
const giftGradients = [
  "linear-gradient(135deg,#7c5cff 0%,#3b2a8f 45%,#0e1430 100%)",
  "linear-gradient(135deg,#22d3ee 0%,#155e75 45%,#0b1424 100%)",
  "linear-gradient(135deg,#f472b6 0%,#7c2d5f 45%,#140c1f 100%)",
  "linear-gradient(135deg,#fb923c 0%,#7c3a14 45%,#160e0a 100%)",
];

function GiftCards({ creating, onCreatingChange }: { creating: boolean; onCreatingChange: (v: boolean) => void }) {
  const { data, loading } = useApi<Paginated<GiftCard> | GiftCard[]>("/gift-cards", { pageSize: 200 });
  const cards = listOf(data);
  const [detail, setDetail] = useState<GiftCard | null>(null);
  const [lookup, setLookup] = useState("");
  const [looking, setLooking] = useState(false);
  const outstanding = cards.filter((c) => c.status === "active").reduce((s, c) => s + c.balance, 0);
  const sold = cards.reduce((s, c) => s + c.initialBalance, 0);

  async function find(e: React.FormEvent) {
    e.preventDefault();
    if (!lookup.trim()) return;
    setLooking(true);
    try {
      const card = await api.get<GiftCard>(`/gift-cards/lookup/${encodeURIComponent(lookup.trim().toUpperCase())}`);
      setDetail(card);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLooking(false);
    }
  }

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
        <Glass className="p-5">
          <p className="text-xs text-ink-3">Gift cards sold</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{formatMoney(sold)}</p>
        </Glass>
        <Glass className="p-5">
          <p className="text-xs text-ink-3">Outstanding balance</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{formatMoney(outstanding)}</p>
        </Glass>
        <Glass className="p-5">
          <p className="mb-2 text-xs text-ink-3">Look up a card</p>
          <form onSubmit={find} className="glass-inset flex items-center gap-2 rounded-full py-1 pr-1 pl-4">
            <Search className="size-4 text-ink-4" aria-hidden />
            <input
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              placeholder="GC-XXXX-XXXX"
              aria-label="Gift card code"
              className="h-8 flex-1 bg-transparent font-mono text-sm uppercase focus:outline-none"
            />
            <Button size="xs" type="submit" loading={looking}>
              Find
            </Button>
          </form>
        </Glass>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[1.6/1]" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <Glass>
          <EmptyState
            icon={<Gift className="size-7" />}
            title="No gift cards yet"
            description="Holiday gift cards are pure upfront cash flow — and 1 in 3 recipients become regulars."
            action={
              <Button onClick={() => onCreatingChange(true)}>
                <Plus className="size-4" /> Issue gift card
              </Button>
            }
          />
        </Glass>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c, i) => (
            <TiltCard key={c._id} max={7}>
              <GiftCardVisual card={c} gradient={giftGradients[i % giftGradients.length]!} onClick={() => setDetail(c)} />
            </TiltCard>
          ))}
        </div>
      )}

      <IssueGiftCardModal open={creating} onClose={() => onCreatingChange(false)} />
      <GiftCardDrawer card={detail} onClose={() => setDetail(null)} onChanged={setDetail} />
    </>
  );
}

function GiftCardVisual({ card, gradient, onClick }: { card: GiftCard; gradient: string; onClick?: () => void }) {
  const pct = card.initialBalance ? Math.max(0, Math.min(100, (card.balance / card.initialBalance) * 100)) : 0;
  return (
    <button
      onClick={onClick}
      className={cn("rim relative flex aspect-[1.6/1] w-full flex-col justify-between overflow-hidden rounded-[24px] border border-white/15 p-5 text-left shadow-[var(--shadow-lift)]", card.status !== "active" && "grayscale-[0.7]")}
      style={{ background: gradient }}
    >
      <span className="pointer-events-none absolute -top-12 -right-10 size-44 rounded-full bg-white/15 blur-2xl" />
      <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgb(255_255_255/0.12)_50%,transparent_65%)]" />
      <span className="relative flex items-start justify-between">
        <span className="text-[10px] font-semibold tracking-[0.3em] text-white/80 uppercase">Gift card</span>
        <Badge tone={giftStatusTone[card.status]} className="border-white/20 bg-black/25">
          {card.status}
        </Badge>
      </span>
      <span className="relative">
        <span className="block text-3xl font-semibold tracking-tight text-white tabular-nums">{formatMoney(card.balance)}</span>
        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/20">
          <span className="block h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
        </span>
        <span className="mt-1 block text-[11px] text-white/70">of {formatMoney(card.initialBalance)}</span>
      </span>
      <span className="relative flex items-end justify-between gap-3">
        <span className="truncate text-sm text-white/90">{card.recipientName}</span>
        <span className="shrink-0 font-mono text-xs tracking-widest text-white/80">{card.code}</span>
      </span>
    </button>
  );
}

function IssueGiftCardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ initialBalance: "100", recipientName: "", recipientEmail: "", message: "", expiresAt: "" });
  const [saving, setSaving] = useState(false);

  async function issue() {
    setSaving(true);
    try {
      const card = await api.post<GiftCard>("/gift-cards", {
        initialBalance: Number(form.initialBalance) || 0,
        recipientName: form.recipientName,
        recipientEmail: form.recipientEmail || undefined,
        message: form.message || undefined,
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : undefined,
      });
      invalidate("/gift-cards");
      toast.success(`Gift card ${card.code} issued`);
      setForm({ initialBalance: "100", recipientName: "", recipientEmail: "", message: "", expiresAt: "" });
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Issue gift card"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={issue} loading={saving} disabled={!form.recipientName || !(Number(form.initialBalance) > 0)}>
            <Gift className="size-4" /> Issue card
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {[50, 100, 150, 250, 500].map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setForm({ ...form, initialBalance: String(a) })}
                className={cn("rounded-full border px-4 py-1.5 text-sm transition", form.initialBalance === String(a) ? "border-aqua/50 bg-aqua/15 text-aqua-soft" : "border-white/10 text-ink-3")}
              >
                ${a}
              </button>
            ))}
            <Input type="number" min={1} value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: e.target.value })} className="h-9 w-28" aria-label="Custom amount" />
          </div>
        </Field>
        <Field label="Recipient name">
          <Input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} autoFocus />
        </Field>
        <Field label="Recipient email (optional)">
          <Input type="email" value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} />
        </Field>
        <Field label="Message" className="sm:col-span-2">
          <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Happy birthday! Treat your ride." />
        </Field>
        <Field label="Expires (optional)">
          <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function GiftCardDrawer({ card, onClose, onChanged }: { card: GiftCard | null; onClose: () => void; onChanged: (c: GiftCard) => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);

  async function adjust() {
    if (!card || !Number(amount)) return;
    setBusy(true);
    try {
      const c = await api.post<GiftCard>(`/gift-cards/${card._id}/adjust`, { amount: Number(amount), note: note || "Manual adjustment" });
      onChanged(c);
      invalidate("/gift-cards");
      setAmount("");
      setNote("");
      toast.success("Balance adjusted");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function voidCard() {
    if (!card) return;
    try {
      const c = await api.patch<GiftCard>(`/gift-cards/${card._id}`, { status: "void" });
      onChanged({ ...card, ...c });
      invalidate("/gift-cards");
      toast.success("Gift card voided");
      setConfirmVoid(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Drawer open={!!card} onClose={onClose} title={card ? `Gift card ${card.code}` : ""} width={480}>
      {card && (
        <div className="space-y-5">
          <GiftCardVisual card={card} gradient={giftGradients[0]!} />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-ink-4">Recipient</dt>
              <dd className="text-ink">{card.recipientName}</dd>
              {card.recipientEmail && <dd className="text-xs text-ink-3">{card.recipientEmail}</dd>}
            </div>
            <div>
              <dt className="text-xs text-ink-4">Issued</dt>
              <dd className="text-ink">{formatDate(card.createdAt)}</dd>
              <dd className="text-xs text-ink-3">{card.expiresAt ? `Expires ${formatDate(card.expiresAt)}` : "No expiry"}</dd>
            </div>
          </dl>
          {card.message && <p className="rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-ink-2 italic">“{card.message}”</p>}

          {card.status === "active" && (
            <div className="glass-inset space-y-3 rounded-2xl p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="size-4 text-aqua-soft" /> Adjust balance
              </p>
              <div className="flex gap-2">
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="+50 or -25" className="w-32" aria-label="Adjustment amount" />
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" aria-label="Adjustment note" />
              </div>
              <Button size="sm" onClick={adjust} loading={busy} disabled={!Number(amount)}>
                Apply
              </Button>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-semibold">Transactions</p>
            {card.transactions.length === 0 ? (
              <p className="text-sm text-ink-4">No activity yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {[...card.transactions].reverse().map((t, i) => (
                  <li key={t._id ?? i} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                    <span>
                      <span className="text-ink-2">{t.note || (t.amount < 0 ? "Redeemed" : "Loaded")}</span>
                      <span className="block text-[11px] text-ink-4">{formatDateTime(t.at)}</span>
                    </span>
                    <span className={cn("font-medium tabular-nums", t.amount < 0 ? "text-danger" : "text-success")}>
                      {t.amount > 0 ? "+" : ""}
                      {formatMoney(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {card.status !== "void" && (
            <Button variant="danger" size="sm" onClick={() => setConfirmVoid(true)}>
              <Ban className="size-4" /> Void card
            </Button>
          )}
          <ConfirmDialog
            open={confirmVoid}
            onClose={() => setConfirmVoid(false)}
            onConfirm={voidCard}
            danger
            title="Void this gift card?"
            description={`The remaining ${formatMoney(card.balance)} can no longer be redeemed.`}
            confirmLabel="Void card"
          />
        </div>
      )}
    </Drawer>
  );
}

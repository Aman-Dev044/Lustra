"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useOnOpen } from "@/lib/hooks/use-list-state";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Ban, Copy, CreditCard, ExternalLink, Gift, MoreHorizontal, Printer, Send, Tag, Wrench, X } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi, useDebounced } from "@/lib/hooks/use-api";
import type { GiftCard, Invoice, Job, PaymentMethod } from "@/lib/types";
import { customerName } from "@/lib/domain";
import { cn, formatDate, formatDateTime, formatMoney, titleCase } from "@/lib/utils";
import { Badge, Button, ConfirmDialog, EmptyState, Field, Glass, Input, LogoMark, Menu, Modal, Select, Skeleton } from "@/components/spatial";
import { useAuth } from "@/components/app/auth-provider";
import { useSocketEvent } from "@/components/app/realtime-provider";
import { InvoiceStatusBadge, PageHeader } from "@/components/app/ui";
import { TotalsPanel } from "@/components/app/line-items-editor";

const METHODS: PaymentMethod[] = ["card", "cash", "ach", "check", "gift_card", "financing", "other"];
const methodLabel = (m: PaymentMethod) => (m === "ach" ? "ACH / bank transfer" : m === "gift_card" ? "Gift card" : titleCase(m));

const PRINT_CSS = `
@media print {
  @page { margin: 14mm; }
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  #invoice-print, #invoice-print * { visibility: visible !important; color: #0b0e1c !important; text-shadow: none !important; }
  #invoice-print { position: absolute; inset: 0; background: #fff !important; border: 0 !important; box-shadow: none !important; backdrop-filter: none !important; padding: 0 !important; }
  #invoice-print .print-muted { color: #555 !important; }
  #invoice-print .print-line { border-color: #ddd !important; background: transparent !important; }
}`;

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { shop, isManager } = useAuth();
  const { data: inv, loading, error, mutate, refresh } = useApi<Invoice>(`/invoices/${id}`);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmVoid, setConfirmVoid] = useState(false);

  useSocketEvent<Invoice>("invoice:updated", (i) => {
    if (i?._id === id) void refresh();
  });

  if (error && !inv) return <EmptyState title="Invoice not found" action={<Button href="/app/invoices">Back to invoices</Button>} />;
  if (loading || !inv) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-[520px]" />
      </div>
    );
  }

  const payLink = typeof window !== "undefined" ? `${window.location.origin}/portal/invoice/${inv.publicToken}` : "";
  const job = inv.job && typeof inv.job === "object" ? (inv.job as Job) : null;
  const jobId = inv.job ? (typeof inv.job === "string" ? inv.job : (inv.job as Job)._id) : null;
  const canPay = inv.status !== "void" && inv.status !== "paid" && inv.totals.balance > 0;

  async function act(key: string, fn: () => Promise<Invoice | unknown>, msg: string) {
    setBusy(key);
    try {
      const r = await fn();
      if (r && typeof r === "object" && "_id" in (r as Invoice)) mutate(r as Invoice);
      else void refresh();
      invalidate("/invoices", "/analytics", "/customers");
      toast.success(msg);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(payLink);
      toast.success("Pay link copied");
    } catch {
      toast.error("Clipboard access was blocked");
    }
  }

  return (
    <div>
      <style>{PRINT_CSS}</style>
      <PageHeader
        back={{ href: "/app/invoices", label: "Invoices" }}
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span className="font-mono">INV-{inv.number}</span>
            <InvoiceStatusBadge status={inv.status} />
          </span>
        }
        title={customerName(inv.customer)}
        description={`Issued ${formatDate(inv.createdAt)}${inv.dueDate ? ` · due ${formatDate(inv.dueDate)}` : ""}`}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button size="sm" variant="secondary" onClick={copy}>
              <Copy className="size-4" /> Pay link
            </Button>
            {inv.status !== "void" && inv.status !== "paid" && (
              <Button size="sm" variant="secondary" onClick={() => act("send", () => api.post(`/invoices/${id}/send`), "Invoice sent")} loading={busy === "send"}>
                <Send className="size-4" /> Send
              </Button>
            )}
            {canPay && (
              <Button size="sm" onClick={() => setPaying(true)}>
                <CreditCard className="size-4" /> Record payment
              </Button>
            )}
            <Menu
              trigger={
                <Button variant="secondary" size="icon" className="size-9" aria-label="More actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
              items={[
                { label: "Open customer pay page", href: `/portal/invoice/${inv.publicToken}`, icon: <ExternalLink className="size-4" /> },
                ...(jobId ? [{ label: "View job", href: `/app/jobs/${jobId}`, icon: <Wrench className="size-4" /> }] : []),
                ...(isManager && inv.status !== "void" && inv.totals.paid === 0
                  ? [{ label: "Void invoice", danger: true, onClick: () => setConfirmVoid(true), icon: <Ban className="size-4" /> }]
                  : []),
              ]}
            />
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Glass id="invoice-print" tier={2} className="rounded-[28px] p-6 sm:p-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row">
            <div className="flex items-start gap-3">
              {shop.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shop.logoUrl} alt={`${shop.name} logo`} className="size-12 rounded-xl object-cover" />
              ) : (
                <LogoMark size={44} />
              )}
              <div>
                <p className="text-lg font-semibold tracking-tight">{shop.name}</p>
                <p className="print-muted text-xs whitespace-pre-line text-ink-3">
                  {[shop.address, shop.phone, shop.email].filter(Boolean).join("\n")}
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-xs tracking-[0.2em] text-ink-4 uppercase print-muted">Invoice</p>
              <p className="font-mono text-2xl font-semibold">INV-{inv.number}</p>
              <p className="print-muted mt-1 text-xs text-ink-3">Issued {formatDate(inv.createdAt)}</p>
              {inv.dueDate && <p className={cn("text-xs", inv.status === "overdue" ? "text-danger" : "text-ink-3 print-muted")}>Due {formatDate(inv.dueDate)}</p>}
            </div>
          </div>

          <div className="print-line mt-8 grid gap-6 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 sm:grid-cols-2">
            <div>
              <p className="print-muted text-[11px] tracking-wider text-ink-4 uppercase">Bill to</p>
              <Link href={`/app/customers/${inv.customer?._id}`} className="mt-1 block text-sm font-medium hover:text-aqua-soft">
                {customerName(inv.customer)}
              </Link>
              <p className="print-muted text-xs whitespace-pre-line text-ink-3">
                {[inv.customer?.address, inv.customer?.phone, inv.customer?.email].filter(Boolean).join("\n")}
              </p>
            </div>
            {job && (
              <div>
                <p className="print-muted text-[11px] tracking-wider text-ink-4 uppercase">For job</p>
                <p className="mt-1 text-sm">
                  #{job.number} · {job.title}
                </p>
              </div>
            )}
          </div>

          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="print-line border-b border-white/[0.08] text-left text-[11px] tracking-wider text-ink-4 uppercase">
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Price</th>
                <th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={it._id ?? i} className="print-line border-b border-white/[0.05]">
                  <td className="py-3 pr-3">
                    <p className="text-ink">{it.name}</p>
                    {it.description && <p className="print-muted text-xs text-ink-4">{it.description}</p>}
                  </td>
                  <td className="py-3 text-right tabular-nums">{it.qty}</td>
                  <td className="py-3 text-right tabular-nums">{formatMoney(it.unitPrice)}</td>
                  <td className="py-3 text-right font-medium tabular-nums">{formatMoney(it.qty * it.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-xs">
              <TotalsPanel
                totals={inv.totals}
                extra={
                  inv.coupon ? (
                    <p className="print-muted mt-1 flex items-center justify-between text-xs text-ink-4">
                      <span className="inline-flex items-center gap-1">
                        <Tag className="size-3" /> Coupon {inv.coupon.code}
                      </span>
                      <span className="tabular-nums">incl. −{formatMoney(inv.coupon.amount)}</span>
                    </p>
                  ) : null
                }
              />
            </div>
          </div>

          {inv.notes && <p className="print-muted mt-8 text-sm whitespace-pre-wrap text-ink-3">{inv.notes}</p>}
          <p className="print-muted mt-10 text-center text-[11px] text-ink-4">
            Pay securely online: {payLink || `/portal/invoice/${inv.publicToken}`}
          </p>
        </Glass>

        <div className="space-y-5">
          <Glass className="p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Balance due</h2>
              <InvoiceStatusBadge status={inv.status} />
            </div>
            <p className={cn("text-3xl font-semibold tabular-nums", inv.totals.balance > 0 ? "text-ink" : "text-success")}>{formatMoney(inv.totals.balance)}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-iris to-success transition-[width] duration-700"
                style={{ width: `${inv.totals.total ? Math.min(100, (inv.totals.paid / inv.totals.total) * 100) : 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-4">
              {formatMoney(inv.totals.paid)} of {formatMoney(inv.totals.total)} paid
              {inv.totals.tips ? ` · ${formatMoney(inv.totals.tips)} in tips` : ""}
            </p>
            {inv.status !== "void" && (inv.coupon || canPay) && (
              <CouponBox invoice={inv} onChange={(i) => {
                mutate(i);
                invalidate("/invoices", "/analytics");
              }} />
            )}
            {canPay && (
              <Button className="mt-4 w-full" onClick={() => setPaying(true)}>
                <CreditCard className="size-4" /> Record payment
              </Button>
            )}
          </Glass>

          <Glass className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Payments</h2>
            {inv.payments.length === 0 ? (
              <p className="text-sm text-ink-4">No payments yet.</p>
            ) : (
              <ul className="space-y-2">
                {inv.payments.map((p) => (
                  <li key={p._id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.04] px-3.5 py-2.5">
                    <div>
                      <p className="flex items-center gap-2 text-sm text-ink">
                        {formatMoney(p.amount)}
                        <Badge tone="neutral">{methodLabel(p.method)}</Badge>
                      </p>
                      <p className="text-[11px] text-ink-4">
                        {formatDateTime(p.at)}
                        {p.giftCard ? ` · ${p.giftCard}` : p.reference ? ` · ${p.reference}` : ""}
                      </p>
                    </div>
                    {p.tip > 0 && <span className="text-xs text-success">+{formatMoney(p.tip)} tip</span>}
                  </li>
                ))}
              </ul>
            )}
          </Glass>
        </div>
      </div>

      <PaymentModal
        open={paying}
        balance={inv.totals.balance}
        onClose={() => setPaying(false)}
        onSubmit={async (body) => {
          await act("pay", () => api.post<Invoice>(`/invoices/${id}/payments`, body), `Payment of ${formatMoney(body.amount)} recorded`);
          setPaying(false);
        }}
      />
      <ConfirmDialog
        open={confirmVoid}
        onClose={() => setConfirmVoid(false)}
        onConfirm={async () => {
          await act("void", () => api.post(`/invoices/${id}/void`), "Invoice voided");
          setConfirmVoid(false);
        }}
        loading={busy === "void"}
        danger
        title={`Void INV-${inv.number}?`}
        description="The pay link stops working and the invoice is excluded from revenue. This can't be undone."
        confirmLabel="Void invoice"
      />
    </div>
  );
}

function CouponBox({ invoice, onChange }: { invoice: Invoice; onChange: (i: Invoice) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      const updated = await api.post<Invoice>(`/invoices/${invoice._id}/apply-coupon`, { code: code.trim().toUpperCase() });
      onChange(updated);
      setCode("");
      toast.success(`Coupon applied · −${formatMoney(updated.coupon?.amount)}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      onChange(await api.delete<Invoice>(`/invoices/${invoice._id}/coupon`));
      toast.success("Coupon removed");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (invoice.coupon) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-success/25 bg-success/[0.07] px-3 py-2 text-xs">
        <Tag className="size-3.5 text-success" />
        <span className="flex-1 text-ink-2">
          <span className="font-mono font-semibold text-ink">{invoice.coupon.code}</span> · −{formatMoney(invoice.coupon.amount)}
        </span>
        {invoice.totals.paid === 0 && (
          <button onClick={remove} disabled={busy} className="rounded-full p-1 text-ink-4 hover:bg-white/10 hover:text-ink" aria-label="Remove coupon">
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={apply} className="glass-inset mt-4 flex items-center gap-1 rounded-full p-1 pl-3.5">
      <Tag className="size-3.5 shrink-0 text-ink-4" aria-hidden />
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Coupon code"
        aria-label="Coupon code"
        className="h-8 min-w-0 flex-1 bg-transparent font-mono text-xs text-ink uppercase placeholder:font-sans placeholder:normal-case placeholder:text-ink-4 focus:outline-none"
      />
      <Button type="submit" size="xs" variant="secondary" loading={busy} disabled={!code.trim()}>
        Apply
      </Button>
    </form>
  );
}

type PaymentBody = { amount: number; tip: number; method: PaymentMethod; reference?: string; giftCardCode?: string };

function PaymentModal({
  open,
  balance,
  onClose,
  onSubmit,
}: {
  open: boolean;
  balance: number;
  onClose: () => void;
  onSubmit: (body: PaymentBody) => Promise<void>;
}) {
  const [amount, setAmount] = useState(0);
  const [tip, setTip] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [reference, setReference] = useState("");
  const [giftCode, setGiftCode] = useState("");
  const [card, setCard] = useState<{ code: string; data: GiftCard | null; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const debouncedCode = useDebounced(giftCode.trim().toUpperCase(), 350);

  useOnOpen(open, () => {
    setAmount(balance);
    setTip(0);
    setMethod("card");
    setReference("");
    setGiftCode("");
    setCard(null);
  });

  // Live gift card lookup so the cashier sees the remaining balance before charging it.
  useEffect(() => {
    if (method !== "gift_card" || debouncedCode.length < 4) return;
    let cancelled = false;
    api
      .get<GiftCard>(`/gift-cards/lookup/${encodeURIComponent(debouncedCode)}`)
      .then((g) => !cancelled && setCard({ code: debouncedCode, data: g }))
      .catch((e) => !cancelled && setCard({ code: debouncedCode, data: null, error: errorMessage(e) }));
    return () => {
      cancelled = true;
    };
  }, [method, debouncedCode]);

  const lookup = card && card.code === debouncedCode ? card : null;
  const giftCard = lookup?.data ?? null;
  const giftUsable = !!giftCard && giftCard.status === "active" && giftCard.balance > 0;
  const giftCap = giftCard ? Math.min(balance, giftCard.balance) : balance;
  const isGift = method === "gift_card";
  const invalid = amount <= 0 || amount > balance + 0.001 || (isGift && (!giftUsable || amount > giftCap + 0.001));
  const tipPresets = [0, 0.15, 0.2, 0.25];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record payment"
      description={`Balance due ${formatMoney(balance)}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={saving}
            disabled={invalid}
            onClick={async () => {
              setSaving(true);
              await onSubmit({
                amount,
                tip,
                method,
                reference: reference || undefined,
                giftCardCode: isGift ? debouncedCode : undefined,
              });
              setSaving(false);
            }}
          >
            Record {formatMoney(amount + tip)}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {methodLabel(m)}
              </option>
            ))}
          </Select>
        </Field>
        {isGift && (
          <div>
            <Field label="Gift card code">
              <Input
                value={giftCode}
                onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                placeholder="GC-XXXX-XXXX"
                className="font-mono"
                autoFocus
              />
            </Field>
            {lookup && (
              <div
                className={cn(
                  "mt-2 flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-xs",
                  giftUsable ? "border-success/25 bg-success/[0.07]" : "border-danger/25 bg-danger/[0.07]",
                )}
              >
                <Gift className={cn("size-4", giftUsable ? "text-success" : "text-danger")} />
                {giftCard ? (
                  <span className="flex-1 text-ink-2">
                    {giftCard.recipientName ? `${giftCard.recipientName} · ` : ""}
                    Balance <span className="font-semibold text-ink">{formatMoney(giftCard.balance)}</span>
                    {giftCard.status !== "active" && ` · ${giftCard.status}`}
                  </span>
                ) : (
                  <span className="flex-1 text-danger">{lookup.error ?? "Gift card not found"}</span>
                )}
                {giftUsable && amount > giftCap && (
                  <button type="button" onClick={() => setAmount(giftCap)} className="font-medium text-aqua-soft hover:text-white">
                    Use {formatMoney(giftCap)}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        <Field
          label="Amount"
          error={
            amount > balance + 0.001
              ? "Can't exceed the balance due"
              : isGift && giftUsable && amount > giftCap + 0.001
                ? `Gift card only covers ${formatMoney(giftCap)}`
                : undefined
          }
        >
          <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </Field>
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-2">Tip</p>
          <div className="flex gap-1.5">
            {tipPresets.map((p) => {
              const v = Math.round(amount * p * 100) / 100;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTip(v)}
                  className={cn(
                    "flex-1 rounded-xl border py-2 text-xs transition",
                    Math.abs(tip - v) < 0.01 ? "border-aqua/50 bg-aqua/10 text-ink" : "border-white/10 text-ink-3 hover:text-ink",
                  )}
                >
                  {p ? `${p * 100}%` : "None"}
                </button>
              );
            })}
          </div>
          <Input type="number" min={0} step="0.01" value={tip} onChange={(e) => setTip(Math.max(0, Number(e.target.value)))} className="mt-2" aria-label="Custom tip" />
        </div>
        {!isGift && (
          <Field label="Reference" hint="Check #, last 4, transaction ID…">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
        )}
      </div>
    </Modal>
  );
}

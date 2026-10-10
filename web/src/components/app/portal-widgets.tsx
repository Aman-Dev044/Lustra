"use client";

import { useState } from "react";
import { CheckCircle2, CreditCard, Lock, PenLine, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { Inspection, Invoice, Quote } from "@/lib/types";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";
import { Badge, Button, Field, Input, Switch } from "@/components/spatial";
import { computeTotals, TotalsPanel } from "./line-items-editor";
import { DamageMap, damageKinds, severityMeta, viewOptions } from "./damage-map";

/** Public endpoints may return the entity bare or wrapped with its shop — accept both. */
export function unwrap<T>(r: unknown, key: string): { entity: T; shop?: { name: string; brandColor?: string; phone?: string; email?: string; logoUrl?: string; address?: string } } {
  const obj = r as Record<string, unknown>;
  const entity = (obj && key in obj ? obj[key] : obj) as T;
  const shop = (obj?.shop ?? (entity as Record<string, unknown>)?.shop) as never;
  return { entity, shop: shop && typeof shop === "object" ? shop : undefined };
}

export function Section({ title, icon, children, action }: { title: string; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="glass rounded-[28px] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ── Quote approval ────────────────────────────────────────────────────── */

export function QuoteApproval({ quote, onChanged, brand = "#7c5cff" }: { quote: Quote; onChanged: (q: Quote) => void; brand?: string }) {
  const [items, setItems] = useState(quote.items.map((i) => ({ ...i, selected: i.optional ? i.selected !== false : true })));
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [jobPortal, setJobPortal] = useState<string | null>(null);
  const totals = computeTotals(items, quote.discount, quote.taxRate);
  const decided = quote.status === "approved" || quote.status === "declined" || quote.status === "expired";

  async function act(kind: "approve" | "decline") {
    setBusy(kind);
    try {
      const body =
        kind === "approve"
          ? { signatureName: signature.trim(), selectedItemIds: items.filter((i) => i.selected !== false && i._id).map((i) => i._id) }
          : {};
      const r = await api.post<unknown>(`/public/quotes/${quote.publicToken}/${kind}`, body);
      const { entity } = unwrap<Quote>(r, "quote");
      const job = (r as { job?: { portalToken?: string } } | null)?.job;
      if (job?.portalToken) setJobPortal(job.portalToken);
      onChanged({ ...quote, ...(entity && typeof entity === "object" ? entity : {}), status: kind === "approve" ? "approved" : "declined", signatureName: kind === "approve" ? signature.trim() : quote.signatureName });
      toast.success(kind === "approve" ? "Quote approved — thank you!" : "Quote declined");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <ul className="divide-y divide-white/[0.06]">
        {items.map((it, idx) => (
          <li key={it._id ?? idx} className={cn("flex items-start gap-3 py-3", it.selected === false && "opacity-50")}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">
                {it.name} {it.optional && <Badge tone="iris" className="ml-1">Optional</Badge>}
              </p>
              {it.description && <p className="mt-0.5 text-xs text-ink-3">{it.description}</p>}
            </div>
            <span className="text-sm text-ink tabular-nums">{formatMoney(it.qty * it.unitPrice - (it.discount ?? 0))}</span>
            {it.optional && !decided && (
              <Switch
                checked={it.selected !== false}
                onChange={(v) => setItems(items.map((x, i) => (i === idx ? { ...x, selected: v } : x)))}
                label={`Include ${it.name}`}
              />
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-2xl bg-white/[0.03] p-4">
        <TotalsPanel totals={totals} />
      </div>
      {quote.notes && <p className="mt-4 text-sm whitespace-pre-wrap text-ink-3">{quote.notes}</p>}

      {quote.status === "approved" ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4">
          <CheckCircle2 className="size-5 text-success" />
          <div className="text-sm">
            <p className="font-medium text-ink">Approved{quote.signatureName ? ` by ${quote.signatureName}` : ""}</p>
            {quote.approvedAt && <p className="text-xs text-ink-3">{formatDateTime(quote.approvedAt)}</p>}
          </div>
          {jobPortal && (
            <Button size="sm" href={`/portal/${jobPortal}`} className="ml-auto">
              Track your job
            </Button>
          )}
        </div>
      ) : quote.status === "declined" ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-ink-2">
          <XCircle className="size-5 text-danger" /> You declined this quote. Contact the shop if you change your mind.
        </div>
      ) : quote.status === "expired" ? (
        <p className="mt-5 rounded-2xl bg-warning/10 p-4 text-sm text-warning">This quote has expired. Contact the shop for an updated price.</p>
      ) : (
        <div className="mt-5 space-y-3">
          <Field label="Type your full name to sign" hint="By approving you authorize the work above at the quoted price.">
            <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Full name" autoComplete="name" className="font-serif text-lg italic" />
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              onClick={() => void act("approve")}
              loading={busy === "approve"}
              disabled={signature.trim().length < 2 || !!busy}
              style={{ background: `linear-gradient(120deg, ${brand}, #22d3ee)` }}
            >
              <PenLine className="size-4" /> Approve & sign · {formatMoney(totals.total)}
            </Button>
            <Button variant="ghost" onClick={() => void act("decline")} loading={busy === "decline"} disabled={!!busy}>
              Decline
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Invoice payment ───────────────────────────────────────────────────── */

export function InvoicePay({ invoice, onChanged, brand = "#7c5cff" }: { invoice: Invoice; onChanged: (i: Invoice) => void; brand?: string }) {
  const [tipPct, setTipPct] = useState(0);
  const [card, setCard] = useState({ name: "", number: "", exp: "", cvc: "" });
  const [paying, setPaying] = useState(false);
  const balance = invoice.totals.balance;
  const tip = Math.round(((invoice.totals.total * tipPct) / 100) * 100) / 100;
  const cardOk = card.name.trim().length > 1 && card.number.replace(/\s/g, "").length >= 15 && /^\d{2}\/\d{2}$/.test(card.exp) && card.cvc.length >= 3;

  async function pay() {
    setPaying(true);
    try {
      const r = await api.post<unknown>(`/public/invoices/${invoice.publicToken}/pay`, { amount: balance, tip });
      const { entity } = unwrap<Invoice>(r, "invoice");
      const next =
        entity && typeof entity === "object" && "totals" in entity
          ? { ...invoice, ...entity, customer: invoice.customer }
          : { ...invoice, status: "paid" as const, totals: { ...invoice.totals, paid: invoice.totals.total, balance: 0, tips: (invoice.totals.tips ?? 0) + tip } };
      onChanged(next);
      toast.success("Payment received — thank you!");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPaying(false);
    }
  }

  if (invoice.status === "paid" || balance <= 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4">
        <CheckCircle2 className="size-6 text-success" />
        <div>
          <p className="text-sm font-medium text-ink">Paid in full · {formatMoney(invoice.totals.total)}</p>
          <p className="text-xs text-ink-3">{invoice.paidAt ? `Received ${formatDateTime(invoice.paidAt)}` : "Thank you for your business."}</p>
        </div>
      </div>
    );
  }
  if (invoice.status === "void") return <p className="text-sm text-ink-3">This invoice has been voided.</p>;

  const fmtNumber = (v: string) =>
    v
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  const fmtExp = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  return (
    <div className="space-y-4">
      <TotalsPanel totals={invoice.totals} />
      <div>
        <p className="mb-2 text-xs font-medium text-ink-2">Add a tip for the crew</p>
        <div className="grid grid-cols-4 gap-2">
          {[0, 10, 15, 20].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTipPct(p)}
              className={cn("rounded-xl border py-2.5 text-sm transition", tipPct === p ? "text-white" : "border-white/10 bg-white/[0.03] text-ink-2 hover:border-white/25")}
              style={tipPct === p ? { background: brand, borderColor: brand } : undefined}
            >
              {p === 0 ? "No tip" : `${p}%`}
              {p > 0 && <span className="block text-[10px] opacity-75">{formatMoney((invoice.totals.total * p) / 100)}</span>}
            </button>
          ))}
        </div>
      </div>
      <div className="glass-inset space-y-3 rounded-2xl p-4">
        <p className="flex items-center gap-2 text-xs text-ink-3">
          <Lock className="size-3.5" /> Secure card payment
        </p>
        <Input placeholder="Name on card" autoComplete="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
        <Input
          placeholder="Card number"
          inputMode="numeric"
          autoComplete="cc-number"
          value={card.number}
          onChange={(e) => setCard({ ...card, number: fmtNumber(e.target.value) })}
          className="font-mono"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="MM/YY" inputMode="numeric" autoComplete="cc-exp" value={card.exp} onChange={(e) => setCard({ ...card, exp: fmtExp(e.target.value) })} />
          <Input
            placeholder="CVC"
            inputMode="numeric"
            autoComplete="cc-csc"
            value={card.cvc}
            onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          />
        </div>
      </div>
      <Button className="w-full" size="lg" onClick={pay} loading={paying} disabled={!cardOk} style={{ background: `linear-gradient(120deg, ${brand}, #22d3ee)` }}>
        <CreditCard className="size-4" /> Pay {formatMoney(balance + tip)}
      </Button>
      <p className="text-center text-[11px] text-ink-4">Demo checkout — no real card is charged.</p>
    </div>
  );
}

/* ── Inspection sign-off ───────────────────────────────────────────────── */

export function InspectionSign({ inspection, onChanged, brand = "#7c5cff" }: { inspection: Inspection; onChanged: (i: Inspection) => void; brand?: string }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const signed = inspection.status === "signed";

  async function sign() {
    setBusy(true);
    try {
      await api.post(`/public/inspections/${inspection.publicToken}/sign`, { name: name.trim() });
      onChanged({ ...inspection, status: "signed", signature: { name: name.trim(), signedAt: new Date().toISOString() } });
      toast.success("Thanks — inspection acknowledged");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <DamageMap markers={inspection.markers} readOnly />
      {inspection.markers.length > 0 ? (
        <ul className="space-y-1.5">
          {inspection.markers.map((m, i) => (
            <li key={m._id ?? i} className="flex items-start gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: severityMeta[m.severity].color }} />
              <span className="flex-1">
                <span className="text-ink">{damageKinds.find((k) => k.value === m.kind)?.label}</span>
                <span className="ml-2 text-xs text-ink-4">
                  {viewOptions.find((v) => v.value === m.view)?.label} · {severityMeta[m.severity].label}
                </span>
                {m.note && <span className="block text-xs text-ink-3">{m.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-3">No pre-existing damage was recorded.</p>
      )}
      {inspection.media.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {inspection.media.map((m) =>
            m.kind === "video" ? (
              <video key={m._id} src={m.url} controls className="aspect-[4/3] w-full rounded-xl object-cover" />
            ) : (
              <a key={m._id} href={m.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.caption || "Inspection photo"} className="aspect-[4/3] w-full object-cover transition hover:scale-105" loading="lazy" />
              </a>
            ),
          )}
        </div>
      )}
      {signed ? (
        <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4">
          <ShieldCheck className="size-5 text-success" />
          <p className="text-sm text-ink">
            Acknowledged by <span className="font-serif italic">{inspection.signature?.name}</span>
            {inspection.signature?.signedAt && <span className="text-xs text-ink-3"> · {formatDateTime(inspection.signature.signedAt)}</span>}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Type your full name to acknowledge" hint="Confirms the recorded condition before work begins.">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="font-serif text-lg italic" autoComplete="name" />
          </Field>
          <Button className="w-full" onClick={sign} loading={busy} disabled={name.trim().length < 2} style={{ background: `linear-gradient(120deg, ${brand}, #22d3ee)` }}>
            <PenLine className="size-4" /> Sign inspection
          </Button>
        </div>
      )}
    </div>
  );
}

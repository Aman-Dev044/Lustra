"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Award, CalendarClock, Car, Check, ClipboardList, FileText, Mail, Phone, Receipt, ScanSearch, SearchX } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Certificate, Inspection, Invoice, Job, JobStage, Quote, Shop, Vehicle } from "@/lib/types";
import { vehicleLabel } from "@/lib/domain";
import { cn, formatDate, formatDateTime, formatMoney, relativeTime } from "@/lib/utils";
import { Skeleton } from "@/components/spatial";
import { PublicShell, PublicState } from "@/components/app/public-shell";
import { InspectionSign, InvoicePay, QuoteApproval, Section } from "@/components/app/portal-widgets";
import { TotalsPanel } from "@/components/app/line-items-editor";

type PortalData = {
  shop: Pick<Shop, "name" | "phone" | "email" | "address" | "brandColor" | "logoUrl"> & { slug?: string };
  job: (Job & { progress?: number }) | null;
  customer?: { firstName?: string; loyaltyPoints?: number };
  vehicle?: Vehicle | null;
  quote?: Quote | null;
  invoice?: Invoice | null;
  inspection?: Inspection | null;
  certificates?: Certificate[];
};

const rail: { stage: JobStage; label: string; detail: string }[] = [
  { stage: "lead", label: "Request received", detail: "We've got your request" },
  { stage: "quoted", label: "Quote ready", detail: "Review and approve" },
  { stage: "scheduled", label: "Scheduled", detail: "Your spot is reserved" },
  { stage: "in_progress", label: "In the bay", detail: "Our team is working on it" },
  { stage: "quality_check", label: "Final inspection", detail: "Detail-by-detail QC" },
  { stage: "completed", label: "Ready for pickup", detail: "Looking brand new" },
];

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "error">("loading");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get<PortalData>(`/public/portal/${token}`);
      setData(d);
      setState("ready");
      setUpdatedAt(new Date());
    } catch (e) {
      setState((s) => (s === "ready" ? s : e instanceof ApiError && e.status === 404 ? "notfound" : "error"));
    }
  }, [token]);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 20_000);
    return () => clearInterval(t);
  }, [load]);

  if (state === "loading")
    return (
      <PublicShell>
        <Skeleton className="h-56" />
        <Skeleton className="mt-4 h-40" />
      </PublicShell>
    );
  if (!data)
    return (
      <PublicShell>
        <PublicState
          icon={<SearchX className="size-6" />}
          title={state === "notfound" ? "This link has expired or doesn't exist" : "We couldn't load your portal"}
          description={state === "notfound" ? "Ask the shop to resend your portal link." : "Please refresh in a moment."}
        />
      </PublicShell>
    );

  const { shop, job } = data;
  const brand = shop.brandColor || "#7c5cff";
  const vehicle = data.vehicle ?? job?.vehicle ?? data.quote?.vehicle ?? data.inspection?.vehicle ?? null;
  const cancelled = job?.stage === "cancelled";
  const current = job ? Math.max(0, rail.findIndex((r) => r.stage === job.stage)) : 0;
  const heading =
    job?.title ??
    (data.quote ? data.quote.title : data.invoice ? `Invoice INV-${data.invoice.number}` : data.inspection ? "Vehicle condition report" : "Your service");
  const quoteOpen = data.quote && (data.quote.status === "sent" || data.quote.status === "viewed" || data.quote.status === "draft");
  const invoiceDue = data.invoice && data.invoice.status !== "void" && data.invoice.totals.balance > 0;
  const inspectionToSign = data.inspection && data.inspection.status !== "signed";

  return (
    <PublicShell shop={shop}>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-2 rim relative overflow-hidden rounded-[32px] p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full blur-3xl" style={{ background: `${brand}40` }} />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: brand }}>
              {data.customer?.firstName ? `Hi ${data.customer.firstName} 👋` : "Your service portal"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{heading}</h1>
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-ink-3">
              <Car className="size-4" /> {vehicleLabel(vehicle)}
              {vehicle?.color ? ` · ${vehicle.color}` : ""}
              {job && <span className="text-ink-4">· Job #{job.number}</span>}
              {!!data.customer?.loyaltyPoints && <span className="text-ink-4">· {data.customer.loyaltyPoints.toLocaleString()} loyalty pts</span>}
            </p>
          </div>
          {job?.scheduledStart && (
            <div className="glass rounded-2xl px-5 py-4">
              <p className="flex items-center gap-1.5 text-[11px] tracking-wider text-ink-4 uppercase">
                <CalendarClock className="size-3.5" /> Appointment
              </p>
              <p className="mt-1 text-sm font-medium text-ink">{formatDateTime(job.scheduledStart)}</p>
              {job.scheduledEnd && <p className="text-xs text-ink-3">Est. ready {formatDateTime(job.scheduledEnd)}</p>}
            </div>
          )}
        </div>

        {/* Progress rail */}
        {job && (
        <div className="relative mt-8">
          {cancelled ? (
            <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">This appointment was cancelled. Contact {shop.name} to rebook.</p>
          ) : (
            <ol className="grid grid-cols-6 gap-1" aria-label="Job progress">
              {rail.map((r, i) => {
                const done = i < current;
                const active = i === current;
                return (
                  <li key={r.stage} className="flex flex-col items-center text-center" aria-current={active ? "step" : undefined}>
                    <div className="relative flex w-full items-center">
                      <span className={cn("h-1 flex-1 rounded-full", i === 0 ? "opacity-0" : done || active ? "" : "bg-white/10")} style={done || active ? { background: brand } : undefined} />
                      <span
                        className={cn("relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition", done ? "border-transparent" : active ? "border-transparent" : "border-white/15 bg-[#0b0e1c]")}
                        style={done || active ? { background: `linear-gradient(135deg, ${brand}, #22d3ee)`, boxShadow: active ? `0 0 24px ${brand}` : undefined } : undefined}
                      >
                        {active && <span className="absolute inset-0 animate-pulse-ring rounded-full" style={{ background: `${brand}66` }} />}
                        {done ? <Check className="size-4 text-white" strokeWidth={3} /> : <span className={cn("size-2 rounded-full", active ? "bg-white" : "bg-white/25")} />}
                      </span>
                      <span className={cn("h-1 flex-1 rounded-full", i === rail.length - 1 ? "opacity-0" : done ? "" : "bg-white/10")} style={done ? { background: brand } : undefined} />
                    </div>
                    <span className={cn("mt-2 hidden text-[11px] leading-tight sm:block", active ? "font-medium text-ink" : done ? "text-ink-2" : "text-ink-4")}>{r.label}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {!cancelled && (
            <p className="mt-4 text-center text-sm text-ink-2">
              <span className="font-semibold text-ink">{rail[current]?.label}</span> — {rail[current]?.detail}
              {updatedAt && <span className="ml-2 text-xs text-ink-4">· live · updated {relativeTime(updatedAt)}</span>}
            </p>
          )}
        </div>
        )}
      </motion.section>

      <div className="mt-4 grid gap-4">
        {quoteOpen && data.quote && (
          <Section title={`Quote Q-${data.quote.number} needs your approval`} icon={<FileText className="size-5" style={{ color: brand }} />}>
            <QuoteApproval quote={data.quote} brand={brand} onChanged={(q) => setData({ ...data, quote: q })} />
          </Section>
        )}

        {inspectionToSign && data.inspection && (
          <Section title="Vehicle condition report" icon={<ScanSearch className="size-5" style={{ color: brand }} />}>
            <InspectionSign inspection={data.inspection} brand={brand} onChanged={(i) => setData({ ...data, inspection: i })} />
          </Section>
        )}

        {data.invoice && (invoiceDue || data.invoice.status === "paid") && (
          <Section title={`Invoice INV-${data.invoice.number}`} icon={<Receipt className="size-5" style={{ color: brand }} />}>
            <InvoicePay invoice={data.invoice} brand={brand} onChanged={(inv) => setData({ ...data, invoice: inv })} />
          </Section>
        )}

        {job && !quoteOpen && (
          <Section title="Work order" icon={<ClipboardList className="size-5" style={{ color: brand }} />}>
            <ul className="divide-y divide-white/[0.06]">
              {job.lineItems.map((li, i) => (
                <li key={li._id ?? i} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="flex items-center gap-2.5">
                    <span
                      className={cn("flex size-5 items-center justify-center rounded-full border", li.status === "done" ? "border-transparent" : "border-white/20")}
                      style={li.status === "done" ? { background: brand } : undefined}
                    >
                      {li.status === "done" && <Check className="size-3 text-white" />}
                    </span>
                    <span className={li.status === "done" ? "text-ink-2" : "text-ink"}>{li.name}</span>
                    {li.status === "in_progress" && <span className="text-[11px] text-aqua-soft">in progress</span>}
                  </span>
                  <span className="text-ink-2 tabular-nums">{formatMoney(li.qty * li.unitPrice - (li.discount ?? 0))}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 rounded-2xl bg-white/[0.03] p-4">
              <TotalsPanel totals={job.totals} />
            </div>
          </Section>
        )}

        {data.inspection && !inspectionToSign && (
          <Section title="Vehicle condition report" icon={<ScanSearch className="size-5" style={{ color: brand }} />}>
            <InspectionSign inspection={data.inspection} brand={brand} onChanged={(i) => setData({ ...data, inspection: i })} />
          </Section>
        )}

        {!!data.certificates?.length && (
          <Section title="Your warranty certificates" icon={<Award className="size-5" style={{ color: brand }} />}>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.certificates.map((c) => (
                <Link key={c._id} href={`/verify/${c.code}`} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:-translate-y-0.5 hover:border-white/25">
                  <p className="text-sm font-medium text-ink">{c.product}</p>
                  <p className="text-xs text-ink-3">{c.coverage}</p>
                  <p className="mt-3 flex items-center justify-between text-xs">
                    <span className="font-mono text-ink-2">{c.code}</span>
                    <span className="text-ink-4">{c.expiresAt ? `Valid to ${formatDate(c.expiresAt)}` : "Lifetime"}</span>
                  </p>
                </Link>
              ))}
            </div>
          </Section>
        )}

        <Section title={`Questions? ${shop.name} is here to help`}>
          <div className="flex flex-wrap gap-2">
            {shop.phone && (
              <a href={`tel:${shop.phone}`} className="glass inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm text-ink transition hover:-translate-y-0.5">
                <Phone className="size-4" /> {shop.phone}
              </a>
            )}
            {shop.email && (
              <a href={`mailto:${shop.email}`} className="glass inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm text-ink transition hover:-translate-y-0.5">
                <Mail className="size-4" /> {shop.email}
              </a>
            )}
          </div>
          {shop.address && <p className="mt-3 text-sm text-ink-3">{shop.address}</p>}
        </Section>
      </div>
    </PublicShell>
  );
}

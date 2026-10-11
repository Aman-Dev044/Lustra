"use client";

import { useParams } from "next/navigation";
import { Receipt, SearchX } from "lucide-react";
import type { Invoice } from "@/lib/types";
import { customerName } from "@/lib/domain";
import { formatDate, formatMoney } from "@/lib/utils";
import { Skeleton } from "@/components/spatial";
import { PublicShell, PublicState } from "@/components/app/public-shell";
import { InvoicePay, Section } from "@/components/app/portal-widgets";
import { usePublicDoc } from "@/components/app/use-public";

export default function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>();
  const { entity: invoice, setEntity, shop, state } = usePublicDoc<Invoice>(`/public/invoices/${token}`, "invoice");
  const brand = shop?.brandColor || "#ff6a2b";

  if (state === "loading")
    return (
      <PublicShell>
        <Skeleton className="h-96" />
      </PublicShell>
    );
  if (!invoice)
    return (
      <PublicShell>
        <PublicState icon={<SearchX className="size-6" />} title="Invoice not found" description="This link may have expired. Ask the shop to resend it." />
      </PublicShell>
    );

  return (
    <PublicShell shop={shop}>
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: brand }}>
          Invoice INV-{invoice.number}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
          {invoice.totals.balance > 0 ? `${formatMoney(invoice.totals.balance)} due` : "Paid — thank you!"}
        </h1>
        <p className="mt-2 text-sm text-ink-3">
          {invoice.customer && `Billed to ${customerName(invoice.customer)} · `}Issued {formatDate(invoice.createdAt)}
          {invoice.dueDate && invoice.totals.balance > 0 && ` · Due ${formatDate(invoice.dueDate)}`}
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Section title="Items" icon={<Receipt className="size-5" style={{ color: brand }} />}>
          <ul className="divide-y divide-ink/[0.06]">
            {invoice.items.map((it, i) => (
              <li key={it._id ?? i} className="flex justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="text-ink">{it.name}</span>
                  {it.qty !== 1 && <span className="ml-2 text-xs text-ink-4">× {it.qty}</span>}
                  {it.description && <span className="block text-xs text-ink-3">{it.description}</span>}
                </span>
                <span className="text-ink-2 tabular-nums">{formatMoney(it.qty * it.unitPrice)}</span>
              </li>
            ))}
          </ul>
          {invoice.notes && <p className="mt-4 text-sm whitespace-pre-wrap text-ink-3">{invoice.notes}</p>}
        </Section>
        <Section title="Payment">
          <InvoicePay invoice={invoice} brand={brand} onChanged={setEntity} />
        </Section>
      </div>
    </PublicShell>
  );
}

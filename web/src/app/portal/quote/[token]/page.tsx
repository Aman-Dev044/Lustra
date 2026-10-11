"use client";

import { useParams } from "next/navigation";
import { FileText, SearchX } from "lucide-react";
import type { Quote } from "@/lib/types";
import { customerName, vehicleLabel } from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import { Badge, Skeleton } from "@/components/spatial";
import { PublicShell, PublicState } from "@/components/app/public-shell";
import { QuoteApproval, Section } from "@/components/app/portal-widgets";
import { usePublicDoc } from "@/components/app/use-public";

export default function PublicQuotePage() {
  const { token } = useParams<{ token: string }>();
  const { entity: quote, setEntity, shop, state } = usePublicDoc<Quote>(`/public/quotes/${token}`, "quote");
  const brand = shop?.brandColor || "#ff6a2b";

  if (state === "loading")
    return (
      <PublicShell>
        <Skeleton className="h-96" />
      </PublicShell>
    );
  if (!quote)
    return (
      <PublicShell>
        <PublicState icon={<SearchX className="size-6" />} title="Quote not found" description="This link may have expired. Ask the shop to resend it." />
      </PublicShell>
    );

  return (
    <PublicShell shop={shop}>
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: brand }}>
          Quote Q-{quote.number}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{quote.title}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-3">
          {quote.customer && <span>For {customerName(quote.customer)}</span>}
          {quote.vehicle && <span>· {vehicleLabel(quote.vehicle)}</span>}
          {quote.validUntil && <span>· Valid until {formatDate(quote.validUntil)}</span>}
          <Badge tone={quote.status === "approved" ? "success" : quote.status === "declined" ? "danger" : "info"}>{quote.status}</Badge>
        </p>
      </div>
      <Section title="Proposed work" icon={<FileText className="size-5" style={{ color: brand }} />}>
        <QuoteApproval quote={quote} brand={brand} onChanged={setEntity} />
      </Section>
    </PublicShell>
  );
}

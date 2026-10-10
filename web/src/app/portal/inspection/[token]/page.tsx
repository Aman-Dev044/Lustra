"use client";

import { useParams } from "next/navigation";
import { ScanSearch, SearchX } from "lucide-react";
import type { Inspection } from "@/lib/types";
import { vehicleLabel } from "@/lib/domain";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/spatial";
import { PublicShell, PublicState } from "@/components/app/public-shell";
import { InspectionSign, Section } from "@/components/app/portal-widgets";
import { usePublicDoc } from "@/components/app/use-public";

export default function PublicInspectionPage() {
  const { token } = useParams<{ token: string }>();
  const { entity: inspection, setEntity, shop, state } = usePublicDoc<Inspection>(`/public/inspections/${token}`, "inspection");
  const brand = shop?.brandColor || "#7c5cff";

  if (state === "loading")
    return (
      <PublicShell>
        <Skeleton className="h-96" />
      </PublicShell>
    );
  if (!inspection)
    return (
      <PublicShell>
        <PublicState icon={<SearchX className="size-6" />} title="Inspection not found" description="This link may have expired. Ask the shop to resend it." />
      </PublicShell>
    );

  return (
    <PublicShell shop={shop}>
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: brand }}>
          {inspection.type === "pre" ? "Pre-service condition report" : "Delivery inspection"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{vehicleLabel(inspection.vehicle)}</h1>
        <p className="mt-2 text-sm text-ink-3">
          Recorded {formatDate(inspection.createdAt)} · {inspection.markers.length} item{inspection.markers.length === 1 ? "" : "s"} noted
        </p>
      </div>
      <Section title="Walkaround" icon={<ScanSearch className="size-5" style={{ color: brand }} />}>
        {inspection.notes && <p className="mb-4 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-ink-2">{inspection.notes}</p>}
        <InspectionSign inspection={inspection} brand={brand} onChanged={setEntity} />
      </Section>
    </PublicShell>
  );
}

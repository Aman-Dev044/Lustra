"use client";

import { Download } from "lucide-react";

type Entity = "customers" | "vehicles" | "jobs" | "invoices" | "inventory" | "payments";

/** Plain anchor download — the API streams a CSV attachment with the auth cookie, no client-side work needed. */
export function ExportButton({ entity, query }: { entity: Entity; query?: Record<string, string | undefined> }) {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([k, v]) => v && params.set(k, v));
  const qs = params.toString();
  return (
    <a
      href={`/api/export/${entity}${qs ? `?${qs}` : ""}`}
      download={`lustra-${entity}.csv`}
      className="glass inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:bg-[var(--color-glass-hover)]"
    >
      <Download className="size-4" aria-hidden /> Export CSV
    </a>
  );
}

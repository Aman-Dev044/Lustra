"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePage } from "@/lib/hooks/use-list-state";
import { FileText, Plus, Search, Sparkles } from "lucide-react";
import { invalidate, useApi, useDebounced } from "@/lib/hooks/use-api";
import { useSocketEvent } from "@/components/app/realtime-provider";
import type { Paginated, Quote, QuoteStatus } from "@/lib/types";
import { customerName, quoteStatusMeta, vehicleLabel } from "@/lib/domain";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { Badge, Button, EmptyState, Glass, Skeleton } from "@/components/spatial";
import { PageHeader, Pagination, QuoteStatusBadge, RowLink, Table, Td, Th, Toolbar } from "@/components/app/ui";

const STATUSES = Object.keys(quoteStatusMeta) as QuoteStatus[];
const PAGE_SIZE = 25;

export default function QuotesPage() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [status, setStatus] = useState<QuoteStatus | "">("");
  const [page, setPage] = usePage(JSON.stringify([dq, status]));

  useSocketEvent("quote:updated", () => invalidate("/quotes"));
  const { data, loading } = useApi<Paginated<Quote>>("/quotes", { q: dq, status: status || undefined, page, pageSize: PAGE_SIZE });

  const summary = useMemo(() => {
    const items = data?.items ?? [];
    const open = items.filter((x) => x.status === "sent" || x.status === "viewed");
    const decided = items.filter((x) => x.status === "approved" || x.status === "declined");
    return {
      openValue: open.reduce((s, x) => s + x.totals.total, 0),
      openCount: open.length,
      winRate: decided.length ? (items.filter((x) => x.status === "approved").length / decided.length) * 100 : 0,
      ai: items.filter((x) => x.aiGenerated).length,
    };
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Quotes"
        description="Price it fast, send it beautifully, get it approved from the customer's phone."
        actions={
          <Button href="/app/quotes/new">
            <Sparkles className="size-4" /> New AI quote
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Glass className="p-4">
          <p className="text-xs text-ink-3">Awaiting decision</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{formatMoney(summary.openValue, "USD", true)}</p>
          <p className="text-[11px] text-ink-4">{summary.openCount} open on this page</p>
        </Glass>
        <Glass className="p-4">
          <p className="text-xs text-ink-3">Win rate</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{summary.winRate.toFixed(0)}%</p>
          <p className="text-[11px] text-ink-4">Approved vs. decided</p>
        </Glass>
        <Glass className="p-4">
          <p className="text-xs text-ink-3">Built with Copilot</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{summary.ai}</p>
          <p className="text-[11px] text-ink-4">AI-drafted quotes</p>
        </Glass>
        <Glass className="p-4">
          <p className="text-xs text-ink-3">Total quotes</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums">{data?.total ?? "—"}</p>
          <p className="text-[11px] text-ink-4">All time</p>
        </Glass>
      </div>

      <Toolbar>
        <div className="glass-inset flex h-10 w-full items-center gap-2 rounded-full px-4 sm:w-72">
          <Search className="size-4 text-ink-4" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search quotes…" aria-label="Search quotes" className="h-full flex-1 bg-transparent text-sm focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          <button
            onClick={() => setStatus("")}
            aria-pressed={!status}
            className={cn("rounded-full border px-3 py-1.5 text-xs transition", !status ? "border-ink/25 bg-ink/[0.1] text-ink" : "border-ink/[0.08] text-ink-3 hover:text-ink")}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(status === s ? "" : s)}
              aria-pressed={status === s}
              className={cn("rounded-full border px-3 py-1.5 text-xs transition", status === s ? "border-ink/25 bg-ink/[0.1] text-ink" : "border-ink/[0.08] text-ink-3 hover:text-ink")}
            >
              {quoteStatusMeta[s].label}
            </button>
          ))}
        </div>
      </Toolbar>

      <Glass className="overflow-hidden">
        {loading && !data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={<FileText className="size-7" />}
            title={dq || status ? "No quotes match" : "No quotes yet"}
            description="Describe a job in plain English and Copilot builds the priced quote for you."
            action={
              <Button href="/app/quotes/new">
                <Plus className="size-4" /> Create quote
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Quote</Th>
                    <Th>Customer</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th>Valid until</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((x) => (
                    <RowLink key={x._id} href={`/app/quotes/${x._id}`}>
                      <Td>
                        <span className="mr-2 font-mono text-xs text-ink-4">Q-{x.number}</span>
                        <span className="text-ink">{x.title}</span>
                        {x.aiGenerated && (
                          <Badge tone="iris" className="ml-2">
                            <Sparkles className="size-3" /> AI
                          </Badge>
                        )}
                      </Td>
                      <Td>
                        <span className="block">{customerName(x.customer)}</span>
                        {x.vehicle && <span className="text-xs text-ink-4">{vehicleLabel(x.vehicle)}</span>}
                      </Td>
                      <Td>
                        <QuoteStatusBadge status={x.status} />
                      </Td>
                      <Td className="text-xs">{formatDate(x.createdAt)}</Td>
                      <Td className="text-xs">{formatDate(x.validUntil)}</Td>
                      <Td className="text-right font-medium text-ink tabular-nums">{formatMoney(x.totals.total)}</Td>
                    </RowLink>
                  ))}
                </tbody>
              </Table>
            </div>
            <ul className="divide-y divide-ink/[0.05] md:hidden">
              {data.items.map((x) => (
                <li key={x._id}>
                  <Link href={`/app/quotes/${x._id}`} className="block px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-ink">
                        <span className="mr-1.5 font-mono text-xs text-ink-4">Q-{x.number}</span>
                        {x.title}
                      </p>
                      <span className="text-sm font-medium tabular-nums">{formatMoney(x.totals.total, "USD", true)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <QuoteStatusBadge status={x.status} />
                      <span className="text-[11px] text-ink-4">{customerName(x.customer)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />
          </>
        )}
      </Glass>
    </div>
  );
}

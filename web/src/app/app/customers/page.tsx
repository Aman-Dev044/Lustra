"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateParam, usePage } from "@/lib/hooks/use-list-state";
import { Plus, Search, Star, UserRound } from "lucide-react";
import { useApi, useDebounced } from "@/lib/hooks/use-api";
import type { Customer, CustomerSource, Paginated } from "@/lib/types";
import { customerName } from "@/lib/domain";
import { formatDate, formatMoney, formatNumber, relativeTime, titleCase } from "@/lib/utils";
import { Avatar, Badge, Button, EmptyState, Glass, Select, Skeleton } from "@/components/spatial";
import { PageHeader, Pagination, RowLink, Table, Td, Th, Toolbar } from "@/components/app/ui";
import { ExportButton } from "@/components/app/export-button";
import { CustomerCreateModal } from "@/components/app/pickers";

const SOURCES: CustomerSource[] = ["website", "referral", "google", "instagram", "facebook", "walk-in", "booking", "repeat", "other"];
const PAGE_SIZE = 30;

export default function CustomersPage() {
  return (
    <Suspense>
      <CustomersView />
    </Suspense>
  );
}

function CustomersView() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [source, setSource] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("-lastVisitAt");
  const [page, setPage] = usePage(JSON.stringify([dq, source, tag, sort]));
  const [creating, setCreating] = useCreateParam();

  const { data, loading } = useApi<Paginated<Customer>>("/customers", {
    q: dq,
    source: source || undefined,
    tag: tag || undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const knownTags = Array.from(new Set([...(tag ? [tag] : []), ...(data?.items ?? []).flatMap((c) => c.tags ?? [])])).slice(0, 12);

  return (
    <div>
      <PageHeader
        title="Customers"
        description={data ? `${formatNumber(data.total)} customers in your CRM` : "Your customer relationships"}
        actions={
          <>
            <ExportButton entity="customers" query={{ q: dq || undefined, source: source || undefined, tag: tag || undefined }} />
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New customer
            </Button>
          </>
        }
      />

      <Toolbar>
        <div className="glass-inset flex h-10 w-full items-center gap-2 rounded-full px-4 sm:w-80">
          <Search className="size-4 text-ink-4" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, email…"
            aria-label="Search customers"
            className="h-full flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <Select value={source} onChange={(e) => setSource(e.target.value)} className="h-10 w-auto rounded-full" aria-label="Filter by source">
          <option value="">All sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 w-auto rounded-full" aria-label="Sort customers">
          <option value="-lastVisitAt">Recent visit</option>
          <option value="-lifetimeValue">Highest lifetime value</option>
          <option value="-visits">Most visits</option>
          <option value="-createdAt">Newest</option>
          <option value="lastName">Name A–Z</option>
        </Select>
      </Toolbar>
      {knownTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {knownTags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(tag === t ? "" : t)}
              aria-pressed={tag === t}
              className={`rounded-full border px-3 py-1 text-xs transition ${tag === t ? "border-aqua/40 bg-aqua/10 text-ink" : "border-white/[0.08] text-ink-3 hover:text-ink"}`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      <Glass className="overflow-hidden">
        {loading && !data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={<UserRound className="size-7" />}
            title={dq || source || tag ? "No customers match" : "No customers yet"}
            description={dq || source || tag ? "Try a different search or filter." : "Add your first customer or import from your old system in Settings."}
            action={<Button onClick={() => setCreating(true)}>Add customer</Button>}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Customer</Th>
                    <Th>Contact</Th>
                    <Th>Source</Th>
                    <Th className="text-right">Visits</Th>
                    <Th className="text-right">Lifetime value</Th>
                    <Th className="text-right">Loyalty</Th>
                    <Th>Last visit</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <RowLink key={c._id} href={`/app/customers/${c._id}`}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={customerName(c)} size={32} />
                          <div className="min-w-0">
                            <p className="truncate text-ink">{customerName(c)}</p>
                            {c.tags?.length > 0 && (
                              <p className="truncate text-[11px] text-ink-4">{c.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}</p>
                            )}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span className="block text-xs text-ink-2">{c.phone || "—"}</span>
                        <span className="block max-w-48 truncate text-xs text-ink-4">{c.email}</span>
                      </Td>
                      <Td>
                        <Badge>{titleCase(c.source)}</Badge>
                      </Td>
                      <Td className="text-right tabular-nums">{c.visits}</Td>
                      <Td className="text-right font-medium text-ink tabular-nums">{formatMoney(c.lifetimeValue)}</Td>
                      <Td className="text-right tabular-nums">
                        <span className="inline-flex items-center gap-1 text-xs">
                          <Star className="size-3 text-warning" aria-hidden /> {formatNumber(c.loyaltyPoints)}
                        </span>
                      </Td>
                      <Td className="text-xs whitespace-nowrap" >
                        <span title={formatDate(c.lastVisitAt)}>{c.lastVisitAt ? relativeTime(c.lastVisitAt) : "Never"}</span>
                      </Td>
                    </RowLink>
                  ))}
                </tbody>
              </Table>
            </div>
            <ul className="divide-y divide-white/[0.05] md:hidden">
              {data.items.map((c) => (
                <li key={c._id}>
                  <Link href={`/app/customers/${c._id}`} className="flex items-center gap-3 px-4 py-3 active:bg-white/[0.05]">
                    <Avatar name={customerName(c)} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{customerName(c)}</p>
                      <p className="truncate text-xs text-ink-4">{c.phone || c.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">{formatMoney(c.lifetimeValue, "USD", true)}</p>
                      <p className="text-[11px] text-ink-4">{c.visits} visits</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />
          </>
        )}
      </Glass>

      <CustomerCreateModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(c) => {
          setCreating(false);
          router.push(`/app/customers/${c._id}`);
        }}
      />
    </div>
  );
}

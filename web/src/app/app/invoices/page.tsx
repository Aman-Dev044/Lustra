"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useCreateParam, useOnOpen, usePage } from "@/lib/hooks/use-list-state";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { addDays } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, Plus, Receipt, Search } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi, useDebounced } from "@/lib/hooks/use-api";
import type { Customer, Invoice, InvoiceStatus, LineItem, Paginated } from "@/lib/types";
import { customerName, invoiceStatusMeta } from "@/lib/domain";
import { cn, formatDate, formatMoney, toDateInput } from "@/lib/utils";
import { Button, EmptyState, Field, Glass, Input, Modal, Skeleton, Textarea } from "@/components/spatial";
import { useAuth } from "@/components/app/auth-provider";
import { InvoiceStatusBadge, PageHeader, Pagination, RowLink, Table, Td, Th, Toolbar } from "@/components/app/ui";
import { ExportButton } from "@/components/app/export-button";
import { CustomerPicker } from "@/components/app/pickers";
import { LineItemsEditor, TotalsPanel, computeTotals } from "@/components/app/line-items-editor";

const STATUSES = Object.keys(invoiceStatusMeta) as InvoiceStatus[];
const PAGE_SIZE = 25;

export default function InvoicesPage() {
  return (
    <Suspense>
      <InvoicesView />
    </Suspense>
  );
}

function InvoicesView() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [statuses, setStatuses] = useState<InvoiceStatus[]>(() => (params.get("status")?.split(",").filter(Boolean) as InvoiceStatus[]) ?? []);
  const [page, setPage] = usePage(JSON.stringify([dq, statuses]));
  const [creating, setCreating] = useCreateParam();

  const { data, loading } = useApi<Paginated<Invoice> & { summary?: { outstanding: number; collected: number } }>("/invoices", {
    q: dq,
    status: statuses.join(",") || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const summary = useMemo(() => {
    const items = data?.items ?? [];
    // Server summary covers every matching invoice, not just this page.
    return {
      outstanding: data?.summary?.outstanding ?? items.filter((i) => i.status !== "void").reduce((s, i) => s + (i.totals?.balance ?? 0), 0),
      collected: data?.summary?.collected ?? items.reduce((s, i) => s + (i.totals?.paid ?? 0), 0),
      overdue: items.filter((i) => i.status === "overdue").length,
    };
  }, [data]);

  const toggle = (s: InvoiceStatus) => setStatuses((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Text-to-pay links, deposits, tips and partial payments — all reconciled automatically."
        actions={
          <>
            <ExportButton entity="invoices" query={{ q: dq || undefined, status: statuses.join(",") || undefined }} />
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New invoice
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Glass className="flex items-center gap-4 p-4">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-warning/15 text-warning">
            <Clock className="size-5" />
          </span>
          <div>
            <p className="text-xs text-ink-3">Outstanding</p>
            <p className="text-xl font-semibold tabular-nums">{formatMoney(summary.outstanding)}</p>
          </div>
        </Glass>
        <Glass className="flex items-center gap-4 p-4">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-success/15 text-success">
            <CheckCircle2 className="size-5" />
          </span>
          <div>
            <p className="text-xs text-ink-3">Collected</p>
            <p className="text-xl font-semibold tabular-nums">{formatMoney(summary.collected)}</p>
          </div>
        </Glass>
        <Glass className="flex items-center gap-4 p-4">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-danger/15 text-danger">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <p className="text-xs text-ink-3">Overdue</p>
            <p className="text-xl font-semibold tabular-nums">{summary.overdue}</p>
          </div>
        </Glass>
      </div>

      <Toolbar>
        <div className="glass-inset flex h-10 w-full items-center gap-2 rounded-full px-4 sm:w-72">
          <Search className="size-4 text-ink-4" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoices…" aria-label="Search invoices" className="h-full flex-1 bg-transparent text-sm focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => toggle(s)}
              aria-pressed={statuses.includes(s)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition",
                statuses.includes(s) ? "border-ink/25 bg-ink/[0.1] text-ink" : "border-ink/[0.08] text-ink-3 hover:text-ink",
              )}
            >
              {invoiceStatusMeta[s].label}
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
            icon={<Receipt className="size-7" />}
            title={dq || statuses.length ? "No invoices match" : "No invoices yet"}
            description="Create one from a completed job in a single click, or start from scratch."
            action={<Button onClick={() => setCreating(true)}>New invoice</Button>}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Customer</Th>
                    <Th>Status</Th>
                    <Th>Issued</Th>
                    <Th>Due</Th>
                    <Th className="text-right">Total</Th>
                    <Th className="text-right">Balance</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((i) => (
                    <RowLink key={i._id} href={`/app/invoices/${i._id}`}>
                      <Td className="font-mono text-xs text-ink">INV-{i.number}</Td>
                      <Td>{customerName(i.customer)}</Td>
                      <Td>
                        <InvoiceStatusBadge status={i.status} />
                      </Td>
                      <Td className="text-xs">{formatDate(i.createdAt)}</Td>
                      <Td className={cn("text-xs", i.status === "overdue" && "text-danger")}>{formatDate(i.dueDate)}</Td>
                      <Td className="text-right tabular-nums">{formatMoney(i.totals.total)}</Td>
                      <Td className={cn("text-right font-medium tabular-nums", i.totals.balance > 0 ? "text-warning" : "text-ink-4")}>
                        {formatMoney(i.totals.balance)}
                      </Td>
                    </RowLink>
                  ))}
                </tbody>
              </Table>
            </div>
            <ul className="divide-y divide-ink/[0.05] md:hidden">
              {data.items.map((i) => (
                <li key={i._id}>
                  <Link href={`/app/invoices/${i._id}`} className="flex items-center gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink">
                        <span className="mr-1.5 font-mono text-xs text-ink-4">INV-{i.number}</span>
                        {customerName(i.customer)}
                      </p>
                      <div className="mt-1.5">
                        <InvoiceStatusBadge status={i.status} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">{formatMoney(i.totals.total)}</p>
                      {i.totals.balance > 0 && <p className="text-[11px] text-warning">{formatMoney(i.totals.balance)} due</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />
          </>
        )}
      </Glass>

      <InvoiceCreateModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(inv) => router.push(`/app/invoices/${inv._id}`)}
      />
    </div>
  );
}

function InvoiceCreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (i: Invoice) => void }) {
  const { shop } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useOnOpen(open, () => {
    setCustomer(null);
    setItems([]);
    setDiscount(0);
    setNotes("");
    setDueDate(toDateInput(addDays(new Date(), 7)));
  });

  const totals = computeTotals(items, discount, shop.taxRate);

  async function save() {
    if (!customer) return toast.error("Pick a customer");
    if (!items.length) return toast.error("Add at least one item");
    setSaving(true);
    try {
      const inv = await api.post<Invoice>("/invoices", {
        customer: customer._id,
        items: items.map((i) => ({ name: i.name, description: i.description, qty: i.qty, unitPrice: i.unitPrice })),
        discount,
        taxRate: shop.taxRate,
        dueDate: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : undefined,
        notes: notes || undefined,
      });
      invalidate("/invoices", "/analytics");
      toast.success(`Invoice INV-${inv.number} created`);
      onClose();
      onCreated(inv);
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
      title="New invoice"
      size="lg"
      footer={
        <>
          <span className="mr-auto text-sm text-ink-3">
            Total <span className="font-semibold text-ink tabular-nums">{formatMoney(totals.total)}</span>
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Create invoice
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer">
          <CustomerPicker value={customer} onChange={setCustomer} />
        </Field>
        <Field label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-2">Items</p>
          <LineItemsEditor items={items} onChange={setItems} />
        </div>
        <Field label="Discount ($)">
          <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} />
        </Field>
        <div className="sm:row-span-2">
          <TotalsPanel totals={totals} />
        </div>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Thank-you note, payment terms…" />
        </Field>
      </div>
    </Modal>
  );
}

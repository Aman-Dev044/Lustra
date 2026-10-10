"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Copy, ExternalLink, MoreHorizontal, PenLine, Send, Sparkles, Trash2, Wrench, XCircle } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { serializeLineItems } from "@/lib/line-items";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Job, LineItem, Quote } from "@/lib/types";
import { customerName, vehicleLabel } from "@/lib/domain";
import { formatDate, formatDateTime, formatMoney, relativeTime, toDateInput } from "@/lib/utils";
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, Field, Glass, Input, Menu, Skeleton, Textarea } from "@/components/spatial";
import { useAuth } from "@/components/app/auth-provider";
import { useSocketEvent } from "@/components/app/realtime-provider";
import { PageHeader, QuoteStatusBadge } from "@/components/app/ui";
import { LineItemsEditor, TotalsPanel, computeTotals } from "@/components/app/line-items-editor";

type Draft = { items: LineItem[]; discount: number; title: string; notes: string; validUntil: string };

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isManager } = useAuth();
  const { data: quote, loading, error, mutate, refresh } = useApi<Quote>(`/quotes/${id}`);
  // Customer approvals/declines from the portal land here live.
  useSocketEvent<Quote>("quote:updated", (q) => {
    if (q?._id === id) void refresh();
  });
  // Unsaved edits; null means "show what the server has".
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form: Draft = draft ?? {
    items: quote?.items ?? [],
    discount: quote?.discount ?? 0,
    title: quote?.title ?? "",
    notes: quote?.notes ?? "",
    validUntil: toDateInput(quote?.validUntil),
  };
  const { items, discount, title, notes, validUntil } = form;
  const dirty = draft !== null;
  const edit = (patch: Partial<Draft>) => setDraft({ ...form, ...patch });

  if (error && !quote) {
    return <EmptyState title="Quote not found" action={<Button href="/app/quotes">Back to quotes</Button>} />;
  }
  if (loading || !quote) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const editable = quote.status === "draft" || quote.status === "sent" || quote.status === "viewed";
  const totals = dirty ? computeTotals(items, discount, quote.taxRate) : quote.totals;
  const link = typeof window !== "undefined" ? `${window.location.origin}/portal/quote/${quote.publicToken}` : "";
  const jobId = quote.job ? (typeof quote.job === "string" ? quote.job : (quote.job as unknown as Job)._id) : null;

  async function run<T>(key: string, fn: () => Promise<T>, success: string) {
    setBusy(key);
    try {
      const r = await fn();
      toast.success(success);
      invalidate("/quotes", "/analytics");
      return r;
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    const updated = await run(
      "save",
      () =>
        api.patch<Quote>(`/quotes/${id}`, {
          items: serializeLineItems(items),
          discount,
          title,
          notes,
          validUntil: validUntil ? new Date(`${validUntil}T23:59:59`).toISOString() : undefined,
        }),
      "Quote saved",
    );
    if (updated) {
      mutate(updated);
      setDraft(null);
    }
  }

  async function send() {
    if (dirty) await save();
    const updated = await run("send", () => api.post<Quote>(`/quotes/${id}/send`), `Sent to ${quote?.customer?.firstName ?? "customer"}`);
    if (updated && typeof updated === "object" && "_id" in updated) mutate(updated as Quote);
    else if (quote) mutate({ ...quote, status: "sent" });
  }

  async function convert() {
    const job = await run("convert", () => api.post<Job>(`/quotes/${id}/convert`), "Converted to a job");
    if (job?._id) {
      invalidate("/jobs");
      router.push(`/app/jobs/${job._id}`);
    }
  }

  async function remove() {
    try {
      await api.delete(`/quotes/${id}`);
      invalidate("/quotes", "/analytics");
      toast.success("Quote deleted");
      router.push("/app/quotes");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Approval link copied");
    } catch {
      toast.error("Clipboard access was blocked");
    }
  }

  return (
    <div>
      <PageHeader
        back={{ href: "/app/quotes", label: "Quotes" }}
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span className="font-mono">Q-{quote.number}</span>
            <QuoteStatusBadge status={quote.status} />
            {quote.aiGenerated && (
              <Badge tone="iris">
                <Sparkles className="size-3" /> Copilot
              </Badge>
            )}
          </span>
        }
        title={quote.title}
        description={`Created ${relativeTime(quote.createdAt)} · valid until ${formatDate(quote.validUntil)}`}
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={copyLink}>
              <Copy className="size-4" /> Approval link
            </Button>
            {jobId ? (
              <Button size="sm" href={`/app/jobs/${jobId}`}>
                <Wrench className="size-4" /> View job
              </Button>
            ) : quote.status !== "declined" ? (
              <Button size="sm" variant={quote.status === "approved" ? "primary" : "secondary"} onClick={convert} loading={busy === "convert"}>
                <Wrench className="size-4" /> Convert to job
              </Button>
            ) : null}
            {editable && (
              <Button size="sm" onClick={send} loading={busy === "send"}>
                <Send className="size-4" /> {quote.status === "draft" ? "Send" : "Resend"}
              </Button>
            )}
            <Menu
              trigger={
                <Button variant="secondary" size="icon" className="size-9" aria-label="More actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
              items={[
                { label: "Preview customer view", href: `/portal/quote/${quote.publicToken}`, icon: <ExternalLink className="size-4" /> },
                ...(isManager ? [{ label: "Delete quote", danger: true, onClick: () => setConfirmDelete(true), icon: <Trash2 className="size-4" /> }] : []),
              ]}
            />
          </>
        }
      />

      {quote.status === "approved" && (
        <Glass className="mb-5 flex items-center gap-3 border-success/30 p-4">
          <CheckCircle2 className="size-5 shrink-0 text-success" />
          <p className="text-sm text-ink-2">
            Approved {quote.approvedAt ? formatDateTime(quote.approvedAt) : ""}
            {quote.signatureName && (
              <>
                {" "}· signed by <span className="font-[cursive] text-base text-ink italic">{quote.signatureName}</span>
              </>
            )}
          </p>
        </Glass>
      )}
      {quote.status === "declined" && (
        <Glass className="mb-5 flex items-center gap-3 p-4">
          <XCircle className="size-5 shrink-0 text-danger" />
          <p className="text-sm text-ink-2">The customer declined this quote. Duplicate it with Copilot to try a different package.</p>
        </Glass>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Glass className="p-5">
          {editable && (
            <Field label="Title" className="mb-4">
              <Input
                value={title}
                onChange={(e) => {
                  edit({ title: e.target.value });
                }}
              />
            </Field>
          )}
          <LineItemsEditor
            items={items}
            readOnly={!editable}
            allowOptional
            size={quote.vehicle?.size ?? "medium"}
            onChange={(next) => {
              edit({ items: next });
            }}
          />
          <Field label="Notes to customer" className="mt-5">
            <Textarea
              value={notes}
              readOnly={!editable}
              onChange={(e) => {
                edit({ notes: e.target.value });
              }}
            />
          </Field>
          {quote.copilotPrompt && (
            <div className="mt-5 rounded-2xl border border-iris/20 bg-iris/[0.06] p-3.5 text-xs text-ink-3">
              <p className="mb-1 flex items-center gap-1.5 font-medium text-iris-soft">
                <PenLine className="size-3.5" /> Copilot prompt
              </p>
              “{quote.copilotPrompt}”
            </div>
          )}
        </Glass>

        <div className="space-y-5">
          <Glass className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={customerName(quote.customer)} size={40} />
              <div className="min-w-0">
                <Link href={`/app/customers/${quote.customer?._id}`} className="text-sm font-semibold hover:text-aqua-soft">
                  {customerName(quote.customer)}
                </Link>
                <p className="truncate text-xs text-ink-4">{quote.vehicle ? vehicleLabel(quote.vehicle) : quote.customer?.phone || quote.customer?.email}</p>
              </div>
            </div>
          </Glass>
          <Glass className="p-5 lg:sticky lg:top-24">
            <h2 className="mb-3 text-sm font-semibold">Summary</h2>
            {editable && (
              <div className="mb-4 grid grid-cols-2 gap-3">
                <Field label="Discount ($)">
                  <Input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => {
                      edit({ discount: Math.max(0, Number(e.target.value)) });
                    }}
                  />
                </Field>
                <Field label="Valid until">
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => {
                      edit({ validUntil: e.target.value });
                    }}
                  />
                </Field>
              </div>
            )}
            <TotalsPanel totals={totals} />
            {dirty && (
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                  Discard
                </Button>
                <Button size="sm" className="flex-1" onClick={save} loading={busy === "save"}>
                  Save changes
                </Button>
              </div>
            )}
            <p className="mt-4 text-[11px] text-ink-4">
              Customer total {formatMoney(totals.total)} · tax {quote.taxRate}%
            </p>
          </Glass>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await remove();
        }}
        danger
        title={`Delete quote Q-${quote.number}?`}
        description="The approval link will stop working."
        confirmLabel="Delete"
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquareReply, Send, Sparkles, Star, StarHalf } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Customer, Paginated, Review, ReviewSummary } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import { Avatar, Badge, Button, EmptyState, Field, Glass, Modal, Segmented, Skeleton, Textarea } from "@/components/spatial";
import { PageHeader, PlanGate } from "@/components/app/ui";
import { CustomerPicker } from "@/components/app/pickers";
import { SourceMark, Stars, sourceLabel } from "@/components/app/review-bits";

type Filter = "all" | "unreplied" | "low";

/** The API returns bySource as [{ source, count, average }]; older shapes used a { source: count } map. */
function bySourceList(v: unknown): [string, number][] {
  if (Array.isArray(v)) return (v as { source: string; count: number }[]).filter((x) => x.count > 0).map((x) => [x.source, x.count]);
  return Object.entries((v ?? {}) as Record<string, number>);
}

export default function ReviewsPage() {
  return (
    <PlanGate feature="reviews">
      <Reviews />
    </PlanGate>
  );
}

function Reviews() {
  const { data, loading } = useApi<Paginated<Review> & { summary?: ReviewSummary }>("/reviews", { pageSize: 200 });
  const [filter, setFilter] = useState<Filter>("all");
  const [source, setSource] = useState<string>("all");
  const [requesting, setRequesting] = useState(false);
  const reviews = useMemo(() => data?.items ?? [], [data]);
  const summary = data?.summary;
  const filtered = reviews.filter(
    (r) => (filter === "all" || (filter === "unreplied" ? r.status !== "replied" : r.rating <= 3)) && (source === "all" || r.source === source),
  );

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Every review across Google, Facebook, Yelp and Lustra in one feed — reply fast with AI-drafted responses."
        actions={
          <Button onClick={() => setRequesting(true)}>
            <Send className="size-4" /> Request review
          </Button>
        }
      />

      {loading || !summary ? (
        <Skeleton className="mb-4 h-44" />
      ) : (
        <Glass tier={2} rim className="mb-4 grid gap-6 p-6 md:grid-cols-[200px_1fr_220px]">
          <div className="text-center md:text-left">
            <p className="text-6xl font-semibold tracking-tight tabular-nums">{summary.average.toFixed(1)}</p>
            <Stars value={summary.average} size={18} className="mt-2" />
            <p className="mt-1 text-xs text-ink-3">{summary.count} reviews</p>
          </div>
          <ul className="space-y-1.5">
            {([5, 4, 3, 2, 1] as const).map((n) => {
              const c = summary.distribution[String(n) as "1"] ?? 0;
              const pct = summary.count ? (c / summary.count) * 100 : 0;
              return (
                <li key={n} className="flex items-center gap-3 text-xs">
                  <span className="flex w-8 items-center gap-0.5 text-ink-3">
                    {n} <Star className="size-3 fill-warning text-warning" />
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                    <span className="block h-full rounded-full bg-gradient-to-r from-warning to-ember" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-8 text-right text-ink-4 tabular-nums">{c}</span>
                </li>
              );
            })}
          </ul>
          <div className="space-y-3">
            <div className="rounded-2xl bg-ink/[0.04] p-3">
              <p className="text-[11px] text-ink-4">Response rate</p>
              <p className="text-xl font-semibold tabular-nums">{Math.round(summary.responseRate)}%</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {bySourceList(summary.bySource).map(([s, n]) => (
                <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 px-2 py-1 text-[11px] text-ink-2">
                  <SourceMark source={s as Review["source"]} size={16} /> {n}
                </span>
              ))}
            </div>
          </div>
        </Glass>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "unreplied", label: "Needs reply" },
            { value: "low", label: <><StarHalf className="size-3.5" /> 3★ & below</> },
          ]}
        />
        <div className="flex gap-1.5">
          {["all", "google", "facebook", "yelp", "lustra"].map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              aria-pressed={source === s}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition", source === s ? "border-aqua/50 bg-aqua/15 text-aqua-soft" : "border-ink/10 text-ink-3 hover:text-ink")}
            >
              {s !== "all" && <SourceMark source={s as Review["source"]} size={14} />}
              {s === "all" ? "All sources" : sourceLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Glass>
          <EmptyState icon={<Star className="size-7" />} title="No reviews here" description="Send review requests after every completed job to keep fresh 5-star reviews flowing." />
        </Glass>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <ReviewCard key={r._id} review={r} />
          ))}
        </div>
      )}

      <RequestModal open={requesting} onClose={() => setRequesting(false)} />
    </>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState(review.reply ?? "");
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const customer = review.customer && typeof review.customer === "object" ? (review.customer as Customer) : null;

  async function suggest() {
    setSuggesting(true);
    try {
      const r = await api.post<{ suggestions: string[] }>(`/reviews/${review._id}/suggest-reply`);
      setSuggestions(r.suggestions);
      setReplying(true);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSuggesting(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/reviews/${review._id}`, { reply: text.trim() });
      invalidate("/reviews");
      toast.success("Reply posted");
      setReplying(false);
      setSuggestions(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Glass className={cn("p-5", review.rating <= 2 && review.status !== "replied" && "border-danger/30")}>
      <div className="flex items-start gap-3">
        <Avatar name={review.author} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{review.author}</p>
            <SourceMark source={review.source} size={18} />
            <Stars value={review.rating} />
            <span className="text-xs text-ink-4">{relativeTime(review.createdAt)}</span>
            {review.status !== "replied" && <Badge tone="warning">Needs reply</Badge>}
            {customer && (
              <Link href={`/app/customers/${customer._id}`} className="text-xs text-aqua-soft hover:text-ink">
                View customer
              </Link>
            )}
          </div>
          {review.comment && <p className="mt-2 text-sm leading-relaxed text-ink-2">{review.comment}</p>}

          {review.reply && !replying && (
            <div className="mt-3 rounded-2xl border-l-2 border-iris bg-ink/[0.04] px-4 py-3">
              <p className="text-[11px] text-ink-4">Your reply · {relativeTime(review.repliedAt)}</p>
              <p className="mt-1 text-sm text-ink-2">{review.reply}</p>
            </div>
          )}

          {replying ? (
            <div className="mt-3 space-y-2">
              {suggestions && (
                <div className="flex flex-col gap-1.5">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setText(s)}
                      className={cn("rounded-2xl border px-3 py-2 text-left text-xs transition", text === s ? "border-iris/50 bg-iris/15 text-ink" : "border-ink/10 text-ink-3 hover:text-ink")}
                    >
                      <Sparkles className="mr-1.5 inline size-3 text-iris-soft" /> {s}
                    </button>
                  ))}
                </div>
              )}
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a public reply…" aria-label="Reply" />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={save} loading={saving} disabled={!text.trim()}>
                  Post reply
                </Button>
                <Button size="sm" variant="secondary" onClick={suggest} loading={suggesting}>
                  <Sparkles className="size-3.5" /> {suggestions ? "More ideas" : "AI suggest"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <Button size="xs" variant="secondary" onClick={() => setReplying(true)}>
                <MessageSquareReply className="size-3.5" /> {review.reply ? "Edit reply" : "Reply"}
              </Button>
              {!review.reply && (
                <Button size="xs" variant="ghost" onClick={suggest} loading={suggesting}>
                  <Sparkles className="size-3.5" /> AI suggest
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Glass>
  );
}

function RequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!customer) return;
    setSending(true);
    try {
      await api.post("/reviews/request", { customer: customer._id });
      toast.success(`Review request texted to ${customer.firstName}`);
      setCustomer(null);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request a review"
      description="We'll text a one-tap rating link. Happy customers are guided to post publicly."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send} loading={sending} disabled={!customer}>
            <Send className="size-4" /> Send request
          </Button>
        </>
      }
    >
      <Field label="Customer">
        <CustomerPicker value={customer} onChange={setCustomer} />
      </Field>
    </Modal>
  );
}

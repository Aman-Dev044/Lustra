"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Bot, Mail, MessageSquare, MessagesSquare, PenSquare, Search, Send, Sparkles, StickyNote, Zap } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Customer, Message, Paginated, Thread } from "@/lib/types";
import { customerName } from "@/lib/domain";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import { Avatar, Badge, Button, EmptyState, Field, Glass, Input, Modal, Segmented, Skeleton } from "@/components/spatial";
import { PageHeader } from "@/components/app/ui";
import { CustomerPicker } from "@/components/app/pickers";
import { useAuth } from "@/components/app/auth-provider";

type Channel = Message["channel"];

const templates = [
  { label: "On my way", body: "Hi {{firstName}}, this is {{shop}} — we're on our way and should arrive in about 20 minutes." },
  { label: "Ready for pickup", body: "Great news {{firstName}}! Your vehicle is finished and ready for pickup. See you soon — {{shop}}" },
  { label: "Review request", body: "Thanks for trusting {{shop}}, {{firstName}}! If you loved the result, a quick review would mean the world to our team." },
  { label: "Payment reminder", body: "Hi {{firstName}}, a friendly reminder that your invoice from {{shop}} is ready. You can pay securely from your portal link anytime." },
];

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <Inbox />
    </Suspense>
  );
}

function Inbox() {
  const params = useSearchParams();
  const router = useRouter();
  const selectedId = params.get("customer");
  const { data: threads, loading } = useApi<Thread[]>("/messages/threads");
  const [q, setQ] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [extraCustomer, setExtraCustomer] = useState<Customer | null>(null);

  const list = useMemo(
    () => (threads ?? []).filter((t) => !q || `${customerName(t.customer)} ${t.lastMessage?.body}`.toLowerCase().includes(q.toLowerCase())),
    [threads, q],
  );
  const selectedThread = threads?.find((t) => t.customer._id === selectedId);
  const { data: fetchedCustomer } = useApi<Customer>(selectedId && !selectedThread && extraCustomer?._id !== selectedId ? `/customers/${selectedId}` : null);
  const selectedCustomer = selectedThread?.customer ?? (extraCustomer?._id === selectedId ? extraCustomer : fetchedCustomer) ?? null;

  const select = (id: string | null) => router.replace(id ? `/app/messages?customer=${id}` : "/app/messages", { scroll: false });

  return (
    <>
      <PageHeader
        title="Messages"
        description="Every text, email and automated touchpoint — one unified inbox."
        actions={
          <Button onClick={() => setComposeOpen(true)}>
            <PenSquare className="size-4" /> New message
          </Button>
        }
      />
      <Glass className="grid h-[calc(100dvh-210px)] min-h-[520px] overflow-hidden lg:grid-cols-[340px_1fr]">
        {/* Threads */}
        <aside className={cn("flex min-h-0 flex-col border-white/[0.07] lg:border-r", selectedId && "hidden lg:flex")}>
          <div className="p-3">
            <div className="glass-inset flex h-10 items-center gap-2 rounded-full px-4">
              <Search className="size-4 text-ink-4" aria-hidden />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search conversations"
                aria-label="Search conversations"
                className="h-full flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto px-2 pb-2">
            {loading &&
              Array.from({ length: 7 }).map((_, i) => (
                <li key={i} className="p-2">
                  <Skeleton className="h-14" />
                </li>
              ))}
            {!loading && list.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink-4">No conversations yet.</li>}
            {list.map((t) => {
              const active = t.customer._id === selectedId;
              return (
                <li key={t.customer._id}>
                  <button
                    onClick={() => select(t.customer._id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition",
                      active ? "bg-white/[0.09]" : "hover:bg-white/[0.05]",
                    )}
                  >
                    <Avatar name={customerName(t.customer)} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn("truncate text-sm", t.unread ? "font-semibold text-ink" : "text-ink-2")}>{customerName(t.customer)}</span>
                        <span className="shrink-0 text-[10px] text-ink-4">{relativeTime(t.lastMessage?.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className={cn("line-clamp-1 flex-1 text-xs", t.unread ? "text-ink-2" : "text-ink-4")}>
                          {t.lastMessage?.direction === "outbound" && "You: "}
                          {t.lastMessage?.body}
                        </span>
                        {t.unread > 0 && (
                          <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-aqua px-1 text-[10px] font-bold text-[#04121a]">
                            {t.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Conversation */}
        <section className={cn("flex min-h-0 flex-col", !selectedId && "hidden lg:flex")}>
          {selectedId && selectedCustomer ? (
            <Conversation customer={selectedCustomer} unread={selectedThread?.unread ?? 0} onBack={() => select(null)} />
          ) : selectedId ? (
            <div className="p-6">
              <Skeleton className="h-full min-h-60" />
            </div>
          ) : (
            <EmptyState
              className="m-auto"
              icon={<MessagesSquare className="size-7" />}
              title="Pick a conversation"
              description="Reply by SMS or email, drop internal notes, and see every automated message your workflows sent."
            />
          )}
        </section>
      </Glass>

      <Modal open={composeOpen} onClose={() => setComposeOpen(false)} title="New message" description="Choose a customer to start a conversation." size="sm">
        <Field label="Customer">
          <CustomerPicker
            value={null}
            onChange={(c) => {
              if (!c) return;
              setExtraCustomer(c);
              setComposeOpen(false);
              select(c._id);
            }}
          />
        </Field>
      </Modal>
    </>
  );
}

function Conversation({ customer, unread, onBack }: { customer: Customer; unread: number; onBack: () => void }) {
  const { shop } = useAuth();
  const { data, loading } = useApi<Paginated<Message> | Message[]>("/messages", { customer: customer._id, pageSize: 200 });
  const [channel, setChannel] = useState<Channel>("sms");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    const arr = Array.isArray(data) ? data : (data?.items ?? []);
    return [...arr].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [data]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, customer._id]);

  useEffect(() => {
    if (unread > 0) {
      api
        .post("/messages/read", { customer: customer._id })
        .then(() => invalidate("/messages/threads"))
        .catch(() => undefined);
    }
  }, [customer._id, unread]);

  async function suggest() {
    setSuggesting(true);
    try {
      const r = await api.post<{ suggestions: string[] }>("/messages/suggest", { customer: customer._id });
      setSuggestions(r.suggestions);
      if (!r.suggestions.length) toast("No suggestions for this conversation yet");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSuggesting(false);
    }
  }

  const fill = (tpl: string) => tpl.replaceAll("{{firstName}}", customer.firstName || "there").replaceAll("{{shop}}", shop.name);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await api.post("/messages", { customer: customer._id, channel, body: body.trim(), subject: channel === "email" ? subject || `A message from ${shop.name}` : undefined });
      setBody("");
      setSubject("");
      setSuggestions(null);
      invalidate("/messages");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  const canSend = channel === "sms" ? !!customer.phone : channel === "email" ? !!customer.email : true;

  return (
    <>
      <header className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
        <button onClick={onBack} className="rounded-full p-2 text-ink-3 hover:bg-white/10 lg:hidden" aria-label="Back to conversations">
          <ArrowLeft className="size-4" />
        </button>
        <Avatar name={customerName(customer)} size={38} />
        <div className="min-w-0 flex-1">
          <Link href={`/app/customers/${customer._id}`} className="truncate text-sm font-semibold text-ink hover:text-aqua-soft">
            {customerName(customer)}
          </Link>
          <p className="truncate text-xs text-ink-4">{[customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact details"}</p>
        </div>
      </header>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {loading && <Skeleton className="h-40" />}
        {!loading && messages.length === 0 && <p className="py-10 text-center text-sm text-ink-4">No messages yet — say hi 👋</p>}
        {messages.map((m) => {
          const out = m.direction === "outbound";
          if (m.channel === "note") {
            return (
              <div key={m._id} className="mx-auto max-w-md rounded-2xl border border-warning/25 bg-warning/[0.07] px-4 py-2.5 text-center text-xs text-warning/90">
                <StickyNote className="mr-1.5 inline size-3.5" /> {m.body}
                <span className="mt-1 block text-[10px] text-ink-4">Internal note · {formatDateTime(m.createdAt)}</span>
              </div>
            );
          }
          return (
            <div key={m._id} className={cn("flex", out ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[78%]", out && "text-right")}>
                <div
                  className={cn(
                    "inline-block rounded-3xl px-4 py-2.5 text-left text-sm leading-relaxed whitespace-pre-wrap",
                    out
                      ? m.channel === "email"
                        ? "rounded-br-lg border border-info/30 bg-info/15 text-ink"
                        : "bg-spectral rounded-br-lg text-white shadow-[0_8px_24px_-12px_rgb(124_92_255/0.8)]"
                      : "glass rounded-bl-lg text-ink",
                  )}
                >
                  {m.channel === "email" && m.subject && <p className="mb-1 text-xs font-semibold opacity-80">{m.subject}</p>}
                  {m.body}
                </div>
                <p className="mt-1 flex items-center gap-1.5 px-1 text-[10px] text-ink-4" style={{ justifyContent: out ? "flex-end" : "flex-start" }}>
                  {m.channel === "email" ? <Mail className="size-3" /> : <MessageSquare className="size-3" />}
                  {formatDateTime(m.createdAt)}
                  {m.automation && (
                    <Badge tone="iris" className="px-1.5 py-0 text-[9px]">
                      <Bot className="size-2.5" /> Automation
                    </Badge>
                  )}
                  {out && m.status === "failed" && <span className="text-danger">Failed</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="border-t border-white/[0.07] p-3">
        {suggestions && suggestions.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5" aria-label="AI reply suggestions">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setBody(s);
                  if (channel === "note") setChannel("sms");
                }}
                className="max-w-full rounded-2xl border border-iris/30 bg-iris/10 px-3 py-1.5 text-left text-xs text-ink-2 transition hover:bg-iris/20 hover:text-ink"
              >
                <Sparkles className="mr-1 inline size-3 text-iris-soft" />
                {s}
              </button>
            ))}
            <button type="button" onClick={() => setSuggestions(null)} className="px-2 text-[11px] text-ink-4 hover:text-ink">
              Dismiss
            </button>
          </div>
        )}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Segmented
            size="sm"
            value={channel}
            onChange={setChannel}
            options={[
              { value: "sms", label: <><MessageSquare className="size-3.5" /> SMS</> },
              { value: "email", label: <><Mail className="size-3.5" /> Email</> },
              { value: "note", label: <><StickyNote className="size-3.5" /> Note</> },
            ]}
          />
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => void suggest()}
              disabled={suggesting}
              className="inline-flex items-center gap-1 rounded-full border border-iris/40 bg-iris/10 px-2.5 py-1 text-[11px] text-iris-soft transition hover:bg-iris/20 disabled:opacity-60"
            >
              <Sparkles className={cn("size-3", suggesting && "animate-spin")} /> {suggesting ? "Thinking…" : "Suggest replies"}
            </button>
            {templates.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => setBody(fill(t.body))}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-ink-3 transition hover:border-aqua/40 hover:text-ink"
              >
                <Zap className="size-3" /> {t.label}
              </button>
            ))}
          </div>
        </div>
        {channel === "email" && <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="mb-2 h-10" />}
        <div className="glass-inset flex items-end gap-2 rounded-3xl p-1.5 pl-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder={
              !canSend
                ? `No ${channel === "sms" ? "phone number" : "email"} on file for this customer`
                : channel === "note"
                  ? "Internal note — customers never see this"
                  : `Message ${customer.firstName}…`
            }
            disabled={!canSend}
            aria-label="Message"
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-sm text-ink placeholder:text-ink-4 focus:outline-none"
          />
          <Button type="submit" size="icon" className="shrink-0" loading={sending} disabled={!body.trim() || !canSend} aria-label="Send">
            {!sending && <Send className="size-4" />}
          </Button>
        </div>
        {channel === "sms" && body.length > 0 && (
          <p className="mt-1 px-2 text-right text-[10px] text-ink-4">
            {body.length} chars · {Math.ceil(body.length / 160)} segment{body.length > 160 ? "s" : ""}
          </p>
        )}
      </form>
    </>
  );
}

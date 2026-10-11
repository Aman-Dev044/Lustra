"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, Check, Lock, Send, Sparkles, Wand2 } from "lucide-react";
import { addDays } from "date-fns";
import { api, errorMessage } from "@/lib/api";
import { serializeLineItems } from "@/lib/line-items";
import { invalidate } from "@/lib/hooks/use-api";
import type { CopilotResult, Customer, LineItem, Quote, Vehicle, VehicleSize, VehicleType } from "@/lib/types";
import { categoryMeta, vehicleLabel } from "@/lib/domain";
import { cn, formatDuration, formatMoney, toDateInput, titleCase } from "@/lib/utils";
import { Badge, Button, Field, Glass, Input, Select, Textarea } from "@/components/spatial";
import { useAuth } from "@/components/app/auth-provider";
import { PageHeader } from "@/components/app/ui";
import { CustomerPicker, VehiclePicker } from "@/components/app/pickers";
import { LineItemsEditor, TotalsPanel, computeTotals } from "@/components/app/line-items-editor";

const SUGGESTIONS = [
  "2022 Tesla Model Y, white, heavy swirls — wants 5-year ceramic and full front PPF",
  "F-150 crew cab, neglected interior with pet hair and stains, plus a maintenance wash",
  "Porsche 911 GT3 track pack PPF, ceramic on wheels and calipers",
  "BMW M3 ceramic window tint all around + windshield strip, 20% sides",
  "32ft center console boat, heavy oxidation on gelcoat, needs compound and sealant",
];

export default function NewQuotePage() {
  return (
    <Suspense>
      <NewQuoteView />
    </Suspense>
  );
}

function NewQuoteView() {
  const router = useRouter();
  const params = useSearchParams();
  const { shop, can } = useAuth();
  const copilot = can("quote_copilot");

  const [prompt, setPrompt] = useState("");
  const [vType, setVType] = useState<VehicleType | "">("");
  const [vSize, setVSize] = useState<VehicleSize | "">("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<CopilotResult | null>(null);
  const [revealed, setRevealed] = useState(0);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [validUntil, setValidUntil] = useState(() => toDateInput(addDays(new Date(), 14)));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState<"draft" | "send" | null>(null);

  useEffect(() => {
    const id = params.get("customer");
    if (id) api.get<Customer>(`/customers/${id}`).then(setCustomer).catch(() => undefined);
  }, [params]);

  useEffect(() => () => {
    if (revealTimer.current) clearInterval(revealTimer.current);
  }, []);

  // The vehicle on the quote informs Copilot's size detection when the user didn't pick one.
  function pickVehicle(v: Vehicle | null) {
    setVehicle(v);
    if (v && !vType) setVType(v.type);
    if (v && !vSize) setVSize(v.size);
  }

  async function generate() {
    if (prompt.trim().length < 8) return toast.error("Describe the vehicle and the work in a sentence or two");
    setGenerating(true);
    setResult(null);
    setRevealed(0);
    if (revealTimer.current) clearInterval(revealTimer.current);
    try {
      const fullPrompt = vehicle && !prompt.toLowerCase().includes((vehicle.make ?? "").toLowerCase()) ? `${vehicleLabel(vehicle)} — ${prompt}` : prompt;
      const r = await api.post<CopilotResult>("/quotes/copilot", {
        prompt: fullPrompt,
        vehicleSize: vSize || undefined,
        vehicleType: vType || undefined,
      });
      setResult(r);
      const steps = r.reasoning.length + r.items.length;
      let n = 0;
      revealTimer.current = setInterval(() => {
        n += 1;
        setRevealed(n);
        if (n >= steps && revealTimer.current) {
          clearInterval(revealTimer.current);
          revealTimer.current = null;
        }
      }, 260);
      // Upsells arrive unselected so the headline price matches Copilot's total; the customer can opt in.
      setItems(r.items.map((i) => ({ ...i, selected: i.selected ?? !i.optional })));
      if (!title) {
        const cats = r.detected.categories.slice(0, 3).map((c) => categoryMeta[c as keyof typeof categoryMeta]?.label ?? titleCase(c));
        setTitle(cats.length ? cats.join(" + ") : "Custom package");
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setGenerating(false);
    }
  }

  const totals = computeTotals(items, discount, shop.taxRate);

  async function save(mode: "draft" | "send") {
    if (!customer) return toast.error("Choose who this quote is for");
    if (!items.length) return toast.error("Add at least one line item");
    setSaving(mode);
    try {
      const quote = await api.post<Quote>("/quotes", {
        customer: customer._id,
        vehicle: vehicle?._id,
        title: title || "Quote",
        items: serializeLineItems(items),
        discount,
        taxRate: shop.taxRate,
        validUntil: validUntil ? new Date(`${validUntil}T23:59:59`).toISOString() : undefined,
        notes: notes || undefined,
        aiGenerated: !!result,
        copilotPrompt: result ? prompt : undefined,
      });
      if (mode === "send") await api.post(`/quotes/${quote._id}/send`);
      invalidate("/quotes", "/customers", "/analytics");
      toast.success(mode === "send" ? `Quote Q-${quote.number} sent to ${customer.firstName}` : `Quote Q-${quote.number} saved`);
      router.push(`/app/quotes/${quote._id}`);
    } catch (e) {
      toast.error(errorMessage(e));
      setSaving(null);
    }
  }

  const confidence = result ? Math.round(result.confidence > 1 ? result.confidence : result.confidence * 100) : 0;
  const reasoningShown = result ? result.reasoning.slice(0, Math.min(revealed, result.reasoning.length)) : [];
  const itemsShown = result ? Math.max(0, revealed - result.reasoning.length) : 0;

  return (
    <div>
      <PageHeader
        back={{ href: "/app/quotes", label: "Quotes" }}
        eyebrow={copilot ? <span className="inline-flex items-center gap-1.5"><Sparkles className="size-3.5" /> AI Quote Copilot</span> : undefined}
        title="New quote"
        description="Describe the job in plain English — Copilot prices it from your own service catalog."
      />

      {copilot ? (
        <Glass tier={2} rim className="relative mb-5 overflow-hidden rounded-[28px] p-5 sm:p-7">
          <div className="pointer-events-none absolute -top-32 left-1/4 size-80 rounded-full bg-iris/25 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -right-20 -bottom-32 size-80 rounded-full bg-aqua/15 blur-3xl" aria-hidden />
          <div className="relative">
            <label htmlFor="copilot-prompt" className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
              <Wand2 className="size-4 text-aqua-soft" /> What are we quoting?
            </label>
            <div className="glass-inset rounded-[22px] p-1.5 focus-within:border-aqua/50 focus-within:ring-4 focus-within:ring-aqua/10">
              <textarea
                id="copilot-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void generate();
                }}
                rows={3}
                placeholder="Describe the job… e.g. 2022 Tesla Model Y, white, heavy swirls, wants 5-year ceramic and full front PPF"
                className="w-full resize-none bg-transparent px-3.5 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-4 focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-2 px-2 pb-1.5">
                <Select value={vType} onChange={(e) => setVType(e.target.value as VehicleType | "")} className="h-9 w-auto rounded-full text-xs" aria-label="Vehicle type">
                  <option value="">Type: auto-detect</option>
                  {["car", "suv", "truck", "van", "motorcycle", "boat", "rv"].map((t) => (
                    <option key={t} value={t}>
                      {titleCase(t)}
                    </option>
                  ))}
                </Select>
                <Select value={vSize} onChange={(e) => setVSize(e.target.value as VehicleSize | "")} className="h-9 w-auto rounded-full text-xs" aria-label="Vehicle size">
                  <option value="">Size: auto-detect</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xl">XL</option>
                </Select>
                <span className="ml-auto hidden text-[11px] text-ink-4 sm:block">Ctrl + Enter</span>
                <Button onClick={generate} loading={generating} className="h-10">
                  {!generating && <Sparkles className="size-4" />} Generate quote
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className="max-w-full truncate rounded-full border border-ink/[0.08] bg-ink/[0.03] px-3 py-1.5 text-xs text-ink-3 transition hover:border-aqua/40 hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {(generating || result) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.3fr]">
                    <div>
                      <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-ink-4 uppercase">Reasoning</p>
                      {generating && !result ? (
                        <div className="space-y-2">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="shimmer h-5 rounded-lg" style={{ width: `${90 - i * 18}%` }} />
                          ))}
                        </div>
                      ) : (
                        <ol className="space-y-2">
                          {reasoningShown.map((r, i) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -8, filter: "blur(4px)" }}
                              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                              className="flex gap-2.5 text-sm text-ink-2"
                            >
                              <Check className="mt-0.5 size-4 shrink-0 text-success" /> {r}
                            </motion.li>
                          ))}
                        </ol>
                      )}
                      {result && (
                        <div className="mt-5 space-y-3">
                          <div>
                            <div className="mb-1.5 flex justify-between text-xs">
                              <span className="text-ink-3">Confidence</span>
                              <span className="font-semibold tabular-nums">{confidence}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-ink/[0.06]">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: confidence > 75 ? "linear-gradient(90deg,#7c5cff,#34d399)" : confidence > 50 ? "linear-gradient(90deg,#7c5cff,#22d3ee)" : "linear-gradient(90deg,#fb923c,#fbbf24)" }}
                                initial={{ width: 0 }}
                                animate={{ width: `${confidence}%` }}
                                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge tone="aqua">Size: {result.detected.size}</Badge>
                            <Badge tone={result.detected.condition === "good" ? "success" : "warning"}>Condition: {result.detected.condition}</Badge>
                            {result.detected.categories.map((c) => (
                              <Badge key={c} tone="iris">
                                {categoryMeta[c as keyof typeof categoryMeta]?.label ?? titleCase(c)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-ink-4 uppercase">Suggested package</p>
                      <ul className="space-y-2">
                        {(result?.items ?? []).slice(0, itemsShown).map((it, i) => (
                          <motion.li
                            key={`${it.name}-${i}`}
                            initial={{ opacity: 0, y: 12, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 24 }}
                            className="glass flex items-center gap-3 rounded-2xl px-4 py-3"
                          >
                            <span className="size-2 shrink-0 rounded-full" style={{ background: categoryMeta[it.category ?? "other"]?.color }} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-ink">{it.name}</span>
                              {it.optional && <span className="text-[11px] text-aqua-soft">Suggested upsell · optional</span>}
                            </span>
                            <span className="text-sm font-medium tabular-nums">{formatMoney(it.unitPrice * it.qty)}</span>
                          </motion.li>
                        ))}
                      </ul>
                      {result && itemsShown >= result.items.length && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink/[0.04] px-4 py-3">
                          <span className="text-sm text-ink-2">
                            {formatMoney(result.total)} · about {formatDuration(result.durationMinutes)} of work
                          </span>
                          <a href="#quote-builder" className="inline-flex items-center gap-1 text-sm font-medium text-aqua-soft hover:text-ink">
                            Review & send <ArrowRight className="size-4" />
                          </a>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Glass>
      ) : (
        <Glass className="mb-5 flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-iris to-aqua">
            <Lock className="size-5 text-white" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Let AI Quote Copilot build this for you</p>
            <p className="text-xs text-ink-3">Describe the job in a sentence and get an itemized, size-adjusted quote with upsells. Included on Pro and Enterprise.</p>
          </div>
          <Button size="sm" href="/app/settings?tab=billing">
            <Sparkles className="size-4" /> Upgrade
          </Button>
        </Glass>
      )}

      <div id="quote-builder" className="grid scroll-mt-24 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Glass className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer">
              <CustomerPicker
                value={customer}
                onChange={(c) => {
                  setCustomer(c);
                  setVehicle(null);
                }}
              />
            </Field>
            <Field label="Vehicle">
              <VehiclePicker customerId={customer?._id ?? null} value={vehicle} onChange={pickVehicle} />
            </Field>
            <Field label="Quote title" className="sm:col-span-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Signature protection package" />
            </Field>
          </div>
          <div className="mt-5">
            <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-2">Line items</p>
            <LineItemsEditor items={items} onChange={setItems} size={vehicle?.size ?? (vSize || "medium")} allowOptional />
          </div>
          <Field label="Notes to customer" className="mt-5">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Warranty terms, prep instructions, cure time…" />
          </Field>
        </Glass>

        <div className="space-y-5">
          <Glass className="p-5 lg:sticky lg:top-24">
            <h2 className="mb-3 text-sm font-semibold">Summary</h2>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <Field label="Discount ($)">
                <Input type="number" min={0} step="1" value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} />
              </Field>
              <Field label="Valid until">
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </Field>
            </div>
            <TotalsPanel totals={totals} />
            {items.some((i) => i.optional) && (
              <p className="mt-2 text-[11px] text-ink-4">Optional add-ons are shown to the customer as toggles they can accept.</p>
            )}
            <div className="mt-5 grid gap-2">
              <Button onClick={() => save("send")} loading={saving === "send"} disabled={!!saving}>
                <Send className="size-4" /> Save & send to customer
              </Button>
              <Button variant="secondary" onClick={() => save("draft")} loading={saving === "draft"} disabled={!!saving}>
                Save as draft
              </Button>
            </div>
            {customer && !customer.phone && !customer.email && (
              <p className={cn("mt-3 text-[11px] text-warning")}>This customer has no phone or email — sending will only log the quote.</p>
            )}
          </Glass>
        </div>
      </div>
    </div>
  );
}

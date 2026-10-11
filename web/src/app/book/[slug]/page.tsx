"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarCheck2, CalendarX2, Car, Check, Clock, Loader2, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, errorMessage } from "@/lib/api";
import type { Service, Shop, VehicleType } from "@/lib/types";
import { categoryMeta } from "@/lib/domain";
import { cn, formatDuration, formatMoney } from "@/lib/utils";
import { Button, Field, Input, Select, Skeleton, Textarea } from "@/components/spatial";
import { PublicShell, PublicState } from "@/components/app/public-shell";

type PublicShopData = {
  shop: Pick<Shop, "name" | "slug" | "industry" | "phone" | "email" | "address" | "brandColor" | "logoUrl" | "booking">;
  services: Service[];
  bookingAvailable?: boolean;
};
type Slot = { start: string; end: string; available: boolean };

const steps = ["Services", "Vehicle", "Date & time", "Details", "Review"] as const;

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicShopData | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "error">("loading");

  useEffect(() => {
    api
      .get<PublicShopData>(`/public/shops/${slug}`)
      .then((d) => {
        setData(d);
        setState("ready");
      })
      .catch((e) => setState(e instanceof ApiError && e.status === 404 ? "notfound" : "error"));
  }, [slug]);

  if (state === "loading")
    return (
      <PublicShell>
        <Skeleton className="mx-auto h-10 w-72" />
        <Skeleton className="mx-auto mt-8 h-96 max-w-3xl" />
      </PublicShell>
    );
  if (state === "notfound" || !data)
    return (
      <PublicShell>
        <PublicState
          icon={<CalendarX2 className="size-6" />}
          title={state === "notfound" ? "Booking page not found" : "We couldn't load this booking page"}
          description={state === "notfound" ? "Double-check the link with the shop." : "Please refresh in a moment."}
        />
      </PublicShell>
    );

  const { shop } = data;
  if (!shop.booking?.enabled || data.bookingAvailable === false) {
    return (
      <PublicShell shop={shop}>
        <PublicState
          icon={<CalendarX2 className="size-6" />}
          title={`${shop.name} isn't taking online bookings right now`}
          description={[shop.phone && `Call ${shop.phone}`, shop.email && `email ${shop.email}`].filter(Boolean).join(" or ") || "Please contact the shop directly."}
        />
      </PublicShell>
    );
  }
  return (
    <PublicShell shop={shop}>
      <Wizard data={data} slug={slug} />
    </PublicShell>
  );
}

function Wizard({ data, slug }: { data: PublicShopData; slug: string }) {
  const { shop, services } = data;
  const brand = shop.brandColor || "#7c5cff";
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [vehicle, setVehicle] = useState({ year: "", make: "", model: "", type: "car" as VehicleType, color: "" });
  const [date, setDate] = useState<Date | null>(null);
  const [slotsFor, setSlotsFor] = useState<{ key: string; slots: Slot[] } | null>(null);
  const [nonce, setNonce] = useState(0);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [contact, setContact] = useState({ firstName: "", lastName: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ number: number; portalToken: string } | null>(null);

  const chosen = services.filter((s) => selected.includes(s._id));
  const total = chosen.reduce((s, x) => s + x.basePrice, 0);
  const duration = chosen.reduce((s, x) => s + x.durationMinutes, 0);
  const grouped = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const s of services) map.set(s.category, [...(map.get(s.category) ?? []), s]);
    return Array.from(map.entries());
  }, [services]);

  const today = startOfDay(new Date());
  const dates = Array.from({ length: 30 }, (_, i) => addDays(today, i));
  const isClosed = (d: Date) => {
    const wh = shop.booking.workingHours?.find((h) => h.day === d.getDay());
    return !wh || wh.closed;
  };

  const slotsKey = date && selected.length ? `${format(date, "yyyy-MM-dd")}|${selected.join(",")}|${nonce}` : null;
  const slots = slotsFor && slotsFor.key === slotsKey ? slotsFor.slots : null;
  const slotsLoading = !!slotsKey && !slots;

  useEffect(() => {
    if (!slotsKey || !date) return;
    let cancelled = false;
    api
      .get<{ slots: Slot[] }>(`/public/shops/${slug}/availability`, { date: format(date, "yyyy-MM-dd"), services: selected.join(",") })
      .then((r) => {
        if (!cancelled) setSlotsFor({ key: slotsKey, slots: r.slots });
      })
      .catch((e) => {
        if (cancelled) return;
        toast.error(errorMessage(e));
        setSlotsFor({ key: slotsKey, slots: [] });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotsKey, slug]);

  const canNext = [
    selected.length > 0,
    !!vehicle.make && !!vehicle.model,
    !!slot,
    !!contact.firstName && !!contact.lastName && !!contact.phone && /\S+@\S+\.\S+/.test(contact.email),
    true,
  ][step];

  async function submit() {
    if (!slot) return;
    setSubmitting(true);
    try {
      const r = await api.post<{ job: { number: number; portalToken: string } }>(`/public/shops/${slug}/bookings`, {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        notes: contact.notes || undefined,
        vehicle: { ...vehicle, year: vehicle.year ? Number(vehicle.year) : undefined },
        services: selected,
        start: slot.start,
      });
      setDone(r.job);
    } catch (e) {
      toast.error(errorMessage(e));
      if (e instanceof ApiError && e.status === 409) {
        setStep(2);
        setSlot(null);
        setNonce((n) => n + 1);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return <Success shopName={shop.name} number={done.number} token={done.portalToken} when={slot?.start} brand={brand} />;

  return (
    <div>
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: brand }}>
          Online booking
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{shop.booking.headline || `Book with ${shop.name}`}</h1>
        {shop.address && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-3">
            <MapPin className="size-3.5" /> {shop.address}
          </p>
        )}
      </div>

      <ol className="mx-auto mt-8 flex max-w-2xl items-center gap-2" aria-label="Booking progress">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              className={cn("h-1.5 w-full rounded-full transition-all duration-500", i <= step ? "" : "bg-ink/10")}
              style={i <= step ? { background: `linear-gradient(90deg, ${brand}, #22d3ee)`, boxShadow: `0 0 12px -2px ${brand}` } : undefined}
            />
            <span className={cn("hidden text-[11px] sm:block", i === step ? "text-ink" : "text-ink-4")} aria-current={i === step ? "step" : undefined}>
              {s}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="glass-2 rim min-h-[420px] rounded-[28px] p-5 sm:p-7">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
              {step === 0 && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">What can we do for you?</h2>
                  {services.length === 0 && <p className="text-sm text-ink-3">No services are bookable online yet.</p>}
                  {grouped.map(([cat, list]) => (
                    <div key={cat}>
                      <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-ink-4 uppercase">{categoryMeta[cat as keyof typeof categoryMeta]?.label ?? cat}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {list.map((s) => {
                          const on = selected.includes(s._id);
                          return (
                            <button
                              key={s._id}
                              type="button"
                              onClick={() => {
                                setSelected((sel) => (on ? sel.filter((x) => x !== s._id) : [...sel, s._id]));
                                setSlot(null);
                              }}
                              aria-pressed={on}
                              className={cn(
                                "relative rounded-2xl border p-4 text-left transition-all",
                                on ? "bg-ink/[0.08]" : "border-ink/10 bg-ink/[0.03] hover:-translate-y-0.5 hover:border-ink/20",
                              )}
                              style={on ? { borderColor: brand, boxShadow: `0 0 0 1px ${brand}, 0 12px 30px -14px ${brand}` } : undefined}
                            >
                              <span className="flex items-start justify-between gap-3">
                                <span className="text-sm font-medium text-ink">{s.name}</span>
                                <span
                                  className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", on ? "border-transparent" : "border-ink/20")}
                                  style={on ? { background: brand } : undefined}
                                >
                                  {on && <Check className="size-3 text-white" />}
                                </span>
                              </span>
                              {s.description && <span className="mt-1 line-clamp-2 block text-xs text-ink-3">{s.description}</span>}
                              <span className="mt-3 flex items-center gap-3 text-xs">
                                <span className="font-semibold text-ink">from {formatMoney(s.basePrice).replace(".00", "")}</span>
                                <span className="inline-flex items-center gap-1 text-ink-4">
                                  <Clock className="size-3" /> {formatDuration(s.durationMinutes)}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="mb-5 text-lg font-semibold">Tell us about your vehicle</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Type">
                      <Select value={vehicle.type} onChange={(e) => setVehicle({ ...vehicle, type: e.target.value as VehicleType })}>
                        {[
                          ["car", "Car / coupe / sedan"],
                          ["suv", "SUV / crossover"],
                          ["truck", "Truck"],
                          ["van", "Van"],
                          ["motorcycle", "Motorcycle"],
                          ["boat", "Boat"],
                          ["rv", "RV"],
                        ].map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Year">
                      <Input inputMode="numeric" value={vehicle.year} onChange={(e) => setVehicle({ ...vehicle, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="2024" />
                    </Field>
                    <Field label="Make">
                      <Input value={vehicle.make} onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })} placeholder="Porsche" autoComplete="off" />
                    </Field>
                    <Field label="Model">
                      <Input value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} placeholder="911 Carrera" autoComplete="off" />
                    </Field>
                    <Field label="Color" className="sm:col-span-2">
                      <Input value={vehicle.color} onChange={(e) => setVehicle({ ...vehicle, color: e.target.value })} placeholder="GT Silver" />
                    </Field>
                  </div>
                  <p className="mt-4 text-xs text-ink-4">Final pricing may adjust for vehicle size and condition — we&apos;ll confirm before starting.</p>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="mb-4 text-lg font-semibold">Pick a date</h2>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                    {dates.map((d) => {
                      const closed = isClosed(d);
                      const on = date && isSameDay(d, date);
                      return (
                        <button
                          key={d.toISOString()}
                          type="button"
                          disabled={closed}
                          onClick={() => {
                            setDate(d);
                            setSlot(null);
                          }}
                          className={cn(
                            "flex w-16 shrink-0 flex-col items-center rounded-2xl border py-3 transition",
                            closed ? "cursor-not-allowed border-ink/5 opacity-30" : on ? "text-white" : "border-ink/10 bg-ink/[0.03] hover:border-ink/25",
                          )}
                          style={on ? { background: `linear-gradient(160deg, ${brand}, #22d3ee)`, borderColor: "transparent", boxShadow: `0 10px 30px -12px ${brand}` } : undefined}
                          aria-pressed={!!on}
                          aria-label={format(d, "EEEE, MMMM d")}
                        >
                          <span className="text-[10px] uppercase opacity-80">{format(d, "EEE")}</span>
                          <span className="text-lg font-semibold">{format(d, "d")}</span>
                          <span className="text-[10px] opacity-70">{format(d, "MMM")}</span>
                        </button>
                      );
                    })}
                  </div>
                  <h3 className="mt-6 mb-3 text-sm font-semibold">{date ? `Available times · ${format(date, "EEEE, MMM d")}` : "Choose a date to see times"}</h3>
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 py-6 text-sm text-ink-3">
                      <Loader2 className="size-4 animate-spin" /> Checking bay availability…
                    </div>
                  ) : date && slots ? (
                    slots.filter((s) => s.available).length === 0 ? (
                      <p className="rounded-2xl bg-ink/[0.04] px-4 py-6 text-center text-sm text-ink-3">Fully booked — try another day.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {slots.map((s) => {
                          const on = slot?.start === s.start;
                          return (
                            <button
                              key={s.start}
                              type="button"
                              disabled={!s.available}
                              onClick={() => setSlot(s)}
                              className={cn(
                                "rounded-xl border py-2.5 text-sm tabular-nums transition",
                                !s.available ? "cursor-not-allowed border-ink/5 text-ink-4 line-through opacity-40" : on ? "text-white" : "border-ink/10 bg-ink/[0.03] hover:border-ink/25",
                              )}
                              style={on ? { background: brand, borderColor: brand } : undefined}
                            >
                              {format(new Date(s.start), "h:mm a")}
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : null}
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="mb-5 text-lg font-semibold">Your details</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name">
                      <Input autoComplete="given-name" value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} />
                    </Field>
                    <Field label="Last name">
                      <Input autoComplete="family-name" value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} />
                    </Field>
                    <Field label="Mobile phone" hint="For appointment reminders and on-my-way texts.">
                      <Input type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                    </Field>
                    <Field label="Email">
                      <Input type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                    </Field>
                    <Field label="Anything we should know?" className="sm:col-span-2">
                      <Textarea value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} placeholder="Pet hair, swirl marks, gate code…" />
                    </Field>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h2 className="mb-5 text-lg font-semibold">Review & confirm</h2>
                  <dl className="space-y-4 text-sm">
                    <div className="flex items-start gap-3 rounded-2xl bg-ink/[0.04] p-4">
                      <CalendarCheck2 className="mt-0.5 size-5" style={{ color: brand }} />
                      <div>
                        <dt className="text-xs text-ink-4">When</dt>
                        <dd className="text-ink">{slot ? format(new Date(slot.start), "EEEE, MMMM d 'at' h:mm a") : "—"}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-ink/[0.04] p-4">
                      <Car className="mt-0.5 size-5" style={{ color: brand }} />
                      <div>
                        <dt className="text-xs text-ink-4">Vehicle</dt>
                        <dd className="text-ink">{[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}{vehicle.color ? ` · ${vehicle.color}` : ""}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-ink/[0.04] p-4">
                      <Sparkles className="mt-0.5 size-5" style={{ color: brand }} />
                      <div>
                        <dt className="text-xs text-ink-4">Contact</dt>
                        <dd className="text-ink">
                          {contact.firstName} {contact.lastName} · {contact.phone} · {contact.email}
                        </dd>
                      </div>
                    </div>
                  </dl>
                  {shop.booking.requireDeposit && (
                    <p className="mt-4 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
                      A {shop.booking.depositPercent}% deposit ({formatMoney((total * shop.booking.depositPercent) / 100)}) will be requested to secure your spot.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                Continue <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={submit} loading={submitting}>
                Confirm booking <Check className="size-4" />
              </Button>
            )}
          </div>
        </div>

        <aside className="glass h-fit rounded-[28px] p-5 lg:sticky lg:top-6">
          <p className="text-sm font-semibold">Your appointment</p>
          {chosen.length === 0 ? (
            <p className="mt-3 text-sm text-ink-4">Select services to see your estimate.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {chosen.map((s) => (
                <li key={s._id} className="flex justify-between gap-3 text-sm">
                  <span className="text-ink-2">{s.name}</span>
                  <span className="text-ink tabular-nums">{formatMoney(s.basePrice).replace(".00", "")}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="my-4 h-px bg-ink/10" />
          <div className="flex justify-between text-sm">
            <span className="text-ink-3">Estimated time</span>
            <span className="tabular-nums">{formatDuration(duration)}</span>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <span className="text-ink-3">Estimate</span>
            <span className="text-2xl font-semibold tabular-nums">{formatMoney(total).replace(".00", "")}</span>
          </div>
          {slot && <p className="mt-4 rounded-xl bg-ink/[0.05] px-3 py-2 text-xs text-ink-2">{format(new Date(slot.start), "EEE, MMM d · h:mm a")}</p>}
        </aside>
      </div>
    </div>
  );
}

function Success({ shopName, number, token, when, brand }: { shopName: string; number: number; token: string; when?: string; brand: string }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2;
        const dist = 120 + ((i * 37) % 90);
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, color: [brand, "#22d3ee", "#f472b6", "#a594ff"][i % 4]!, size: 6 + (i % 4) * 2 };
      }),
    [brand],
  );
  return (
    <div className="relative mx-auto mt-6 max-w-lg text-center">
      <div className="pointer-events-none absolute top-24 left-1/2" aria-hidden>
        {particles.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ width: p.size, height: p.size, background: p.color, boxShadow: `0 0 12px ${p.color}` }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
            animate={{ x: p.x, y: p.y, opacity: 0, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.15 + (i % 5) * 0.03, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotateX: 40 }}
        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        className="glass-2 rim rounded-[32px] p-10"
        style={{ perspective: 800 }}
      >
        <span
          className="mx-auto flex size-20 items-center justify-center rounded-full"
          style={{ background: `linear-gradient(135deg, ${brand}, #22d3ee)`, boxShadow: `0 20px 50px -12px ${brand}` }}
        >
          <Check className="size-9 text-white" strokeWidth={3} />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">You&apos;re booked!</h1>
        <p className="mt-2 text-sm text-ink-3">
          {shopName} has your request{when ? ` for ${format(new Date(when), "EEEE, MMMM d 'at' h:mm a")}` : ""}. Confirmation #{number} is on its way by text and email.
        </p>
        <Button href={`/portal/${token}`} className="mt-7">
          Track your appointment <ArrowRight className="size-4" />
        </Button>
        <p className="mt-4 text-xs text-ink-4">
          Bookmark your portal to follow progress live, approve add-ons and pay.{" "}
          <Link href={`/portal/${token}`} className="underline">
            Open portal
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

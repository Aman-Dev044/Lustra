"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addDays, format, parseISO } from "date-fns";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Clock, ExternalLink, Gauge, MapPin, Navigation, Route as RouteIcon, Send, Sparkles, Truck, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Job, RoutePlan, RouteStop } from "@/lib/types";
import { customerName, vehicleLabel } from "@/lib/domain";
import { cn, formatDuration, formatTime, toDateInput } from "@/lib/utils";
import { Avatar, Button, EmptyState, Field, Glass, Input, Modal, Skeleton, Switch } from "@/components/spatial";
import { PageHeader } from "@/components/app/ui";
import { chartColors } from "@/components/app/ops-charts";

const W = 800;
const H = 480;
const PAD = 48;

type Pt = { lat: number; lng: number };

/** Unset depots come back as 0,0 — treat that (and non-numbers) as "no location". */
const hasGeo = (p?: Partial<Pt> | null): p is Pt =>
  !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && !(p.lat === 0 && p.lng === 0);

function projector(points: Pt[]): (p: Pt) => { x: number; y: number } {
  if (!points.length) return () => ({ x: W / 2, y: H / 2 });
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  let minLat = Math.min(...lats),
    maxLat = Math.max(...lats),
    minLng = Math.min(...lngs),
    maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  // Pad degenerate ranges so a single stop still renders centered.
  if (maxLat - minLat < 0.01) {
    minLat -= 0.01;
    maxLat += 0.01;
  }
  if (maxLng - minLng < 0.01) {
    minLng -= 0.01;
    maxLng += 0.01;
  }
  const spanX = (maxLng - minLng) * kx;
  const spanY = maxLat - minLat;
  const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);
  const offX = (W - spanX * scale) / 2;
  const offY = (H - spanY * scale) / 2;
  return (p: Pt) => ({ x: offX + (p.lng - minLng) * kx * scale, y: offY + (maxLat - p.lat) * scale });
}

export default function RoutesPage() {
  const [date, setDate] = useState(() => toDateInput(new Date()));
  const { data, loading, mutate } = useApi<RoutePlan>("/routes", { date });
  const [assignUnassigned, setAssignUnassigned] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [version, setVersion] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);
  const [omw, setOmw] = useState<{ stop: RouteStop } | null>(null);

  async function optimize() {
    setOptimizing(true);
    try {
      const plan = await api.post<RoutePlan>("/routes/optimize", { date, assignUnassigned });
      mutate(plan);
      setVersion((v) => v + 1);
      invalidate("/jobs");
      const km = plan.technicians.reduce((s, t) => s + t.totalKm, 0);
      toast.success(`Routes optimized · ${km.toFixed(1)} km total across ${plan.technicians.length} technicians`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setOptimizing(false);
    }
  }

  const shift = (d: number) => setDate(toDateInput(addDays(parseISO(date), d)));
  const totals = data
    ? {
        stops: data.technicians.reduce((s, t) => s + t.stops.length, 0),
        km: data.technicians.reduce((s, t) => s + t.totalKm, 0),
        minutes: data.technicians.reduce((s, t) => s + t.totalMinutes, 0),
      }
    : null;

  return (
    <>
      <PageHeader
        title="Routes"
        description="Optimized mobile routes with live ETAs and one-tap on-my-way texts."
        actions={
          <>
            <div className="glass-inset flex h-10 items-center rounded-full">
              <button onClick={() => shift(-1)} className="rounded-full p-2.5 text-ink-3 hover:text-ink" aria-label="Previous day">
                <ChevronLeft className="size-4" />
              </button>
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="bg-transparent text-sm text-ink [color-scheme:dark] focus:outline-none"
                aria-label="Route date"
              />
              <button onClick={() => shift(1)} className="rounded-full p-2.5 text-ink-3 hover:text-ink" aria-label="Next day">
                <ChevronRight className="size-4" />
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs text-ink-2">
              <Switch checked={assignUnassigned} onChange={setAssignUnassigned} label="Assign unassigned jobs" /> Assign unassigned
            </label>
            <Button onClick={optimize} loading={optimizing}>
              <Sparkles className="size-4" /> Optimize routes
            </Button>
          </>
        }
      />

      {loading || !data ? (
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Skeleton className="h-[480px]" />
          <Skeleton className="h-[480px]" />
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Stops", value: totals!.stops, icon: MapPin },
              { label: "Technicians", value: data.technicians.length, icon: Truck },
              { label: "Drive distance", value: `${totals!.km.toFixed(1)} km`, icon: Gauge },
              { label: "Route time", value: formatDuration(totals!.minutes), icon: Clock },
            ].map((s) => (
              <Glass key={s.label} className="flex items-center gap-3 p-4">
                <s.icon className="size-5 text-aqua-soft" />
                <div>
                  <p className="text-[11px] text-ink-4">{s.label}</p>
                  <p className="text-lg font-semibold tabular-nums">{s.value}</p>
                </div>
              </Glass>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <RouteMap plan={data} version={version} focus={focus} onFocus={setFocus} />
            <div className="space-y-3">
              {data.technicians.length === 0 && data.unassigned.length === 0 && (
                <Glass>
                  <EmptyState
                    icon={<RouteIcon className="size-7" />}
                    title={`No mobile jobs on ${format(parseISO(date), "EEE, MMM d")}`}
                    description="Mark jobs as mobile with a service address and they'll appear here, ready to optimize."
                  />
                </Glass>
              )}
              {data.technicians.map((t, ti) => (
                <TechCard
                  key={t.user._id}
                  tech={t}
                  color={chartColors[ti % chartColors.length]!}
                  depot={data.depot}
                  focused={focus === t.user._id}
                  onFocus={() => setFocus(focus === t.user._id ? null : t.user._id)}
                  onOmw={(stop) => setOmw({ stop })}
                />
              ))}
              {data.unassigned.length > 0 && (
                <Glass className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Unassigned ({data.unassigned.length})</h2>
                    <span className="text-[11px] text-ink-4">Optimize with “Assign unassigned” to balance</span>
                  </div>
                  <ul className="space-y-2">
                    {data.unassigned.map((j: Job) => (
                      <li key={j._id}>
                        <Link
                          href={`/app/jobs/${j._id}`}
                          className="flex items-start gap-3 rounded-xl bg-ink/[0.03] px-3 py-2.5 text-sm transition hover:bg-ink/[0.07]"
                        >
                          <MapPin className="mt-0.5 size-4 shrink-0 text-ink-4" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-ink">
                              #{j.number} · {j.title}
                            </span>
                            <span className="block truncate text-xs text-ink-4">
                              {customerName(j.customer)} · {j.serviceAddress || "No address"}
                            </span>
                          </span>
                          {j.scheduledStart && <span className="text-xs text-ink-3 tabular-nums">{formatTime(j.scheduledStart)}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Glass>
              )}
            </div>
          </div>
        </>
      )}

      <OnMyWayModal
        stop={omw?.stop ?? null}
        onClose={() => setOmw(null)}
        onSent={() => {
          setOmw(null);
          invalidate("/routes", "/jobs", "/messages");
        }}
      />
    </>
  );
}

function RouteMap({ plan, version, focus, onFocus }: { plan: RoutePlan; version: number; focus: string | null; onFocus: (id: string | null) => void }) {
  const points: Pt[] = useMemo(
    () => [
      ...(hasGeo(plan.depot) ? [{ lat: plan.depot.lat, lng: plan.depot.lng }] : []),
      ...plan.technicians.flatMap((t) => t.stops.map((s) => ({ lat: s.lat, lng: s.lng }))),
      ...plan.unassigned.filter((j) => hasGeo(j.geo)).map((j) => j.geo as Pt),
    ],
    [plan],
  );
  const project = useMemo(() => projector(points), [points]);
  const depot = hasGeo(plan.depot) ? project(plan.depot) : null;

  return (
    <Glass tier={2} className="relative overflow-hidden p-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ aspectRatio: `${W}/${H}` }} role="img" aria-label="Route map">
        <defs>
          <radialGradient id="terrain" cx="50%" cy="45%" r="70%">
            <stop offset="0" stopColor="#f3f6fa" />
            <stop offset="0.6" stopColor="#e6ebf2" />
            <stop offset="1" stopColor="#d8dfe9" />
          </radialGradient>
          <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="rgb(30 42 68 / 0.045)" />
          </pattern>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width={W} height={H} fill="url(#terrain)" />
        <rect width={W} height={H} fill="url(#map-grid)" />
        {/* soft contour rings for a topographic feel */}
        {[120, 200, 290, 390].map((r) => (
          <ellipse key={r} cx={W * 0.52} cy={H * 0.48} rx={r * 1.3} ry={r * 0.8} fill="none" stroke="rgb(124 92 255 / 0.06)" />
        ))}

        {plan.technicians.map((t, ti) => {
          const color = chartColors[ti % chartColors.length]!;
          const pts = [...(depot ? [depot] : []), ...t.stops.map((s) => project(s))];
          if (pts.length < 2) return null;
          const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
          const dim = focus && focus !== t.user._id;
          return (
            <g key={`${t.user._id}-${version}`} opacity={dim ? 0.18 : 1} className="transition-opacity">
              <motion.path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.35}
                filter="url(#glow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, delay: ti * 0.15, ease: "easeInOut" }}
              />
              <path d={d} fill="none" stroke={color} strokeWidth={2} strokeDasharray="6 10" strokeLinecap="round" className="route-flow" />
            </g>
          );
        })}

        {plan.unassigned
          .filter((j) => hasGeo(j.geo))
          .map((j) => {
            const p = project(j.geo as Pt);
            return (
              <g key={j._id} transform={`translate(${p.x} ${p.y})`}>
                <circle r="7" fill="#0b0e1c" stroke="rgb(30 42 68 / 0.5)" strokeDasharray="3 3" strokeWidth="1.5" />
                <title>{`Unassigned · #${j.number} ${j.title}`}</title>
              </g>
            );
          })}

        {plan.technicians.map((t, ti) => {
          const color = chartColors[ti % chartColors.length]!;
          const dim = focus && focus !== t.user._id;
          return t.stops.map((s, si) => {
            const p = project(s);
            return (
              <motion.g
                key={`${s.job._id}-${version}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: dim ? 0.25 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.3 + ti * 0.15 + si * 0.08 }}
                style={{ transformOrigin: `${p.x}px ${p.y}px`, cursor: "pointer" }}
                onClick={() => onFocus(t.user._id)}
              >
                <circle cx={p.x} cy={p.y} r="15" fill={color} opacity="0.2" />
                <circle cx={p.x} cy={p.y} r="11" fill={color} stroke="#0b0e1c" strokeWidth="2" />
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0b0e1c">
                  {s.order ?? si + 1}
                </text>
                <title>{`${t.user.name} · stop ${s.order ?? si + 1} · ${s.job.title} · ETA ${formatTime(s.eta)}`}</title>
              </motion.g>
            );
          });
        })}

        {depot && (
          <g transform={`translate(${depot.x} ${depot.y})`}>
            <circle r="22" fill="#fff" opacity="0.08" className="animate-pulse" />
            <rect x="-13" y="-13" width="26" height="26" rx="8" fill="#ffffff" />
            <path d="M-6 3V-2L0 -6L6 -2V3Z" fill="#0b0e1c" />
            <title>{plan.depot.address || "Depot"}</title>
          </g>
        )}
      </svg>
      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2">
        <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-ink-2">
          <Warehouse className="size-3.5" /> {plan.depot?.address || "Depot"}
        </span>
        {plan.technicians.map((t, ti) => (
          <span key={t.user._id} className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-ink-2">
            <span className="size-2 rounded-full" style={{ background: chartColors[ti % chartColors.length] }} /> {t.user.name.split(" ")[0]}
          </span>
        ))}
      </div>
      <style>{`.route-flow{animation:route-dash 1.6s linear infinite}@keyframes route-dash{to{stroke-dashoffset:-32}}@media (prefers-reduced-motion:reduce){.route-flow{animation:none}}`}</style>
    </Glass>
  );
}

function TechCard({
  tech,
  color,
  depot,
  focused,
  onFocus,
  onOmw,
}: {
  tech: RoutePlan["technicians"][number];
  color: string;
  depot: RoutePlan["depot"];
  focused: boolean;
  onFocus: () => void;
  onOmw: (s: RouteStop) => void;
}) {
  const mapsUrl = useMemo(() => {
    const pts = [...(hasGeo(depot) ? [`${depot.lat},${depot.lng}`] : []), ...tech.stops.map((s) => `${s.lat},${s.lng}`)];
    return `https://www.google.com/maps/dir/${pts.join("/")}`;
  }, [depot, tech.stops]);

  return (
    <Glass
      className={cn("p-5 transition", focused && "border-ink/25")}
      style={focused ? { boxShadow: `0 0 0 1px ${color}66, 0 20px 50px -24px ${color}` } : undefined}
    >
      <div className="flex items-center gap-3">
        <button onClick={onFocus} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-pressed={focused}>
          <span className="rounded-full p-0.5" style={{ background: color }}>
            <Avatar name={tech.user.name} size={34} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">{tech.user.name}</span>
            <span className="text-xs text-ink-4">
              {tech.stops.length} stops · {tech.totalKm.toFixed(1)} km · {formatDuration(tech.totalMinutes)}
            </span>
          </span>
        </button>
        {tech.stops.length > 0 && (
          <Button size="xs" variant="secondary" href={mapsUrl}>
            <ExternalLink className="size-3.5" /> Maps
          </Button>
        )}
      </div>
      <ol className="relative mt-4 space-y-2 pl-4">
        <span className="absolute top-2 bottom-2 left-[7px] w-px" style={{ background: `linear-gradient(${color}, transparent)` }} aria-hidden />
        {tech.stops.map((s, i) => (
          <li key={s.job._id} className="relative">
            <span
              className="absolute top-3 -left-4 flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-ink"
              style={{ background: color }}
            >
              {s.order ?? i + 1}
            </span>
            <div className="ml-2 rounded-xl bg-ink/[0.03] px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/app/jobs/${s.job._id}`} className="min-w-0 hover:text-aqua-soft">
                  <p className="truncate text-sm text-ink">{customerName(s.job.customer)}</p>
                  <p className="truncate text-xs text-ink-4">
                    {s.job.title}
                    {s.job.vehicle ? ` · ${vehicleLabel(s.job.vehicle)}` : ""}
                  </p>
                </Link>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums" style={{ color }}>
                    {formatTime(s.eta)}
                  </span>
                  <span className="text-[10px] text-ink-4 tabular-nums">
                    +{s.legKm.toFixed(1)} km · {Math.round(s.legMinutes)} min
                  </span>
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-[11px] text-ink-4">{s.job.serviceAddress}</span>
                <Button size="xs" variant="ghost" onClick={() => onOmw(s)}>
                  <Navigation className="size-3" /> On my way
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Glass>
  );
}

function OnMyWayModal({ stop, onClose, onSent }: { stop: RouteStop | null; onClose: () => void; onSent: () => void }) {
  const [eta, setEta] = useState("20");
  const [last, setLast] = useState<RouteStop | null>(null);
  const [sending, setSending] = useState(false);
  if (stop !== last) {
    setLast(stop);
    if (stop) setEta(String(Math.max(5, Math.round(stop.legMinutes || 20))));
  }

  async function send() {
    if (!stop) return;
    setSending(true);
    try {
      await api.post(`/jobs/${stop.job._id}/on-my-way`, { etaMinutes: Number(eta) || 20 });
      toast.success(`On-my-way text sent to ${customerName(stop.job.customer)}`);
      onSent();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={!!stop}
      onClose={onClose}
      title="Send on-my-way text"
      description={stop ? `${customerName(stop.job.customer)} · ${stop.job.serviceAddress ?? ""}` : undefined}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={send} loading={sending}>
            <Send className="size-4" /> Send text
          </Button>
        </>
      }
    >
      <Field label="Arriving in (minutes)">
        <div className="flex gap-2">
          {[10, 15, 20, 30, 45].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setEta(String(m))}
              className={cn(
                "flex-1 rounded-xl border py-2 text-sm transition",
                eta === String(m) ? "border-aqua/50 bg-aqua/15 text-aqua-soft" : "border-ink/10 text-ink-3",
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <Input type="number" min={1} value={eta} onChange={(e) => setEta(e.target.value)} className="mt-2" aria-label="Custom minutes" />
      </Field>
      <p className="mt-3 rounded-2xl bg-ink/[0.04] px-4 py-3 text-xs text-ink-3">
        “Hi {stop?.job.customer?.firstName ?? "there"}, your technician is on the way and should arrive in about {eta || "—"} minutes.”
      </p>
    </Modal>
  );
}

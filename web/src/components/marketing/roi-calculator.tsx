"use client";

import { useId, useState } from "react";
import { Glass } from "@/components/spatial";
import { formatMoney } from "@/lib/utils";

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm text-ink-2">
          {label}
        </label>
        <output htmlFor={id} className="text-sm font-semibold text-ink tabular-nums">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full accent-[#22d3ee]"
        style={{ background: `linear-gradient(90deg, #7c5cff ${0}%, #22d3ee ${pct}%, rgb(30 42 68 / 0.1) ${pct}%)` }}
      />
    </div>
  );
}

/** Conservative ROI model: uplift on jobs, fewer no-shows and admin hours saved, minus the plan price. */
export function RoiCalculator() {
  const [jobs, setJobs] = useState(60);
  const [ticket, setTicket] = useState(420);
  const [uplift, setUplift] = useState(15);
  const [hourly, setHourly] = useState(35);

  const extraRevenue = jobs * ticket * (uplift / 100);
  const noShowSaved = jobs * 0.06 * 0.35 * ticket; // 6% no-show rate, 35% reduction from reminders
  const adminSaved = 9 * 4.33 * hourly; // ~9 admin hours/week
  const planCost = 110;
  const monthly = extraRevenue + noShowSaved + adminSaved - planCost;
  const roi = Math.round((monthly / planCost) * 100) / 100;

  return (
    <Glass tier={2} rim className="grid gap-8 rounded-[30px] p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-7">
        <Slider label="Jobs per month" value={jobs} onChange={setJobs} min={10} max={400} step={5} format={(v) => `${v}`} />
        <Slider label="Average ticket" value={ticket} onChange={setTicket} min={50} max={3000} step={10} format={(v) => formatMoney(v, "USD", true)} />
        <Slider label="Expected booking uplift" value={uplift} onChange={setUplift} min={0} max={40} step={1} format={(v) => `${v}%`} />
        <Slider label="Your hourly value" value={hourly} onChange={setHourly} min={15} max={150} step={5} format={(v) => `$${v}/h`} />
        <p className="text-xs leading-relaxed text-ink-4">
          Assumes a 6% no-show rate reduced 35% by automated reminders, ~9 admin hours saved per week, and the Pro plan at
          $110/month. Lustra shops report a 38% median booking uplift in year one; we default to a conservative 15%.
        </p>
      </div>
      <div className="flex flex-col justify-between gap-6 rounded-[24px] bg-surface-lo p-6" aria-live="polite">
        <div>
          <p className="text-xs tracking-[0.14em] text-ink-3 uppercase">Estimated monthly gain</p>
          <p className="text-spectral mt-2 text-5xl font-semibold tracking-[-0.04em] tabular-nums sm:text-6xl">
            {formatMoney(Math.max(0, monthly), "USD", true)}
          </p>
          <p className="mt-2 text-sm text-ink-3">≈ {formatMoney(Math.max(0, monthly * 12), "USD", true)} per year</p>
        </div>
        <dl className="space-y-2.5 text-sm">
          {[
            ["Extra booked revenue", extraRevenue],
            ["Recovered no-shows", noShowSaved],
            ["Admin time saved", adminSaved],
            ["Lustra Pro", -planCost],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between border-b border-ink/[0.06] pb-2.5">
              <dt className="text-ink-3">{k}</dt>
              <dd className={(v as number) < 0 ? "text-ink-3 tabular-nums" : "text-ink tabular-nums"}>{formatMoney(v as number)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-ink-2">
          That’s a <span className="font-semibold text-aqua-soft">{roi.toLocaleString("en-US")}×</span> return on your subscription.
        </p>
      </div>
    </Glass>
  );
}

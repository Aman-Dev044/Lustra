"use client";

import { Repeat } from "lucide-react";
import type { Recurrence } from "@/lib/types";
import { toDateInput } from "@/lib/utils";
import { Field, Input, Select, Switch } from "@/components/spatial";

type Frequency = Recurrence["frequency"];

export const FREQUENCY_DAYS: Record<Exclude<Frequency, "custom">, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 91,
};

export function recurrenceLabel(r?: Recurrence | null) {
  if (!r) return "";
  switch (r.frequency) {
    case "weekly":
      return "Repeats every week";
    case "biweekly":
      return "Repeats every 2 weeks";
    case "monthly":
      return "Repeats every month";
    case "quarterly":
      return "Repeats every 3 months";
    default: {
      const d = r.intervalDays || 0;
      if (d && d % 7 === 0) return `Repeats every ${d / 7 === 1 ? "week" : `${d / 7} weeks`}`;
      return `Repeats every ${d} day${d === 1 ? "" : "s"}`;
    }
  }
}

/** Glass pill used wherever a job repeats. */
export function RecurrencePill({ recurrence }: { recurrence?: Recurrence | null }) {
  if (!recurrence) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-aqua/30 bg-aqua/10 px-2.5 py-0.5 text-[11px] font-medium text-aqua-soft">
      <Repeat className="size-3" aria-hidden />
      {recurrenceLabel(recurrence)}
      {recurrence.endsAt && <span className="text-ink-4">· until {new Date(recurrence.endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
    </span>
  );
}

/** Toggle + frequency/interval/end editor for repeat jobs (maintenance washes, lawn routes…). */
export function RecurrenceEditor({ value, onChange }: { value: Recurrence | null; onChange: (r: Recurrence | null) => void }) {
  const on = !!value;
  const set = (patch: Partial<Recurrence>) => onChange({ ...(value ?? { frequency: "monthly", intervalDays: 30 }), ...patch });
  return (
    <div className="rounded-2xl border border-ink/[0.07] bg-ink/[0.03] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Repeat className="size-4 text-aqua-soft" aria-hidden />
          <div>
            <p className="text-sm text-ink">Repeat job</p>
            <p className="text-[11px] text-ink-4">{on ? recurrenceLabel(value) : "Next visit is created automatically when this one completes"}</p>
          </div>
        </div>
        <Switch checked={on} onChange={(v) => onChange(v ? { frequency: "monthly", intervalDays: 30 } : null)} label="Repeat job" />
      </div>
      {on && value && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Frequency">
            <Select
              value={value.frequency}
              onChange={(e) => {
                const frequency = e.target.value as Frequency;
                set({ frequency, intervalDays: frequency === "custom" ? value.intervalDays || 28 : FREQUENCY_DAYS[frequency] });
              }}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="custom">Custom</option>
            </Select>
          </Field>
          {value.frequency === "custom" ? (
            <Field label="Every (days)">
              <Input
                type="number"
                min={1}
                max={365}
                value={value.intervalDays}
                onChange={(e) => set({ intervalDays: Math.max(1, Math.min(365, Number(e.target.value) || 1)) })}
              />
            </Field>
          ) : (
            <div className="hidden sm:block" />
          )}
          <Field label="Ends on" hint="Optional">
            <Input
              type="date"
              value={toDateInput(value.endsAt)}
              onChange={(e) => set({ endsAt: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : null })}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { LineItem, Totals, VehicleSize } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";
import { Button, Modal, Switch } from "@/components/spatial";
import { ServiceQuickAdd } from "./pickers";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Client-side mirror of the server's totals math (server stays the source of truth). */
export function computeTotals(items: LineItem[], discount = 0, taxRate = 0): Totals {
  const counted = items.filter((i) => i.selected !== false);
  const subtotal = round2(counted.reduce((s, i) => s + i.qty * i.unitPrice - (i.discount ?? 0), 0));
  const disc = round2(Math.min(discount, subtotal));
  const tax = round2(((subtotal - disc) * taxRate) / 100);
  return { subtotal, discount: disc, tax, total: round2(subtotal - disc + tax) };
}

export function LineItemsEditor({
  items,
  onChange,
  size = "medium",
  allowOptional = false,
  readOnly = false,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  size?: VehicleSize;
  allowOptional?: boolean;
  readOnly?: boolean;
}) {
  const [picker, setPicker] = useState(false);
  const update = (i: number, patch: Partial<LineItem>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="glass-inset overflow-hidden rounded-2xl">
        <div className="hidden grid-cols-[1fr_70px_110px_110px_36px] gap-3 border-b border-ink/[0.06] px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-ink-4 uppercase sm:grid">
          <span>Item</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Price</span>
          <span className="text-right">Amount</span>
          <span />
        </div>
        {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-4">No line items yet — add a service to get started.</p>}
        {items.map((it, i) => (
          <div
            key={it._id ?? i}
            className={cn(
              "grid grid-cols-[1fr_auto] gap-3 border-b border-ink/[0.04] px-4 py-3 last:border-0 sm:grid-cols-[1fr_70px_110px_110px_36px] sm:items-center",
              it.selected === false && "opacity-50",
            )}
          >
            <div className="flex min-w-0 items-start gap-2">
              {!readOnly && <GripVertical className="mt-2.5 hidden size-4 shrink-0 text-ink-4 sm:block" aria-hidden />}
              <div className="min-w-0 flex-1">
                <input
                  value={it.name}
                  readOnly={readOnly}
                  onChange={(e) => update(i, { name: e.target.value })}
                  className="w-full rounded-lg bg-transparent px-1 py-1 text-sm font-medium text-ink focus:bg-ink/[0.05] focus:outline-none"
                  aria-label="Item name"
                />
                <input
                  value={it.description ?? ""}
                  readOnly={readOnly}
                  placeholder={readOnly ? "" : "Add a description"}
                  onChange={(e) => update(i, { description: e.target.value })}
                  className="w-full rounded-lg bg-transparent px-1 py-0.5 text-xs text-ink-3 placeholder:text-ink-4 focus:bg-ink/[0.05] focus:outline-none"
                  aria-label="Item description"
                />
                {allowOptional && (
                  <label className="mt-1.5 flex items-center gap-2 px-1 text-[11px] text-ink-3">
                    <Switch
                      checked={!!it.optional}
                      disabled={readOnly}
                      onChange={(v) => update(i, { optional: v, selected: v ? (it.selected ?? true) : true })}
                      label="Optional upsell"
                    />
                    Optional add-on (customer can toggle)
                  </label>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:contents">
              <input
                type="number"
                min={0}
                step="1"
                value={it.qty}
                readOnly={readOnly}
                onChange={(e) => update(i, { qty: Math.max(0, Number(e.target.value)) })}
                className="w-14 rounded-lg bg-ink/[0.04] px-2 py-1.5 text-right text-sm tabular-nums focus:bg-ink/[0.08] focus:outline-none sm:w-full"
                aria-label="Quantity"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={it.unitPrice}
                readOnly={readOnly}
                onChange={(e) => update(i, { unitPrice: Math.max(0, Number(e.target.value)) })}
                className="w-24 rounded-lg bg-ink/[0.04] px-2 py-1.5 text-right text-sm tabular-nums focus:bg-ink/[0.08] focus:outline-none sm:w-full"
                aria-label="Unit price"
              />
              <span className="hidden text-right text-sm font-medium text-ink tabular-nums sm:block">
                {formatMoney(it.qty * it.unitPrice - (it.discount ?? 0))}
              </span>
              {!readOnly ? (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded-full p-2 text-ink-4 transition hover:bg-danger/10 hover:text-danger"
                  aria-label={`Remove ${it.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              ) : (
                <span />
              )}
            </div>
          </div>
        ))}
      </div>
      {!readOnly && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setPicker(true)}>
            <Plus className="size-4" /> Add service
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange([...items, { name: "Custom item", qty: 1, unitPrice: 0, discount: 0, selected: true }])}
          >
            <Plus className="size-4" /> Custom line
          </Button>
        </div>
      )}
      <Modal open={picker} onClose={() => setPicker(false)} title="Add from service catalog" description={`Prices adjusted for a ${size} vehicle`} size="lg">
        <ServiceQuickAdd
          size={size}
          onPick={(s, price) => {
            onChange([
              ...items,
              {
                service: s._id,
                name: s.name,
                description: s.description,
                category: s.category,
                qty: 1,
                unitPrice: price,
                discount: 0,
                durationMinutes: s.durationMinutes,
                selected: true,
              },
            ]);
            setPicker(false);
          }}
        />
      </Modal>
    </div>
  );
}

export function TotalsPanel({ totals, extra }: { totals: Totals & { paid?: number; balance?: number; tips?: number }; extra?: React.ReactNode }) {
  const row = (label: string, value: number, strong = false) => (
    <div className={cn("flex items-center justify-between py-1.5 text-sm", strong ? "text-ink" : "text-ink-3")}>
      <span>{label}</span>
      <span className={cn("tabular-nums", strong && "text-lg font-semibold")}>{formatMoney(value)}</span>
    </div>
  );
  return (
    <div className="space-y-0.5">
      {row("Subtotal", totals.subtotal)}
      {totals.discount > 0 && row("Discount", -totals.discount)}
      {row("Tax", totals.tax)}
      <div className="my-2 h-px bg-ink/[0.08]" />
      {row("Total", totals.total, true)}
      {totals.tips ? row("Tips", totals.tips) : null}
      {totals.paid !== undefined && row("Paid", totals.paid)}
      {totals.balance !== undefined && (
        <div className="flex items-center justify-between py-1.5 text-sm">
          <span className="text-ink-2">Balance due</span>
          <span className={cn("font-semibold tabular-nums", totals.balance > 0 ? "text-warning" : "text-success")}>{formatMoney(totals.balance)}</span>
        </div>
      )}
      {extra}
    </div>
  );
}

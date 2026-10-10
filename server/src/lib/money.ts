export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export interface PricedItem {
  qty?: number | null;
  unitPrice?: number | null;
  discount?: number | null;
  optional?: boolean | null;
  selected?: boolean | null;
}

export interface Totals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

/** Totals for line items. Optional items only count when selected. Discounts are dollar amounts. */
export function computeTotals(items: PricedItem[], discount = 0, taxRate = 0): Totals {
  let subtotal = 0;
  let lineDiscounts = 0;
  for (const item of items) {
    if (item.optional && !item.selected) continue;
    subtotal += (item.qty ?? 1) * (item.unitPrice ?? 0);
    lineDiscounts += item.discount ?? 0;
  }
  const totalDiscount = Math.min(round2(lineDiscounts + (discount || 0)), round2(subtotal));
  const taxable = Math.max(0, subtotal - totalDiscount);
  const tax = round2((taxable * (taxRate || 0)) / 100);
  return { subtotal: round2(subtotal), discount: totalDiscount, tax, total: round2(taxable + tax) };
}

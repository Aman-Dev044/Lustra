"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Minus, PackageCheck, Plus, Search, ShoppingCart, Sparkles, Star, Truck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi, useDebounced } from "@/lib/hooks/use-api";
import type { MarketplaceProduct, Paginated, SupplyOrder } from "@/lib/types";
import { cn, formatDate, formatMoney, titleCase } from "@/lib/utils";
import { Badge, Button, Drawer, EmptyState, Glass, Segmented, Skeleton } from "@/components/spatial";
import { PageHeader, PlanGate, Table, Td, Th } from "@/components/app/ui";
import { useAuth } from "@/components/app/auth-provider";

type Catalog = { items: MarketplaceProduct[]; credits: number; memberPricing: boolean };
const cats: ("all" | MarketplaceProduct["category"])[] = ["all", "ceramic", "ppf", "tint", "wrap", "chemicals", "tools", "towels"];
const catGradient: Record<MarketplaceProduct["category"], string> = {
  ceramic: "from-iris/50 to-aqua/30",
  ppf: "from-iris/60 to-iris/20",
  tint: "from-info/50 to-iris/20",
  wrap: "from-plasma/50 to-iris/20",
  chemicals: "from-aqua/50 to-success/20",
  tools: "from-ember/50 to-warning/20",
  towels: "from-success/40 to-aqua/20",
};
const orderTone = { placed: "info", shipped: "warning", delivered: "success" } as const;

export default function MarketplacePage() {
  return (
    <PlanGate feature="marketplace">
      <Marketplace />
    </PlanGate>
  );
}

function Marketplace() {
  const { shop, setShop } = useAuth();
  const [tab, setTab] = useState<"catalog" | "orders">("catalog");
  const [category, setCategory] = useState<(typeof cats)[number]>("all");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const { data, loading } = useApi<Catalog>("/marketplace/products", { category: category === "all" ? undefined : category, q: dq });
  const [cart, setCart] = useState<Record<string, { product: MarketplaceProduct; qty: number }>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const memberPricing = data?.memberPricing ?? true;
  const priceOf = (p: MarketplaceProduct) => (memberPricing ? p.memberPrice : p.price);
  const lines = Object.values(cart);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + priceOf(l.product) * l.qty, 0);
  const savings = lines.reduce((s, l) => s + (l.product.price - priceOf(l.product)) * l.qty, 0);
  const credits = data?.credits ?? shop.credits ?? 0;

  const setQty = (p: MarketplaceProduct, qty: number) =>
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[p._id];
      else next[p._id] = { product: p, qty };
      return next;
    });

  async function placeOrder() {
    setPlacing(true);
    try {
      const order = await api.post<SupplyOrder>("/marketplace/orders", { items: lines.map((l) => ({ product: l.product._id, qty: l.qty })) });
      setCart({});
      setCartOpen(false);
      setTab("orders");
      invalidate("/marketplace");
      setShop({ ...shop, credits: (shop.credits ?? credits) + (order.credit ?? 0) });
      toast.success(`Order #${order.number} placed · ${formatMoney(order.credit)} cashback credited`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPlacing(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Marketplace"
        description="Pro-grade coatings, film and supplies at member pricing — orders sync straight into inventory and earn 2% back."
        actions={
          <>
            <span className="glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm">
              <Wallet className="size-4 text-success" /> {formatMoney(credits)} credit
            </span>
            <Button variant="secondary" onClick={() => setCartOpen(true)} aria-label={`Cart, ${count} items`}>
              <ShoppingCart className="size-4" /> Cart
              {count > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-aqua text-[10px] font-bold text-white">{count}</span>}
            </Button>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "catalog", label: "Catalog" },
            { value: "orders", label: "Orders" },
          ]}
        />
        {tab === "catalog" && (
          <div className="glass-inset flex h-10 w-full items-center gap-2 rounded-full px-4 sm:w-72">
            <Search className="size-4 text-ink-4" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, brands, SKU…" aria-label="Search products" className="h-full flex-1 bg-transparent text-sm focus:outline-none" />
          </div>
        )}
      </div>

      {tab === "orders" ? (
        <Orders />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cn("rounded-full border px-3.5 py-1.5 text-xs transition", category === c ? "border-aqua/50 bg-aqua/15 text-aqua-soft" : "border-ink/10 text-ink-3 hover:text-ink")}
              >
                {c === "all" ? "All products" : c === "ppf" ? "PPF" : titleCase(c)}
              </button>
            ))}
          </div>
          {!memberPricing && (
            <p className="mb-4 rounded-2xl border border-iris/30 bg-iris/10 px-4 py-3 text-xs text-ink-2">Member pricing unlocks on Pro and Enterprise — you&apos;re seeing list prices.</p>
          )}
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-72" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <Glass>
              <EmptyState icon={<ShoppingCart className="size-7" />} title="No products found" description="Try another category or search term." />
            </Glass>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.items.map((p) => {
                const inCart = cart[p._id]?.qty ?? 0;
                return (
                  <Glass key={p._id} className="flex flex-col overflow-hidden">
                    <div className={cn("relative flex h-28 items-end bg-gradient-to-br p-4", catGradient[p.category])}>
                      <span className="pointer-events-none absolute -top-8 -right-8 size-28 rounded-full bg-ink/15 blur-2xl" />
                      <span className="relative text-[10px] font-semibold tracking-[0.2em] text-white/80 uppercase">{p.vendor}</span>
                      {p.badge && (
                        <Badge tone="warning" className="absolute top-3 right-3 border-ink/20 bg-surface-lo">
                          <Sparkles className="size-3" /> {p.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="text-sm font-semibold text-ink">{p.name}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-ink-4">
                        {p.sku} · per {p.unit}
                      </p>
                      {p.description && <p className="mt-2 line-clamp-2 text-xs text-ink-3">{p.description}</p>}
                      <p className="mt-2 flex items-center gap-1 text-xs text-warning">
                        <Star className="size-3.5 fill-current" /> {p.rating.toFixed(1)}
                      </p>
                      <div className="mt-auto flex items-end justify-between pt-4">
                        <div>
                          <p className="text-lg font-semibold tabular-nums">{formatMoney(priceOf(p))}</p>
                          {memberPricing && p.price > p.memberPrice && <p className="text-[11px] text-ink-4 line-through tabular-nums">{formatMoney(p.price)}</p>}
                        </div>
                        {inCart ? (
                          <Stepper qty={inCart} onChange={(n) => setQty(p, n)} label={p.name} />
                        ) : (
                          <Button size="sm" onClick={() => setQty(p, 1)}>
                            <Plus className="size-3.5" /> Add
                          </Button>
                        )}
                      </div>
                    </div>
                  </Glass>
                );
              })}
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {count > 0 && !cartOpen && tab === "catalog" && (
          <motion.button
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            onClick={() => setCartOpen(true)}
            className="bg-spectral fixed right-6 bottom-24 z-30 flex items-center gap-3 rounded-full px-5 py-3 text-sm font-medium text-white shadow-[0_20px_50px_-12px_rgb(124_92_255/0.9)] lg:bottom-8"
          >
            <ShoppingCart className="size-4" /> {count} item{count > 1 ? "s" : ""} · {formatMoney(subtotal)}
          </motion.button>
        )}
      </AnimatePresence>

      <Drawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title="Your cart"
        width={460}
        footer={
          <Button className="w-full" onClick={placeOrder} loading={placing} disabled={!lines.length}>
            Place order · {formatMoney(subtotal)}
          </Button>
        }
      >
        {lines.length === 0 ? (
          <EmptyState icon={<ShoppingCart className="size-7" />} title="Your cart is empty" description="Add coatings, film and supplies from the catalog." />
        ) : (
          <div className="space-y-4">
            <ul className="space-y-2">
              {lines.map((l) => (
                <li key={l.product._id} className="flex items-center gap-3 rounded-2xl bg-ink/[0.04] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{l.product.name}</p>
                    <p className="text-xs text-ink-4">
                      {formatMoney(priceOf(l.product))} / {l.product.unit}
                    </p>
                  </div>
                  <Stepper qty={l.qty} onChange={(n) => setQty(l.product, n)} label={l.product.name} />
                  <span className="w-20 text-right text-sm font-medium tabular-nums">{formatMoney(priceOf(l.product) * l.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1.5 rounded-2xl bg-ink/[0.03] p-4 text-sm">
              <div className="flex justify-between text-ink-3">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatMoney(subtotal)}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-success">
                  <span>Member savings</span>
                  <span className="tabular-nums">−{formatMoney(savings)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-3">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="my-2 h-px bg-ink/10" />
              <div className="flex justify-between text-base font-semibold text-ink">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(subtotal)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4">
              <Wallet className="size-5 text-success" />
              <p className="text-xs text-ink-2">
                You&apos;ll earn <span className="font-semibold text-success">{formatMoney(subtotal * 0.02)}</span> back in shop credit (balance {formatMoney(credits)}). Credits apply to your Lustra subscription.
              </p>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

function Stepper({ qty, onChange, label }: { qty: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="glass-inset inline-flex items-center rounded-full">
      <button onClick={() => onChange(qty - 1)} className="rounded-full p-1.5 text-ink-3 hover:text-ink" aria-label={`Decrease ${label}`}>
        <Minus className="size-3.5" />
      </button>
      <span className="w-6 text-center text-sm tabular-nums">{qty}</span>
      <button onClick={() => onChange(qty + 1)} className="rounded-full p-1.5 text-ink-3 hover:text-ink" aria-label={`Increase ${label}`}>
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function Orders() {
  const { data, loading } = useApi<Paginated<SupplyOrder>>("/marketplace/orders", { pageSize: 100 });
  const [receiving, setReceiving] = useState<string | null>(null);

  async function receive(o: SupplyOrder) {
    setReceiving(o._id);
    try {
      await api.post(`/marketplace/orders/${o._id}/receive`);
      invalidate("/marketplace", "/inventory");
      toast.success(`Order #${o.number} received — ${o.items.reduce((s, i) => s + i.qty, 0)} items added to inventory`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setReceiving(null);
    }
  }

  return (
    <Glass className="overflow-hidden">
      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : !data?.items.length ? (
        <EmptyState icon={<Truck className="size-7" />} title="No orders yet" description="Your supply orders and deliveries will show here." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Items</Th>
              <Th className="text-right">Total</Th>
              <Th className="text-right">Cashback</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {data.items.map((o) => (
              <tr key={o._id} className="hover:bg-ink/[0.03]">
                <Td>
                  <p className="font-medium text-ink">#{o.number}</p>
                  <p className="text-[11px] text-ink-4">{formatDate(o.createdAt)}</p>
                </Td>
                <Td>
                  <p className="max-w-sm truncate">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
                </Td>
                <Td className="text-right tabular-nums">{formatMoney(o.total)}</Td>
                <Td className="text-right text-success tabular-nums">+{formatMoney(o.credit)}</Td>
                <Td>
                  <Badge tone={orderTone[o.status]} dot>
                    {o.status}
                  </Badge>
                  {o.deliveredAt && <span className="ml-2 text-[11px] text-ink-4">{formatDate(o.deliveredAt)}</span>}
                </Td>
                <Td className="text-right">
                  {o.status !== "delivered" ? (
                    <Button size="xs" variant="secondary" onClick={() => void receive(o)} loading={receiving === o._id}>
                      <PackageCheck className="size-3.5" /> Mark received
                    </Button>
                  ) : (
                    <CheckCircle2 className="ml-auto size-4 text-success" aria-label="Received" />
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Glass>
  );
}

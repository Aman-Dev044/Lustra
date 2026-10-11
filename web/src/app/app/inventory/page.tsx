"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Boxes, DollarSign, Minus, MoreHorizontal, PackagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { InventoryItem, Paginated } from "@/lib/types";
import { cn, formatMoney, formatNumber } from "@/lib/utils";
import { Badge, Button, ConfirmDialog, EmptyState, Field, Glass, Input, Menu, Modal, Select, Skeleton } from "@/components/spatial";
import { PageHeader, StatCard, Table, Td, Th, Toolbar } from "@/components/app/ui";
import { useAuth } from "@/components/app/auth-provider";

export default function InventoryPage() {
  return (
    <Suspense fallback={null}>
      <Inventory />
    </Suspense>
  );
}

function Inventory() {
  const params = useSearchParams();
  const router = useRouter();
  const { isManager } = useAuth();
  const { data, loading } = useApi<Paginated<InventoryItem>>("/inventory", { pageSize: 200 });
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | "new" | null>(params.get("new") === "1" ? "new" : null);
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => data?.items ?? [], [data]);
  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[], [items]);
  const isLow = (i: InventoryItem) => i.quantity <= i.reorderLevel;
  const filtered = items.filter(
    (i) =>
      (category === "all" || i.category === category) &&
      (!lowOnly || isLow(i)) &&
      (!q || `${i.name} ${i.sku ?? ""} ${i.supplier ?? ""}`.toLowerCase().includes(q.toLowerCase())),
  );
  const value = items.reduce((s, i) => s + i.quantity * i.cost, 0);
  const low = items.filter(isLow);

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/inventory/${deleting._id}`);
      invalidate("/inventory");
      toast.success(`${deleting.name} removed`);
      setDeleting(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Film, coatings, chemicals and supplies — tracked down to the roll and bottle."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Add item
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Items tracked" value={formatNumber(items.length)} icon={<Boxes className="size-4" />} hint={`${categories.length} categories`} />
        <StatCard label="Stock value (at cost)" value={formatMoney(value)} icon={<DollarSign className="size-4" />} />
        <StatCard
          label="Low stock"
          value={<span className={low.length ? "text-warning" : ""}>{low.length}</span>}
          icon={<AlertTriangle className="size-4" />}
          hint={low.length ? "Below reorder level" : "Everything stocked"}
        />
      </div>

      <Toolbar>
        <div className="glass-inset flex h-10 w-full items-center gap-2 rounded-full px-4 sm:w-72">
          <Search className="size-4 text-ink-4" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, SKU, supplier…"
            aria-label="Search inventory"
            className="h-full flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-auto rounded-full" aria-label="Category">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <button
          onClick={() => setLowOnly((v) => !v)}
          className={cn(
            "h-10 rounded-full border px-4 text-sm transition",
            lowOnly ? "border-warning/40 bg-warning/10 text-warning" : "border-ink/10 text-ink-3 hover:text-ink",
          )}
          aria-pressed={lowOnly}
        >
          Low stock only
        </button>
      </Toolbar>

      <Glass className="overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !filtered.length ? (
          <EmptyState
            icon={<Boxes className="size-7" />}
            title={items.length ? "Nothing matches those filters" : "No inventory yet"}
            description={items.length ? "Try a different search or category." : "Add your film rolls, coatings and chemicals to get low-stock alerts."}
            action={
              !items.length && (
                <Button onClick={() => setEditing("new")}>
                  <PackagePlus className="size-4" /> Add first item
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Item</Th>
                <Th>Category</Th>
                <Th className="text-right">On hand</Th>
                <Th className="text-right">Reorder at</Th>
                <Th className="text-right">Unit cost</Th>
                <Th className="text-right">Value</Th>
                <Th>Supplier</Th>
                <Th className="text-right">Adjust</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const lowItem = isLow(i);
                const pct = Math.min(100, (i.quantity / Math.max(1, i.reorderLevel * 3)) * 100);
                return (
                  <tr key={i._id} className={cn("transition-colors hover:bg-ink/[0.03]", lowItem && "bg-warning/[0.04]")}>
                    <Td>
                      <p className="font-medium text-ink">{i.name}</p>
                      <p className="font-mono text-[11px] text-ink-4">{i.sku || "—"}</p>
                    </Td>
                    <Td>{i.category || "—"}</Td>
                    <Td className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn("tabular-nums", lowItem ? "font-semibold text-warning" : "text-ink")}>
                          {formatNumber(i.quantity)} {i.unit}
                        </span>
                        <span className="h-1 w-20 overflow-hidden rounded-full bg-ink/10">
                          <span
                            className={cn("block h-full rounded-full", lowItem ? "bg-warning" : "bg-gradient-to-r from-iris to-aqua")}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                      </div>
                    </Td>
                    <Td className="text-right tabular-nums">
                      {i.reorderLevel} {lowItem && <Badge tone="warning" className="ml-1">Reorder</Badge>}
                    </Td>
                    <Td className="text-right tabular-nums">{formatMoney(i.cost)}</Td>
                    <Td className="text-right tabular-nums text-ink">{formatMoney(i.quantity * i.cost)}</Td>
                    <Td>{i.supplier || "—"}</Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="xs" variant="secondary" onClick={() => setAdjusting(i)} aria-label={`Adjust ${i.name}`}>
                          <Plus className="size-3" />
                          <Minus className="size-3" />
                        </Button>
                        {isManager && (
                          <Menu
                            trigger={
                              <button className="rounded-full p-1.5 text-ink-4 hover:bg-ink/10 hover:text-ink" aria-label="More actions">
                                <MoreHorizontal className="size-4" />
                              </button>
                            }
                            items={[
                              { label: "Edit", icon: <Pencil className="size-4" />, onClick: () => setEditing(i) },
                              { label: "Delete", icon: <Trash2 className="size-4" />, danger: true, onClick: () => setDeleting(i) },
                            ]}
                          />
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Glass>

      <ItemModal
        item={editing}
        onClose={() => {
          setEditing(null);
          if (params.get("new")) router.replace("/app/inventory");
        }}
      />
      <AdjustModal item={adjusting} onClose={() => setAdjusting(null)} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        danger
        title={`Delete ${deleting?.name ?? "item"}?`}
        description="Its adjustment history will be removed too."
        confirmLabel="Delete"
      />
    </>
  );
}

const emptyForm = { name: "", sku: "", category: "", unit: "unit", quantity: "0", reorderLevel: "0", cost: "0", supplier: "", location: "" };

function ItemModal({ item, onClose }: { item: InventoryItem | "new" | null; onClose: () => void }) {
  const isNew = item === "new";
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [lastItem, setLastItem] = useState<typeof item>(null);

  if (item !== lastItem) {
    setLastItem(item);
    if (item && item !== "new") {
      setForm({
        name: item.name,
        sku: item.sku ?? "",
        category: item.category ?? "",
        unit: item.unit,
        quantity: String(item.quantity),
        reorderLevel: String(item.reorderLevel),
        cost: String(item.cost),
        supplier: item.supplier ?? "",
        location: item.location ?? "",
      });
    } else if (item === "new") {
      setForm(emptyForm);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        sku: form.sku || undefined,
        category: form.category || undefined,
        unit: form.unit || "unit",
        reorderLevel: Number(form.reorderLevel) || 0,
        cost: Number(form.cost) || 0,
        supplier: form.supplier || undefined,
        location: form.location || undefined,
        ...(isNew ? { quantity: Number(form.quantity) || 0 } : {}),
      };
      if (isNew) await api.post("/inventory", body);
      else if (item) await api.patch(`/inventory/${item._id}`, body);
      invalidate("/inventory");
      toast.success(isNew ? "Item added" : "Item updated");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={isNew ? "Add inventory item" : "Edit item"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!form.name}>
            {isNew ? "Add item" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" className="col-span-2">
          <Input value={form.name} onChange={set("name")} placeholder="XPEL Ultimate Plus 60in roll" autoFocus />
        </Field>
        <Field label="SKU">
          <Input value={form.sku} onChange={set("sku")} className="font-mono" />
        </Field>
        <Field label="Category">
          <Input value={form.category} onChange={set("category")} placeholder="PPF film, Coatings…" list="inv-cats" />
          <datalist id="inv-cats">
            {["PPF film", "Window film", "Vinyl", "Coatings", "Polish & compound", "Chemicals", "Pads & towels", "Tools"].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Unit">
          <Input value={form.unit} onChange={set("unit")} placeholder="ft, bottle, roll…" />
        </Field>
        {isNew && (
          <Field label="Starting quantity">
            <Input type="number" min={0} value={form.quantity} onChange={set("quantity")} />
          </Field>
        )}
        <Field label="Reorder level">
          <Input type="number" min={0} value={form.reorderLevel} onChange={set("reorderLevel")} />
        </Field>
        <Field label="Unit cost ($)">
          <Input type="number" min={0} step="0.01" value={form.cost} onChange={set("cost")} />
        </Field>
        <Field label="Supplier">
          <Input value={form.supplier} onChange={set("supplier")} />
        </Field>
        <Field label="Storage location">
          <Input value={form.location} onChange={set("location")} placeholder="Shelf B2" />
        </Field>
      </div>
    </Modal>
  );
}

const reasons = ["Used on job", "Restock received", "Damaged / waste", "Cycle count correction", "Returned to supplier"];

function AdjustModal({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
  const [direction, setDirection] = useState<1 | -1>(-1);
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState(reasons[0]!);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!item) return;
    const delta = direction * Math.abs(Number(amount) || 0);
    if (!delta) return;
    setSaving(true);
    try {
      await api.post(`/inventory/${item._id}/adjust`, { delta, reason });
      invalidate("/inventory");
      toast.success(`${item.name}: ${delta > 0 ? "+" : ""}${delta} ${item.unit}`);
      setAmount("1");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const next = item ? item.quantity + direction * Math.abs(Number(amount) || 0) : 0;

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      size="sm"
      title={`Adjust ${item?.name ?? ""}`}
      description={item ? `Currently ${item.quantity} ${item.unit} on hand` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Apply adjustment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {([
            [-1, "Remove", Minus],
            [1, "Add", Plus],
          ] as const).map(([d, label, Icon]) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDirection(d);
                setReason(d === 1 ? reasons[1]! : reasons[0]!);
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm transition",
                direction === d
                  ? d === 1
                    ? "border-success/40 bg-success/10 text-success"
                    : "border-danger/40 bg-danger/10 text-danger"
                  : "border-ink/10 text-ink-3",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        <Field label={`Amount (${item?.unit ?? "units"})`}>
          <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Reason">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {reasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        {item && (
          <p className="text-center text-sm text-ink-3">
            New balance: <span className={cn("font-semibold tabular-nums", next <= item.reorderLevel ? "text-warning" : "text-ink")}>{next} {item.unit}</span>
          </p>
        )}
      </div>
    </Modal>
  );
}

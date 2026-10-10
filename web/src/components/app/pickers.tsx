"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { useApi, useDebounced, invalidate } from "@/lib/hooks/use-api";
import type { Customer, Paginated, Service, Vehicle, VehicleSize, VehicleType } from "@/lib/types";
import { customerName, vehicleLabel, categoryMeta } from "@/lib/domain";
import { cn, formatMoney } from "@/lib/utils";
import { useOnOpen } from "@/lib/hooks/use-list-state";
import { Button, Field, Input, Modal, Select } from "@/components/spatial";

/* ── Customer picker with inline create ────────────────────────────────── */

export function CustomerPicker({
  value,
  onChange,
  placeholder = "Select customer",
}: {
  value: Customer | null;
  onChange: (c: Customer | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 200);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useApi<Paginated<Customer>>(open ? "/customers" : null, { q: dq, pageSize: 8 });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between rounded-[var(--radius-control)] border border-white/10 bg-black/25 px-3.5 text-left text-sm transition hover:border-white/20"
      >
        <span className={value ? "text-ink" : "text-ink-4"}>
          {value ? customerName(value) : placeholder}
          {value?.phone && <span className="ml-2 text-xs text-ink-4">{value.phone}</span>}
        </span>
        <ChevronsUpDown className="size-4 text-ink-4" />
      </button>
      {open && (
        <div className="glass-sheet absolute z-50 mt-2 w-full overflow-hidden rounded-2xl p-1.5">
          <div className="flex items-center gap-2 border-b border-white/[0.07] px-2.5 pb-2">
            <Search className="size-4 text-ink-4" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, phone, email…"
              className="h-9 flex-1 bg-transparent text-sm focus:outline-none"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {data?.items.map((c) => (
              <li key={c._id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink-2 hover:bg-white/[0.07] hover:text-ink"
                >
                  <span className="flex-1">
                    {customerName(c)}
                    <span className="ml-2 text-xs text-ink-4">{c.phone || c.email}</span>
                  </span>
                  {value?._id === c._id && <Check className="size-4 text-aqua" />}
                </button>
              </li>
            ))}
            {data && data.items.length === 0 && <li className="px-3 py-3 text-xs text-ink-4">No customers found.</li>}
          </ul>
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-aqua-soft hover:bg-white/[0.07]"
          >
            <Plus className="size-4" /> New customer{q ? ` “${q}”` : ""}
          </button>
        </div>
      )}
      <CustomerCreateModal
        open={creating}
        initialName={q}
        onClose={() => setCreating(false)}
        onCreated={(c) => {
          onChange(c);
          setCreating(false);
        }}
      />
    </div>
  );
}

export function CustomerCreateModal({
  open,
  onClose,
  onCreated,
  initialName = "",
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (c: Customer) => void;
  initialName?: string;
}) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", source: "walk-in" });
  const [saving, setSaving] = useState(false);
  useOnOpen(open, () => {
    const [first = "", ...rest] = initialName.trim().split(/\s+/);
    setForm({ firstName: first, lastName: rest.join(" "), email: "", phone: "", source: "walk-in" });
  });

  async function save() {
    setSaving(true);
    try {
      const c = await api.post<Customer>("/customers", form);
      invalidate("/customers");
      toast.success(`${customerName(c)} added`);
      onCreated(c);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New customer"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!form.firstName}>
            Save customer
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoFocus />
        </Field>
        <Field label="Last name">
          <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </Field>
        <Field label="Phone" className="col-span-2">
          <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Email" className="col-span-2">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Source" className="col-span-2">
          <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
            {["walk-in", "referral", "google", "instagram", "facebook", "website", "repeat", "other"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

/* ── Vehicle picker (scoped to a customer) with inline create + VIN decode ─ */

export function VehiclePicker({
  customerId,
  value,
  onChange,
}: {
  customerId: string | null;
  value: Vehicle | null;
  onChange: (v: Vehicle | null) => void;
}) {
  const { data, refresh } = useApi<Paginated<Vehicle>>(customerId ? "/vehicles" : null, { customer: customerId, pageSize: 50 });
  const [creating, setCreating] = useState(false);
  if (!customerId) {
    return <div className="flex h-11 items-center rounded-[var(--radius-control)] border border-dashed border-white/10 px-3.5 text-sm text-ink-4">Pick a customer first</div>;
  }
  return (
    <div className="flex gap-2">
      <Select
        value={value?._id ?? ""}
        onChange={(e) => onChange(data?.items.find((v) => v._id === e.target.value) ?? null)}
        className="flex-1"
      >
        <option value="">{data?.items.length ? "Select vehicle" : "No vehicles yet"}</option>
        {data?.items.map((v) => (
          <option key={v._id} value={v._id}>
            {vehicleLabel(v)} {v.color ? `· ${v.color}` : ""}
          </option>
        ))}
      </Select>
      <Button type="button" variant="secondary" size="icon" className="h-11 w-11" onClick={() => setCreating(true)} aria-label="Add vehicle">
        <Plus className="size-4" />
      </Button>
      <VehicleCreateModal
        open={creating}
        customerId={customerId}
        onClose={() => setCreating(false)}
        onCreated={(v) => {
          void refresh();
          onChange(v);
          setCreating(false);
        }}
      />
    </div>
  );
}

const SIZE_BY_TYPE: Record<VehicleType, VehicleSize> = {
  car: "medium",
  suv: "large",
  truck: "large",
  van: "xl",
  motorcycle: "small",
  boat: "xl",
  rv: "xl",
  other: "medium",
};

export function VehicleCreateModal({
  open,
  customerId,
  onClose,
  onCreated,
  vehicle,
}: {
  open: boolean;
  customerId: string;
  onClose: () => void;
  onCreated: (v: Vehicle) => void;
  vehicle?: Vehicle | null;
}) {
  const empty = { type: "car" as VehicleType, year: "", make: "", model: "", trim: "", color: "", vin: "", plate: "", size: "medium" as VehicleSize };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [decoding, setDecoding] = useState(false);

  useOnOpen(open, () =>
    setForm(
      vehicle
        ? {
            type: vehicle.type,
            year: vehicle.year ? String(vehicle.year) : "",
            make: vehicle.make ?? "",
            model: vehicle.model ?? "",
            trim: vehicle.trim ?? "",
            color: vehicle.color ?? "",
            vin: vehicle.vin ?? "",
            plate: vehicle.plate ?? "",
            size: vehicle.size,
          }
        : empty,
    ),
  );

  async function decode() {
    if (form.vin.length !== 17) return toast.error("VINs are 17 characters");
    setDecoding(true);
    try {
      const r = await api.get<{ valid: boolean; year?: number; make?: string; country?: string }>(`/vehicles/decode-vin/${form.vin}`);
      if (!r.valid) toast.warning("Check digit doesn't match — double-check the VIN");
      setForm((f) => ({ ...f, year: r.year ? String(r.year) : f.year, make: r.make ?? f.make }));
      if (r.make) toast.success(`Decoded: ${r.year ?? ""} ${r.make}${r.country ? ` · built in ${r.country}` : ""}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDecoding(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const body = { ...form, customer: customerId, year: form.year ? Number(form.year) : undefined };
      const v = vehicle ? await api.patch<Vehicle>(`/vehicles/${vehicle._id}`, body) : await api.post<Vehicle>("/vehicles", body);
      invalidate("/vehicles", "/customers");
      toast.success(vehicle ? "Vehicle updated" : "Vehicle added");
      onCreated(v);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={vehicle ? "Edit vehicle" : "Add vehicle"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {vehicle ? "Save changes" : "Add vehicle"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="VIN" className="col-span-2 sm:col-span-3">
          <Input value={form.vin} maxLength={17} onChange={(e) => setForm({ ...form, vin: e.target.value.toUpperCase() })} className="font-mono" />
        </Field>
        <div className="col-span-2 flex items-end sm:col-span-1">
          <Button type="button" variant="secondary" className="h-11 w-full" onClick={decode} loading={decoding}>
            Decode
          </Button>
        </div>
        <Field label="Type">
          <Select
            value={form.type}
            onChange={(e) => {
              const type = e.target.value as VehicleType;
              setForm({ ...form, type, size: SIZE_BY_TYPE[type] });
            }}
          >
            {Object.keys(SIZE_BY_TYPE).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Year">
          <Input inputMode="numeric" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
        </Field>
        <Field label="Make">
          <Input value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
        </Field>
        <Field label="Model">
          <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        </Field>
        <Field label="Trim">
          <Input value={form.trim} onChange={(e) => setForm({ ...form, trim: e.target.value })} />
        </Field>
        <Field label="Color">
          <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
        </Field>
        <Field label="Plate">
          <Input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Size (pricing)">
          <Select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value as VehicleSize })}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="xl">XL</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

/* ── Service catalog quick-add ─────────────────────────────────────────── */

export function ServiceQuickAdd({ onPick, size = "medium" }: { onPick: (s: Service, price: number) => void; size?: VehicleSize }) {
  const { data } = useApi<Paginated<Service>>("/services", { active: true, pageSize: 200 });
  const [q, setQ] = useState("");
  const list = (data?.items ?? []).filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="glass-inset mb-2 flex items-center gap-2 rounded-xl px-3">
        <Search className="size-4 text-ink-4" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services…" className="h-10 flex-1 bg-transparent text-sm focus:outline-none" />
      </div>
      <div className="grid max-h-72 gap-1.5 overflow-y-auto sm:grid-cols-2">
        {list.map((s) => {
          const price = Math.round(s.basePrice * (s.sizeMultipliers?.[size] ?? 1));
          return (
            <button
              key={s._id}
              type="button"
              onClick={() => onPick(s, price)}
              className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-aqua/40 hover:bg-white/[0.07]"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ background: categoryMeta[s.category]?.color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{s.name}</span>
                <span className="text-[11px] text-ink-4">{categoryMeta[s.category]?.label}</span>
              </span>
              <span className="text-sm font-medium text-ink-2 tabular-nums">{formatMoney(price)}</span>
              <Plus className={cn("size-4 text-ink-4 transition group-hover:text-aqua")} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { subMonths } from "date-fns";
import {
  Box,
  Check,
  Code2,
  Copy,
  CreditCard,
  ExternalLink,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Paginated, PlanId, Service, ServiceCategory, Shop, User, VehicleSize, WorkingHours } from "@/lib/types";
import { categoryMeta } from "@/lib/domain";
import { pricingPlans, visualizerAddOn } from "@/lib/plans";
import { cn, formatDate, formatDuration, formatMoney, titleCase } from "@/lib/utils";
import { Badge, Button, ConfirmDialog, EmptyState, Field, Glass, Input, Modal, Segmented, Select, Skeleton, Switch, Textarea } from "@/components/spatial";
import { PageHeader, Table, Td, Th } from "@/components/app/ui";
import { useAuth } from "@/components/app/auth-provider";

type Tab = "shop" | "services" | "booking" | "billing" | "profile";

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <Settings />
    </Suspense>
  );
}

function Settings() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const isAdmin = user.role === "owner" || user.role === "admin";
  const tabs: { value: Tab; label: string }[] = isAdmin
    ? [
        { value: "shop", label: "Shop" },
        { value: "services", label: "Services" },
        { value: "booking", label: "Booking" },
        { value: "billing", label: "Billing" },
        { value: "profile", label: "Profile" },
      ]
    : [{ value: "profile", label: "Profile" }];
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = tabs.some((t) => t.value === requested) ? requested! : tabs[0]!.value;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your shop, catalog, booking rules, plan and profile."
        actions={
          isAdmin && (
            <Button variant="secondary" href="/app/team">
              <Users className="size-4" /> Manage team
            </Button>
          )
        }
      />
      <div className="mb-5 overflow-x-auto">
        <Segmented value={tab} onChange={(v) => router.replace(`/app/settings?tab=${v}`, { scroll: false })} options={tabs} />
      </div>
      {tab === "shop" && <ShopTab />}
      {tab === "services" && <ServicesTab />}
      {tab === "booking" && <BookingTab />}
      {tab === "billing" && <BillingTab />}
      {tab === "profile" && <ProfileTab />}
    </>
  );
}

/* ── Shop ──────────────────────────────────────────────────────────────── */

const TIMEZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu", "America/Toronto", "Europe/London", "Australia/Sydney"];

function ShopTab() {
  const { shop, setShop } = useAuth();
  const [form, setForm] = useState(() => ({
    name: shop.name,
    phone: shop.phone ?? "",
    email: shop.email ?? "",
    website: shop.website ?? "",
    address: shop.address ?? "",
    brandColor: shop.brandColor || "#7c5cff",
    taxRate: String(shop.taxRate ?? 0),
    timezone: shop.timezone,
    currency: shop.currency,
    logoUrl: shop.logoUrl ?? "",
    depotAddress: shop.depot?.address ?? "",
    depotLat: shop.depot?.lat !== undefined ? String(shop.depot.lat) : "",
    depotLng: shop.depot?.lng !== undefined ? String(shop.depot.lng) : "",
  }));
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  async function save() {
    setSaving(true);
    try {
      const { depotAddress, depotLat, depotLng, ...rest } = form;
      const lat = Number(depotLat);
      const lng = Number(depotLng);
      const updated = await api.patch<Shop>("/shop", {
        ...rest,
        taxRate: Number(form.taxRate) || 0,
        depot: {
          address: depotAddress || undefined,
          ...(depotLat !== "" && Number.isFinite(lat) && Math.abs(lat) <= 90 ? { lat } : {}),
          ...(depotLng !== "" && Number.isFinite(lng) && Math.abs(lng) <= 180 ? { lng } : {}),
        },
      });
      setShop(updated);
      toast.success("Shop details saved");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Glass className="p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shop name" className="sm:col-span-2">
            <Input value={form.name} onChange={set("name")} />
          </Field>
          <Field label="Phone">
            <Input type="tel" value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={set("website")} placeholder="https://" />
          </Field>
          <Field label="Logo URL">
            <Input value={form.logoUrl} onChange={set("logoUrl")} placeholder="https://…/logo.png" />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input value={form.address} onChange={set("address")} />
          </Field>
          <Field label="Sales tax rate (%)">
            <Input type="number" min={0} max={30} step="0.001" value={form.taxRate} onChange={set("taxRate")} />
          </Field>
          <Field label="Currency">
            <Select value={form.currency} onChange={set("currency")}>
              {["USD", "CAD", "AUD", "GBP", "EUR", "NZD"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Timezone" className="sm:col-span-2">
            <Select value={form.timezone} onChange={set("timezone")}>
              {Array.from(new Set([form.timezone, ...TIMEZONES])).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-6 border-t border-ink/[0.07] pt-5">
          <h3 className="text-sm font-semibold">Routing depot</h3>
          <p className="mb-3 text-xs text-ink-4">Where mobile routes start and end. Used by route optimization and ETAs.</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px]">
            <Field label="Depot address">
              <Input value={form.depotAddress} onChange={set("depotAddress")} placeholder="Same as shop address" />
            </Field>
            <Field label="Latitude">
              <Input inputMode="decimal" value={form.depotLat} onChange={set("depotLat")} placeholder="30.2672" />
            </Field>
            <Field label="Longitude">
              <Input inputMode="decimal" value={form.depotLng} onChange={set("depotLng")} placeholder="-97.7431" />
            </Field>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            loading={locating}
            onClick={() => {
              if (!navigator.geolocation) return void toast.error("Location isn't available in this browser");
              setLocating(true);
              navigator.geolocation.getCurrentPosition(
                (p) => {
                  setForm((f) => ({ ...f, depotLat: p.coords.latitude.toFixed(5), depotLng: p.coords.longitude.toFixed(5) }));
                  setLocating(false);
                },
                () => {
                  toast.error("Couldn't get your location");
                  setLocating(false);
                },
              );
            }}
          >
            Use my current location
          </Button>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={save} loading={saving}>
            <Save className="size-4" /> Save changes
          </Button>
        </div>
      </Glass>
      <Glass className="p-6">
        <Field label="Brand color" hint="Used on your booking page, portal, quotes and certificates.">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.brandColor}
              onChange={set("brandColor")}
              className="h-11 w-14 cursor-pointer rounded-xl border border-ink/10 bg-transparent"
              aria-label="Brand color"
            />
            <Input value={form.brandColor} onChange={set("brandColor")} className="font-mono" />
          </div>
        </Field>
        <p className="mt-6 mb-2 text-xs font-medium text-ink-2">Preview</p>
        <div className="glass-2 overflow-hidden rounded-3xl">
          <div className="h-20" style={{ background: `linear-gradient(135deg, ${form.brandColor}, #22d3ee)` }} />
          <div className="p-4">
            <p className="font-semibold">{form.name || "Your shop"}</p>
            <p className="text-xs text-ink-3">{form.phone || "(555) 000-0000"}</p>
            <div className="mt-3 inline-flex h-9 items-center rounded-full px-4 text-xs font-medium text-white" style={{ background: form.brandColor }}>
              Book now
            </div>
          </div>
        </div>
      </Glass>
    </div>
  );
}

/* ── Services ──────────────────────────────────────────────────────────── */

const SIZES: VehicleSize[] = ["small", "medium", "large", "xl"];

function ServicesTab() {
  const { data, loading } = useApi<Paginated<Service>>("/services", { pageSize: 200 });
  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [deleting, setDeleting] = useState<Service | null>(null);
  const [category, setCategory] = useState<"all" | ServiceCategory>("all");
  const items = (data?.items ?? []).filter((s) => category === "all" || s.category === category);

  async function toggle(s: Service, key: "active" | "bookable", value: boolean) {
    try {
      await api.patch(`/services/${s._id}`, { [key]: value });
      invalidate("/services");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api.delete(`/services/${deleting._id}`);
      invalidate("/services");
      toast.success(`${deleting.name} deleted`);
      setDeleting(null);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Glass className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.07] p-4">
        <Select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="h-10 w-48 rounded-full" aria-label="Category filter">
          <option value="all">All categories</option>
          {(Object.keys(categoryMeta) as ServiceCategory[]).map((c) => (
            <option key={c} value={c}>
              {categoryMeta[c].label}
            </option>
          ))}
        </Select>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Add service
        </Button>
      </div>
      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No services yet" description="Your catalog powers quotes, the AI Copilot and online booking." action={<Button onClick={() => setEditing("new")}>Add service</Button>} />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Service</Th>
              <Th>Category</Th>
              <Th className="text-right">Base price</Th>
              <Th className="text-right">Duration</Th>
              <Th className="text-center">Bookable</Th>
              <Th className="text-center">Active</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s._id} className="hover:bg-ink/[0.03]">
                <Td>
                  <p className="font-medium text-ink">{s.name}</p>
                  {s.description && <p className="line-clamp-1 max-w-sm text-xs text-ink-4">{s.description}</p>}
                </Td>
                <Td>
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: categoryMeta[s.category]?.color }} />
                    {categoryMeta[s.category]?.label}
                  </span>
                </Td>
                <Td className="text-right tabular-nums">{formatMoney(s.basePrice)}</Td>
                <Td className="text-right tabular-nums">{formatDuration(s.durationMinutes)}</Td>
                <Td className="text-center">
                  <Switch checked={s.bookable} onChange={(v) => void toggle(s, "bookable", v)} label={`${s.name} bookable online`} />
                </Td>
                <Td className="text-center">
                  <Switch checked={s.active} onChange={(v) => void toggle(s, "active", v)} label={`${s.name} active`} />
                </Td>
                <Td className="text-right whitespace-nowrap">
                  <button onClick={() => setEditing(s)} className="rounded-full p-2 text-ink-4 hover:bg-ink/10 hover:text-ink" aria-label={`Edit ${s.name}`}>
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => setDeleting(s)} className="rounded-full p-2 text-ink-4 hover:bg-danger/10 hover:text-danger" aria-label={`Delete ${s.name}`}>
                    <Trash2 className="size-4" />
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <ServiceModal service={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        danger
        title={`Delete ${deleting?.name ?? ""}?`}
        description="Existing quotes and jobs keep their line items. Consider deactivating instead."
        confirmLabel="Delete service"
      />
    </Glass>
  );
}

const emptyService = {
  name: "",
  category: "detailing" as ServiceCategory,
  description: "",
  basePrice: "0",
  durationMinutes: "120",
  sizeMultipliers: { small: "1", medium: "1.15", large: "1.3", xl: "1.5" } as Record<VehicleSize, string>,
  keywords: "",
  bookable: true,
  active: true,
};

function ServiceModal({ service, onClose }: { service: Service | "new" | null; onClose: () => void }) {
  const isNew = service === "new";
  const [form, setForm] = useState(emptyService);
  const [last, setLast] = useState<typeof service>(null);
  const [saving, setSaving] = useState(false);

  if (service !== last) {
    setLast(service);
    if (service && service !== "new")
      setForm({
        name: service.name,
        category: service.category,
        description: service.description ?? "",
        basePrice: String(service.basePrice),
        durationMinutes: String(service.durationMinutes),
        sizeMultipliers: Object.fromEntries(SIZES.map((s) => [s, String(service.sizeMultipliers?.[s] ?? 1)])) as Record<VehicleSize, string>,
        keywords: (service.keywords ?? []).join(", "),
        bookable: service.bookable,
        active: service.active,
      });
    else if (service === "new") setForm(emptyService);
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        basePrice: Number(form.basePrice) || 0,
        durationMinutes: Number(form.durationMinutes) || 60,
        sizeMultipliers: Object.fromEntries(SIZES.map((s) => [s, Number(form.sizeMultipliers[s]) || 1])),
        keywords: form.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean),
        bookable: form.bookable,
        active: form.active,
      };
      if (isNew) await api.post("/services", body);
      else if (service) await api.patch(`/services/${service._id}`, body);
      invalidate("/services");
      toast.success(isNew ? "Service added" : "Service updated");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const base = Number(form.basePrice) || 0;

  return (
    <Modal
      open={!!service}
      onClose={onClose}
      title={isNew ? "Add service" : "Edit service"}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!form.name}>
            Save service
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ceramic Coating · 5 Year" autoFocus />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ServiceCategory })}>
            {(Object.keys(categoryMeta) as ServiceCategory[]).map((c) => (
              <option key={c} value={c}>
                {categoryMeta[c].label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Base price ($)">
            <Input type="number" min={0} step="1" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
          </Field>
          <Field label="Duration (min)">
            <Input type="number" min={5} step="5" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          </Field>
        </div>
        <Field label="Description" className="sm:col-span-2">
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-20" />
        </Field>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-medium text-ink-2">Vehicle size pricing</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SIZES.map((s) => (
              <div key={s} className="glass-inset rounded-2xl p-3">
                <p className="text-[11px] text-ink-4">{titleCase(s)}</p>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-xs text-ink-4">×</span>
                  <input
                    type="number"
                    step="0.05"
                    min={0.5}
                    value={form.sizeMultipliers[s]}
                    onChange={(e) => setForm({ ...form, sizeMultipliers: { ...form.sizeMultipliers, [s]: e.target.value } })}
                    className="w-full bg-transparent text-sm font-medium tabular-nums focus:outline-none"
                    aria-label={`${s} multiplier`}
                  />
                </div>
                <p className="mt-1 text-xs text-aqua-soft tabular-nums">{formatMoney(Math.round(base * (Number(form.sizeMultipliers[s]) || 1)))}</p>
              </div>
            ))}
          </div>
        </div>
        <Field label="Copilot keywords" hint="Comma-separated words that help the AI Quote Copilot match this service." className="sm:col-span-2">
          <Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="ceramic, coating, 5 year, protection" />
        </Field>
        <label className="flex items-center gap-3 text-sm text-ink-2">
          <Switch checked={form.bookable} onChange={(v) => setForm({ ...form, bookable: v })} label="Bookable online" /> Bookable online
        </label>
        <label className="flex items-center gap-3 text-sm text-ink-2">
          <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Active" /> Active
        </label>
      </div>
    </Modal>
  );
}

/* ── Booking ───────────────────────────────────────────────────────────── */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function normalizeHours(hours: WorkingHours[] | undefined): WorkingHours[] {
  return DAYS.map((_, day) => hours?.find((h) => h.day === day) ?? { day, open: "08:00", close: "18:00", closed: day === 0 });
}

function BookingTab() {
  const { shop, setShop, can } = useAuth();
  const [b, setB] = useState(() => ({ ...shop.booking, workingHours: normalizeHours(shop.booking?.workingHours) }));
  const [saving, setSaving] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/book/${shop.slug}`;
  const embed = `<iframe src="${url}" title="Book with ${shop.name}" style="width:100%;min-height:780px;border:0;border-radius:24px" loading="lazy"></iframe>`;
  const allowed = can("online_booking");

  const setDay = (day: number, patch: Partial<WorkingHours>) =>
    setB({ ...b, workingHours: b.workingHours.map((h) => (h.day === day ? { ...h, ...patch } : h)) });

  async function save() {
    setSaving(true);
    try {
      const updated = await api.patch<Shop>("/shop", {
        booking: {
          ...b,
          slotMinutes: Number(b.slotMinutes) || 30,
          leadTimeHours: Number(b.leadTimeHours) || 0,
          bays: Math.max(1, Number(b.bays) || 1),
          depositPercent: Number(b.depositPercent) || 0,
        },
      });
      setShop(updated);
      toast.success("Booking settings saved");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <Glass className="p-6">
        {!allowed && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-iris/30 bg-iris/10 px-4 py-3 text-sm">
            <span className="text-ink-2">Online booking is included on Pro and Enterprise.</span>
            <Button size="xs" href="/app/settings?tab=billing">
              Upgrade
            </Button>
          </div>
        )}
        <label className="flex items-center justify-between gap-4 rounded-2xl bg-ink/[0.04] px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-ink">Accept online bookings</span>
            <span className="text-xs text-ink-4">Customers pick services and real-time slots that respect your bays.</span>
          </span>
          <Switch checked={!!b.enabled} disabled={!allowed} onChange={(v) => setB({ ...b, enabled: v })} label="Accept online bookings" />
        </label>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Booking page headline" className="sm:col-span-2">
            <Input value={b.headline ?? ""} onChange={(e) => setB({ ...b, headline: e.target.value })} placeholder="Book your next detail in 60 seconds" />
          </Field>
          <Field label="Slot length (minutes)">
            <Select value={String(b.slotMinutes)} onChange={(e) => setB({ ...b, slotMinutes: Number(e.target.value) })}>
              {[15, 30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Minimum notice (hours)">
            <Input type="number" min={0} value={b.leadTimeHours} onChange={(e) => setB({ ...b, leadTimeHours: Number(e.target.value) })} />
          </Field>
          <Field label="Service bays" hint="Simultaneous jobs you can run.">
            <Input type="number" min={1} max={50} value={b.bays} onChange={(e) => setB({ ...b, bays: Number(e.target.value) })} />
          </Field>
          <Field label="Deposit">
            <div className="flex items-center gap-3">
              <Switch checked={!!b.requireDeposit} onChange={(v) => setB({ ...b, requireDeposit: v })} label="Require deposit" />
              <Input type="number" min={0} max={100} value={b.depositPercent} disabled={!b.requireDeposit} onChange={(e) => setB({ ...b, depositPercent: Number(e.target.value) })} className="w-24" aria-label="Deposit percent" />
              <span className="text-sm text-ink-3">%</span>
            </div>
          </Field>
        </div>

        <h3 className="mt-7 mb-3 text-sm font-semibold">Working hours</h3>
        <div className="space-y-1.5">
          {b.workingHours.map((h) => (
            <div key={h.day} className="flex flex-wrap items-center gap-3 rounded-2xl bg-ink/[0.03] px-4 py-2">
              <span className="w-24 text-sm text-ink">{DAYS[h.day]}</span>
              <Switch checked={!h.closed} onChange={(v) => setDay(h.day, { closed: !v })} label={`${DAYS[h.day]} open`} />
              {h.closed ? (
                <span className="text-sm text-ink-4">Closed</span>
              ) : (
                <span className="flex items-center gap-2">
                  <Input type="time" value={h.open} onChange={(e) => setDay(h.day, { open: e.target.value })} className="h-9 w-32" aria-label={`${DAYS[h.day]} opens`} />
                  <span className="text-ink-4">–</span>
                  <Input type="time" value={h.close} onChange={(e) => setDay(h.day, { close: e.target.value })} className="h-9 w-32" aria-label={`${DAYS[h.day]} closes`} />
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={save} loading={saving}>
            <Save className="size-4" /> Save booking settings
          </Button>
        </div>
      </Glass>

      <div className="space-y-4">
        <Glass className="p-5">
          <p className="text-sm font-semibold">Your booking page</p>
          <div className="glass-inset mt-3 flex items-center gap-2 rounded-full py-1 pr-1 pl-4">
            <span className="flex-1 truncate font-mono text-xs text-ink-2">{url}</span>
            <Button size="xs" variant="secondary" onClick={() => copy(url, "Link")} aria-label="Copy booking link">
              <Copy className="size-3.5" />
            </Button>
          </div>
          <Button size="sm" variant="secondary" className="mt-3 w-full" href={`/book/${shop.slug}`}>
            <ExternalLink className="size-4" /> Open booking page
          </Button>
        </Glass>
        <Glass className="p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Code2 className="size-4 text-aqua-soft" /> Embed on your website
          </p>
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-ink/40 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-ink-3">{embed}</pre>
          <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={() => copy(embed, "Embed code")}>
            <Copy className="size-4" /> Copy embed code
          </Button>
        </Glass>
      </div>
    </div>
  );
}

/* ── Billing ───────────────────────────────────────────────────────────── */

function BillingTab() {
  const { shop, setShop, user } = useAuth();
  const [interval, setBillingInterval] = useState(shop.planInterval);
  const [visualizer, setVisualizer] = useState(!!shop.addOns?.visualizer);
  const [pending, setPending] = useState<PlanId | null>(null);
  const [saving, setSaving] = useState(false);
  const isOwner = user.role === "owner";
  const current = pricingPlans.find((p) => p.id === shop.plan)!;

  async function apply(plan: PlanId, planInterval = interval, vis = visualizer) {
    setSaving(true);
    try {
      const updated = await api.patch<Shop>("/shop/plan", { plan, planInterval, addOns: { visualizer: vis } });
      setShop(updated);
      toast.success(`You're on ${titleCase(plan)} (${planInterval})${vis ? " + 3D Visualizer" : ""}`);
      setPending(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const price = (p: (typeof pricingPlans)[number]) => (interval === "yearly" ? p.yearly : p.monthly);
  const monthlyTotal = (shop.planInterval === "yearly" ? current.yearly / 12 : current.monthly) + (shop.addOns?.visualizer ? visualizerAddOn.monthly : 0);
  const history = Array.from({ length: 4 }, (_, i) => ({ date: subMonths(new Date(), i), amount: monthlyTotal }));

  return (
    <div className="space-y-4">
      <Glass tier={2} rim className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.16em] text-aqua-soft uppercase">Current plan</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {current.name}{" "}
            <span className="text-base font-normal text-ink-3">
              · {formatMoney(shop.planInterval === "yearly" ? current.yearly : current.monthly).replace(".00", "")}/{shop.planInterval === "yearly" ? "yr" : "mo"}
            </span>
          </p>
          <p className="mt-1 text-sm text-ink-3">
            {shop.addOns?.visualizer ? "Includes 3D Visualizer add-on · " : ""}Unlimited users · No contract
            {shop.trialEndsAt && new Date(shop.trialEndsAt) > new Date() ? ` · Trial ends ${formatDate(shop.trialEndsAt)}` : ""}
          </p>
        </div>
        <Segmented
          value={interval}
          onChange={setBillingInterval}
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly" },
          ]}
        />
      </Glass>

      <div className="grid gap-4 lg:grid-cols-3">
        {pricingPlans.map((p) => {
          const isCurrent = p.id === shop.plan && interval === shop.planInterval;
          return (
            <Glass key={p.id} className={cn("relative flex flex-col p-6", p.highlight && "rim", isCurrent && "border-aqua/40")}>
              {p.highlight && <Badge tone="iris" className="absolute top-5 right-5">Most popular</Badge>}
              <p className="text-lg font-semibold">{p.name}</p>
              <p className="mt-1 min-h-10 text-xs text-ink-3">{p.tagline}</p>
              <p className="mt-4">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">${price(p).toLocaleString()}</span>
                <span className="text-sm text-ink-3">/{interval === "yearly" ? "yr" : "mo"}</span>
              </p>
              {p.inherits && <p className="mt-4 text-xs font-medium text-ink-2">{p.inherits}</p>}
              <ul className="mt-2 flex-1 space-y-1.5">
                {p.features.slice(0, 7).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-ink-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-aqua" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-5 w-full" variant={isCurrent ? "secondary" : p.highlight ? "primary" : "outline"} disabled={isCurrent || !isOwner} onClick={() => setPending(p.id)}>
                {isCurrent ? "Current plan" : `Switch to ${p.name}`}
              </Button>
            </Glass>
          );
        })}
      </div>

      <Glass className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-plasma to-iris">
          <Box className="size-5 text-white" />
        </span>
        <div className="flex-1">
          <p className="font-semibold">
            {visualizerAddOn.name} add-on <span className="ml-1 text-sm font-normal text-ink-3">${visualizerAddOn.monthly}/mo</span>
          </p>
          <p className="text-sm text-ink-3">{visualizerAddOn.description}</p>
        </div>
        <Switch
          checked={visualizer}
          disabled={!isOwner || saving}
          onChange={(v) => {
            setVisualizer(v);
            void apply(shop.plan, shop.planInterval, v);
          }}
          label="3D Visualizer add-on"
        />
      </Glass>

      <div className="grid gap-4 lg:grid-cols-2">
        <Glass className="p-6">
          <p className="mb-4 text-sm font-semibold">Payment method</p>
          <div className="relative overflow-hidden rounded-3xl border border-ink/15 bg-[linear-gradient(135deg,#2a1f6b,#0e1430_55%,#0b3b4a)] p-5 shadow-[var(--shadow-lift)]">
            <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-aqua/30 blur-2xl" />
            <CreditCard className="size-6 text-white/80" />
            <p className="mt-8 font-mono text-lg tracking-[0.2em] text-white">•••• •••• •••• 4242</p>
            <div className="mt-3 flex justify-between text-xs text-white/70">
              <span>{user.name}</span>
              <span>12/29</span>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => toast("Card updates are handled by our secure billing partner in production.")}>
            Update card
          </Button>
        </Glass>
        <Glass className="overflow-hidden">
          <p className="px-6 pt-6 text-sm font-semibold">Billing history</p>
          <Table className="mt-3">
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Description</Th>
                <Th className="text-right">Amount</Th>
                <Th className="text-right">Status</Th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.date.toISOString()}>
                  <Td>{formatDate(h.date)}</Td>
                  <Td>Lustra {current.name}{shop.addOns?.visualizer ? " + Visualizer" : ""}</Td>
                  <Td className="text-right tabular-nums">{formatMoney(h.amount)}</Td>
                  <Td className="text-right">
                    <Badge tone="success">Paid</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Glass>
      </div>

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title={`Switch to ${pending ? titleCase(pending) : ""}?`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button onClick={() => pending && void apply(pending)} loading={saving}>
              <Sparkles className="size-4" /> Confirm change
            </Button>
          </>
        }
      >
        {pending && (
          <p className="text-sm text-ink-2">
            You&apos;ll be billed{" "}
            <span className="font-semibold text-ink">
              ${price(pricingPlans.find((p) => p.id === pending)!).toLocaleString()}/{interval === "yearly" ? "year" : "month"}
            </span>
            , prorated from today. Features unlock instantly and you can change plans any time — no contracts.
          </p>
        )}
      </Modal>
    </div>
  );
}

/* ── Profile ───────────────────────────────────────────────────────────── */

function ProfileTab() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, phone: user.phone ?? "" });
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  async function saveProfile() {
    setSaving(true);
    try {
      const u = await api.patch<User>("/auth/me", form);
      setUser(u);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    if (pw.next.length < 8) return toast.error("Use at least 8 characters");
    if (pw.next !== pw.confirm) return toast.error("Passwords don't match");
    setSavingPw(true);
    try {
      await api.patch("/auth/me", { password: pw.next });
      setPw({ next: "", confirm: "" });
      toast.success("Password changed");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Glass className="p-6">
        <h2 className="mb-4 text-sm font-semibold">Your profile</h2>
        <div className="space-y-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email" hint="Contact your shop owner to change your login email.">
            <Input value={user.email} disabled />
          </Field>
          <Field label="Phone">
            <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={saveProfile} loading={saving}>
            Save profile
          </Button>
        </div>
      </Glass>
      <Glass className="p-6">
        <h2 className="mb-4 text-sm font-semibold">Change password</h2>
        <div className="space-y-4">
          <Field label="New password" hint="At least 8 characters.">
            <Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </Field>
          <Field label="Confirm new password">
            <Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </Field>
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={savePassword} loading={savingPw} disabled={!pw.next}>
            Update password
          </Button>
        </div>
      </Glass>
    </div>
  );
}

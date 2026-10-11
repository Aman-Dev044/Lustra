"use client";

import Link from "next/link";
import { useState } from "react";
import { useOnOpen } from "@/lib/hooks/use-list-state";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Car,
  MessageSquareHeart,
  Crown,
  FilePlus2,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Certificate, Customer, GeoPoint, CustomerSource, Invoice, Job, Membership, Message, Quote, Vehicle } from "@/lib/types";
import { customerName, vehicleLabel } from "@/lib/domain";
import { cn, formatDate, formatMoney, formatNumber, relativeTime, titleCase } from "@/lib/utils";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Glass,
  Input,
  Modal,
  Segmented,
  Select,
  Skeleton,
  Switch,
  Textarea,
} from "@/components/spatial";
import { useAuth } from "@/components/app/auth-provider";
import { InvoiceStatusBadge, PageHeader, QuoteStatusBadge, StageBadge, StatCard } from "@/components/app/ui";
import { VehicleCreateModal } from "@/components/app/pickers";
import { DocumentsPanel } from "@/components/app/documents-panel";

interface Overview {
  customer: Customer;
  vehicles: Vehicle[];
  jobs: Job[];
  invoices: Invoice[];
  quotes: Quote[];
  messages: Message[];
  certificates: Certificate[];
  memberships: Membership[];
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isManager, can } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const { data, loading, error, mutate, refresh } = useApi<Overview>(`/customers/${id}/overview`);
  const [editing, setEditing] = useState(false);
  const [vehicleModal, setVehicleModal] = useState<{ open: boolean; vehicle: Vehicle | null }>({ open: false, vehicle: null });
  const [tab, setTab] = useState<"jobs" | "quotes" | "invoices" | "documents">("jobs");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (error && !data) {
    return <EmptyState title="Customer not found" description="They may have been removed." action={<Button href="/app/customers">Back to customers</Button>} />;
  }
  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const { customer: c } = data;
  const geo = (c as Customer & { geo?: GeoPoint | null }).geo ?? null;

  async function requestReview() {
    setRequesting(true);
    try {
      await api.post("/reviews/request", { customer: id });
      toast.success(`Review request sent to ${c.firstName}`);
      invalidate("/reviews", "/messages");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setRequesting(false);
    }
  }
  const name = customerName(c);
  const openBalance = (data.invoices ?? []).filter((i) => i.status !== "void").reduce((s, i) => s + (i.totals?.balance ?? 0), 0);

  async function updateCustomer(patch: Partial<Customer>, msg?: string) {
    if (!data) return;
    const prev = data;
    mutate({ ...data, customer: { ...data.customer, ...patch } });
    try {
      const updated = await api.patch<Customer>(`/customers/${id}`, patch);
      mutate((d) => (d ? { ...d, customer: updated } : d));
      invalidate("/customers");
      if (msg) toast.success(msg);
      return true;
    } catch (e) {
      mutate(prev);
      toast.error(errorMessage(e));
      return false;
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api.delete(`/customers/${id}`);
      invalidate("/customers");
      toast.success(`${name} removed`);
      router.push("/app/customers");
    } catch (e) {
      toast.error(errorMessage(e));
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        back={{ href: "/app/customers", label: "Customers" }}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={name} size={40} />
            {name}
          </span>
        }
        description={`Customer since ${formatDate(c.createdAt)} · via ${titleCase(c.source)}${c.company ? ` · ${c.company}` : ""}`}
        actions={
          <>
            <Button size="sm" variant="secondary" href={`/app/messages?customer=${id}`}>
              <MessageSquare className="size-4" /> Message
            </Button>
            <Button size="sm" variant="secondary" href={`/app/quotes/new?customer=${id}`}>
              <FilePlus2 className="size-4" /> Quote
            </Button>
            {can("reviews") && (
              <Button size="sm" variant="secondary" onClick={requestReview} loading={requesting} disabled={!c.phone && !c.email}>
                <MessageSquareHeart className="size-4" /> Request review
              </Button>
            )}
            <Button size="sm" href={`/app/jobs?new=1&customer=${id}`}>
              <Wrench className="size-4" /> New job
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Lifetime value" value={formatMoney(c.lifetimeValue, "USD", true)} />
        <StatCard label="Visits" value={c.visits} hint={c.lastVisitAt ? `Last ${relativeTime(c.lastVisitAt)}` : "No visits yet"} />
        <StatCard label="Loyalty points" value={formatNumber(c.loyaltyPoints)} icon={<Star className="size-4 text-warning" />} />
        <StatCard label="Open balance" value={formatMoney(openBalance, "USD", true)} hint={openBalance > 0 ? "Awaiting payment" : "All settled"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-5">
          <Glass className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Vehicles</h2>
              <Button size="xs" variant="secondary" onClick={() => setVehicleModal({ open: true, vehicle: null })}>
                <Plus className="size-3.5" /> Add vehicle
              </Button>
            </div>
            {(data.vehicles ?? []).length === 0 ? (
              <p className="rounded-2xl border border-dashed border-ink/10 py-8 text-center text-sm text-ink-4">No vehicles on file.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.vehicles.map((v) => (
                  <div key={v._id} className="group relative flex items-center gap-3 rounded-2xl border border-ink/[0.07] bg-ink/[0.03] p-3.5 transition hover:border-ink/15">
                    <span className="glass flex size-11 shrink-0 items-center justify-center rounded-xl text-aqua-soft">
                      <Car className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{vehicleLabel(v)}</p>
                      <p className="truncate text-xs text-ink-4">
                        {[v.color, v.plate, v.vin && `VIN …${v.vin.slice(-6)}`].filter(Boolean).join(" · ") || titleCase(v.type)}
                      </p>
                    </div>
                    <Badge>{v.size}</Badge>
                    <button
                      onClick={() => setVehicleModal({ open: true, vehicle: v })}
                      className="rounded-full p-1.5 text-ink-4 opacity-0 transition group-hover:opacity-100 hover:bg-ink/10 hover:text-ink focus:opacity-100"
                      aria-label={`Edit ${vehicleLabel(v)}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Glass>

          <Glass className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">History</h2>
              <Segmented
                size="sm"
                value={tab}
                onChange={setTab}
                options={[
                  { value: "jobs", label: `Jobs ${data.jobs?.length ?? 0}` },
                  { value: "quotes", label: `Quotes ${data.quotes?.length ?? 0}` },
                  { value: "invoices", label: `Invoices ${data.invoices?.length ?? 0}` },
                  { value: "documents", label: "Docs" },
                ]}
              />
            </div>
            <ul className="divide-y divide-ink/[0.05]">
              {tab === "jobs" &&
                (data.jobs ?? []).map((j) => (
                  <HistoryRow key={j._id} href={`/app/jobs/${j._id}`} ref_={`#${j.number}`} title={j.title} meta={formatDate(j.scheduledStart ?? j.createdAt)} badge={<StageBadge stage={j.stage} />} amount={j.totals?.total} />
                ))}
              {tab === "quotes" &&
                (data.quotes ?? []).map((q) => (
                  <HistoryRow key={q._id} href={`/app/quotes/${q._id}`} ref_={`Q-${q.number}`} title={q.title} meta={formatDate(q.createdAt)} badge={<QuoteStatusBadge status={q.status} />} amount={q.totals?.total} />
                ))}
              {tab === "invoices" &&
                (data.invoices ?? []).map((i) => (
                  <HistoryRow key={i._id} href={`/app/invoices/${i._id}`} ref_={`INV-${i.number}`} title={`Balance ${formatMoney(i.totals?.balance)}`} meta={formatDate(i.createdAt)} badge={<InvoiceStatusBadge status={i.status} />} amount={i.totals?.total} />
                ))}
            </ul>
            {tab === "documents" && <DocumentsPanel customerId={id} bare />}
            {((tab === "jobs" && !data.jobs?.length) || (tab === "quotes" && !data.quotes?.length) || (tab === "invoices" && !data.invoices?.length)) && (
              <p className="py-8 text-center text-sm text-ink-4">Nothing here yet.</p>
            )}
          </Glass>
        </div>

        <div className="space-y-5">
          <Glass className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Profile</h2>
              <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            </div>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2.5 text-ink-2">
                <Phone className="size-4 text-ink-4" />
                {c.phone ? <a href={`tel:${c.phone}`} className="hover:text-ink">{c.phone}</a> : <span className="text-ink-4">No phone</span>}
              </li>
              <li className="flex items-center gap-2.5 text-ink-2">
                <Mail className="size-4 text-ink-4" />
                {c.email ? <a href={`mailto:${c.email}`} className="truncate hover:text-ink">{c.email}</a> : <span className="text-ink-4">No email</span>}
              </li>
              <li className="flex items-start gap-2.5 text-ink-2">
                <MapPin className="mt-0.5 size-4 text-ink-4" />
                {c.address || <span className="text-ink-4">No address</span>}
                {geo && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto shrink-0 text-xs text-aqua-soft hover:text-ink"
                    title={`${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}`}
                  >
                    Map ↗
                  </a>
                )}
              </li>
            </ul>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-ink/[0.04] px-3 py-2.5 text-xs text-ink-2">
              Marketing messages
              <Switch checked={c.marketingOptIn} onChange={(v) => updateCustomer({ marketingOptIn: v }, v ? "Opted in" : "Opted out")} label="Marketing opt-in" />
            </div>
            {c.notes && <p className="mt-4 rounded-2xl bg-ink/[0.03] p-3 text-sm whitespace-pre-wrap text-ink-3">{c.notes}</p>}
          </Glass>

          <TagsEditor tags={c.tags ?? []} onSave={(tags) => updateCustomer({ tags })} />

          <Glass className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Messages</h2>
              <Link href={`/app/messages?customer=${id}`} className="text-xs text-aqua-soft hover:text-ink">
                Open inbox →
              </Link>
            </div>
            {(data.messages ?? []).length === 0 ? (
              <p className="text-sm text-ink-4">No conversation yet.</p>
            ) : (
              <ul className="space-y-2">
                {data.messages.slice(0, 4).map((m) => (
                  <li key={m._id} className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-xs",
                        m.direction === "outbound" ? "rounded-br-md bg-iris/25 text-ink" : "rounded-bl-md bg-ink/[0.07] text-ink-2",
                      )}
                    >
                      <p className="line-clamp-3">{m.body}</p>
                      <p className="mt-1 text-[10px] text-ink-4">
                        {m.channel.toUpperCase()} · {relativeTime(m.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Glass>

          {(data.certificates ?? []).length > 0 && (
            <Glass className="p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="size-4 text-success" /> Warranty certificates
              </h2>
              <ul className="space-y-2">
                {data.certificates.map((cert) => (
                  <li key={cert._id} className="flex items-center justify-between gap-3 rounded-xl bg-ink/[0.03] px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">{cert.product}</p>
                      <p className="text-[11px] text-ink-4">
                        {cert.code} · {cert.expiresAt ? `until ${formatDate(cert.expiresAt)}` : "Lifetime"}
                      </p>
                    </div>
                    <Badge tone={cert.status === "active" ? "success" : "neutral"}>{cert.status}</Badge>
                  </li>
                ))}
              </ul>
            </Glass>
          )}

          {(data.memberships ?? []).length > 0 && (
            <Glass className="p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Crown className="size-4 text-warning" /> Memberships
              </h2>
              <ul className="space-y-2">
                {data.memberships.map((m) => (
                  <li key={m._id} className="flex items-center justify-between gap-3 rounded-xl bg-ink/[0.03] px-3 py-2">
                    <div>
                      <p className="text-sm text-ink">{m.plan?.name}</p>
                      <p className="text-[11px] text-ink-4">
                        {formatMoney(m.plan?.price)}/{m.plan?.interval} · next {formatDate(m.nextBillingAt)}
                      </p>
                    </div>
                    <Badge tone={m.status === "active" ? "success" : m.status === "paused" ? "warning" : "neutral"}>{m.status}</Badge>
                  </li>
                ))}
              </ul>
            </Glass>
          )}

          {isManager && (
            <Button variant="danger" size="sm" className="w-full" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" /> Delete customer
            </Button>
          )}
        </div>
      </div>

      <EditCustomerModal
        open={editing}
        customer={c}
        onClose={() => setEditing(false)}
        onSave={async (patch) => {
          if (await updateCustomer(patch, "Profile updated")) setEditing(false);
        }}
      />
      <VehicleCreateModal
        open={vehicleModal.open}
        customerId={id}
        vehicle={vehicleModal.vehicle}
        onClose={() => setVehicleModal({ open: false, vehicle: null })}
        onCreated={() => {
          setVehicleModal({ open: false, vehicle: null });
          void refresh();
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        loading={deleting}
        danger
        title={`Delete ${name}?`}
        description="Their vehicles and contact details will be removed. Past invoices stay in your books."
        confirmLabel="Delete customer"
      />
    </div>
  );
}

function HistoryRow({
  href,
  ref_,
  title,
  meta,
  badge,
  amount,
}: {
  href: string;
  ref_: string;
  title: string;
  meta: string;
  badge: React.ReactNode;
  amount?: number;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-ink/[0.04]">
        <span className="w-16 shrink-0 font-mono text-[11px] text-ink-4">{ref_}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ink">{title}</span>
          <span className="text-[11px] text-ink-4">{meta}</span>
        </span>
        <span className="hidden sm:block">{badge}</span>
        <span className="w-20 text-right text-sm font-medium tabular-nums">{formatMoney(amount, "USD", true)}</span>
      </Link>
    </li>
  );
}

function TagsEditor({ tags, onSave }: { tags: string[]; onSave: (tags: string[]) => void }) {
  const [value, setValue] = useState("");
  return (
    <Glass className="p-5">
      <h2 className="mb-3 text-sm font-semibold">Tags</h2>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full border border-iris/30 bg-iris/10 py-0.5 pr-1 pl-2.5 text-xs text-iris-soft">
            #{t}
            <button onClick={() => onSave(tags.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-ink/10" aria-label={`Remove tag ${t}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = value.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-");
            if (t && !tags.includes(t)) onSave([...tags, t]);
            setValue("");
          }}
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="+ add tag"
            aria-label="Add tag"
            className="h-6 w-24 rounded-full bg-transparent px-2 text-xs text-ink placeholder:text-ink-4 focus:bg-ink/[0.06] focus:outline-none"
          />
        </form>
      </div>
    </Glass>
  );
}

function EditCustomerModal({
  open,
  customer,
  onClose,
  onSave,
}: {
  open: boolean;
  customer: Customer;
  onClose: () => void;
  onSave: (patch: Partial<Customer>) => Promise<void>;
}) {
  const [form, setForm] = useState(customer);
  const [saving, setSaving] = useState(false);
  useOnOpen(open, () => setForm(customer));
  const set = <K extends keyof Customer>(k: K, v: Customer[K]) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit customer"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={async () => {
              setSaving(true);
              await onSave({
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                phone: form.phone,
                address: form.address,
                company: form.company,
                source: form.source,
                notes: form.notes,
              });
              setSaving(false);
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name">
          <Input value={form.firstName ?? ""} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label="Last name">
          <Input value={form.lastName ?? ""} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input type="tel" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Company">
          <Input value={form.company ?? ""} onChange={(e) => set("company", e.target.value)} />
        </Field>
        <Field label="Source">
          <Select value={form.source} onChange={(e) => set("source", e.target.value as CustomerSource)}>
            {["website", "referral", "google", "instagram", "facebook", "walk-in", "booking", "repeat", "other"].map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { Check, Crown, MoreHorizontal, Pause, Pencil, Play, Plus, Repeat, Users, XCircle, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Customer, Membership, MembershipPlan, Paginated, Vehicle } from "@/lib/types";
import { customerName, vehicleLabel } from "@/lib/domain";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { Badge, Button, EmptyState, Field, Glass, Input, Menu, Modal, Select, Skeleton, Switch, Textarea, TiltCard } from "@/components/spatial";
import { PageHeader, PlanGate, StatCard, Table, Td, Th } from "@/components/app/ui";
import { CustomerPicker, VehiclePicker } from "@/components/app/pickers";

const listOf = <T,>(d: T[] | Paginated<T> | undefined) => (Array.isArray(d) ? d : (d?.items ?? []));
const monthly = (p: MembershipPlan) => (p.interval === "year" ? p.price / 12 : p.price);
const statusTone = { active: "success", paused: "warning", cancelled: "neutral" } as const;

export default function MembershipsPage() {
  return (
    <PlanGate feature="memberships">
      <Memberships />
    </PlanGate>
  );
}

function Memberships() {
  const { data: plansData, loading: plansLoading } = useApi<MembershipPlan[] | Paginated<MembershipPlan>>("/memberships/plans");
  const { data: membersData, loading: membersLoading } = useApi<Paginated<Membership> | Membership[]>("/memberships", { pageSize: 200 });
  const plans = listOf(plansData);
  const members = listOf(membersData);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | "new" | null>(null);
  const [enrolling, setEnrolling] = useState<MembershipPlan | null | "any">(null);

  const active = members.filter((m) => m.status === "active");
  const mrr = active.reduce((s, m) => s + (m.plan ? monthly(m.plan) : 0), 0);
  const counts: Record<string, number> = {};
  for (const m of active) if (m.plan) counts[m.plan._id] = (counts[m.plan._id] ?? 0) + 1;

  async function setStatus(m: Membership, status: Membership["status"]) {
    try {
      await api.patch(`/memberships/${m._id}`, { status });
      invalidate("/memberships");
      toast.success(`Membership ${status === "active" ? "resumed" : status}`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader
        title="Memberships"
        description="Recurring wash clubs and maintenance plans that bill themselves and keep bays full."
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditingPlan("new")}>
              <Plus className="size-4" /> New plan
            </Button>
            <Button onClick={() => setEnrolling("any")} disabled={!plans.length}>
              <Users className="size-4" /> Enroll member
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Monthly recurring revenue" value={formatMoney(mrr)} icon={<DollarSign className="size-4" />} hint={`${formatMoney(mrr * 12)} annualized`} />
        <StatCard label="Active members" value={active.length} icon={<Users className="size-4" />} hint={`${members.filter((m) => m.status === "paused").length} paused`} />
        <StatCard
          label="Avg. revenue per member"
          value={formatMoney(active.length ? mrr / active.length : 0)}
          icon={<Repeat className="size-4" />}
          hint="per month"
        />
      </div>

      <h2 className="mb-3 px-1 text-sm font-semibold text-ink-2">Plans</h2>
      {plansLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <Glass>
          <EmptyState
            icon={<Crown className="size-7" />}
            title="Create your first membership plan"
            description="A $59/mo unlimited maintenance wash club typically lifts retention 3× for coating clients."
            action={
              <Button onClick={() => setEditingPlan("new")}>
                <Plus className="size-4" /> Create plan
              </Button>
            }
          />
        </Glass>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => {
            const color = p.color || "#ff6a2b";
            return (
              <TiltCard key={p._id} max={5}>
                <div
                  className={cn("rim relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-ink/12 p-6", !p.active && "opacity-60")}
                  style={{ background: `linear-gradient(150deg, ${color}38 0%, rgb(255 255 255 / 0.04) 45%, rgb(255 255 255 / 0.02) 100%)` }}
                >
                  <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full blur-3xl" style={{ background: `${color}55` }} />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.18em] uppercase" style={{ color }}>
                        {p.active ? "Active plan" : "Archived"}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold tracking-tight text-ink">{p.name}</h3>
                    </div>
                    <button onClick={() => setEditingPlan(p)} className="rounded-full p-2 text-ink-3 hover:bg-ink/10 hover:text-ink" aria-label={`Edit ${p.name}`}>
                      <Pencil className="size-4" />
                    </button>
                  </div>
                  <p className="relative mt-4">
                    <span className="text-4xl font-semibold tracking-tight text-ink tabular-nums">{formatMoney(p.price).replace(".00", "")}</span>
                    <span className="text-sm text-ink-3"> / {p.interval}</span>
                  </p>
                  {p.discountPercent > 0 && <p className="relative mt-1 text-xs text-success">{p.discountPercent}% off all other services</p>}
                  <ul className="relative mt-5 flex-1 space-y-2">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-sm text-ink-2">
                        <Check className="mt-0.5 size-4 shrink-0" style={{ color }} /> {perk}
                      </li>
                    ))}
                  </ul>
                  <div className="relative mt-6 flex items-center justify-between">
                    <span className="text-xs text-ink-3">{counts[p._id] ?? 0} active members</span>
                    <Button size="sm" variant="secondary" onClick={() => setEnrolling(p)} disabled={!p.active}>
                      <Plus className="size-3.5" /> Enroll
                    </Button>
                  </div>
                </div>
              </TiltCard>
            );
          })}
        </div>
      )}

      <h2 className="mt-8 mb-3 px-1 text-sm font-semibold text-ink-2">Members</h2>
      <Glass className="overflow-hidden">
        {membersLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyState icon={<Users className="size-7" />} title="No members yet" description="Enroll your best customers and watch MRR compound." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Plan</Th>
                <Th>Vehicle</Th>
                <Th>Status</Th>
                <Th>Member since</Th>
                <Th>Next billing</Th>
                <Th className="text-right">Visits used</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m._id} className="hover:bg-ink/[0.03]">
                  <Td className="font-medium text-ink">{customerName(m.customer)}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: m.plan?.color || "#ff6a2b" }} />
                      {m.plan?.name ?? "—"}
                      <span className="text-xs text-ink-4">{m.plan ? `${formatMoney(m.plan.price)}/${m.plan.interval}` : ""}</span>
                    </span>
                  </Td>
                  <Td>{m.vehicle ? vehicleLabel(m.vehicle) : "Any vehicle"}</Td>
                  <Td>
                    <Badge tone={statusTone[m.status]} dot>
                      {m.status}
                    </Badge>
                  </Td>
                  <Td>{formatDate(m.startedAt)}</Td>
                  <Td>{m.status === "active" ? formatDate(m.nextBillingAt) : "—"}</Td>
                  <Td className="text-right tabular-nums">{m.washesUsed ?? 0}</Td>
                  <Td className="text-right">
                    {m.status !== "cancelled" && (
                      <Menu
                        trigger={
                          <button className="rounded-full p-1.5 text-ink-4 hover:bg-ink/10 hover:text-ink" aria-label="Membership actions">
                            <MoreHorizontal className="size-4" />
                          </button>
                        }
                        items={[
                          m.status === "active"
                            ? { label: "Pause", icon: <Pause className="size-4" />, onClick: () => void setStatus(m, "paused") }
                            : { label: "Resume", icon: <Play className="size-4" />, onClick: () => void setStatus(m, "active") },
                          { label: "Cancel membership", icon: <XCircle className="size-4" />, danger: true, onClick: () => void setStatus(m, "cancelled") },
                        ]}
                      />
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Glass>

      <PlanModal plan={editingPlan} onClose={() => setEditingPlan(null)} />
      <EnrollModal open={!!enrolling} plans={plans.filter((p) => p.active)} initialPlan={enrolling && enrolling !== "any" ? enrolling : null} onClose={() => setEnrolling(null)} />
    </>
  );
}

const COLORS = ["#ff6a2b", "#45c4ff", "#f472b6", "#fb923c", "#34d399", "#fbbf24"];

function PlanModal({ plan, onClose }: { plan: MembershipPlan | "new" | null; onClose: () => void }) {
  const isNew = plan === "new";
  const [form, setForm] = useState({ name: "", price: "59", interval: "month" as "month" | "year", perks: "", discountPercent: "10", color: COLORS[0]!, active: true });
  const [last, setLast] = useState<typeof plan>(null);
  const [saving, setSaving] = useState(false);

  if (plan !== last) {
    setLast(plan);
    if (plan && plan !== "new")
      setForm({
        name: plan.name,
        price: String(plan.price),
        interval: plan.interval,
        perks: plan.perks.join("\n"),
        discountPercent: String(plan.discountPercent ?? 0),
        color: plan.color || COLORS[0]!,
        active: plan.active,
      });
    else if (plan === "new")
      setForm({ name: "", price: "59", interval: "month", perks: "Unlimited maintenance washes\nPriority booking\nFree interior wipe-down monthly", discountPercent: "10", color: COLORS[0]!, active: true });
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        price: Number(form.price) || 0,
        interval: form.interval,
        perks: form.perks.split("\n").map((s) => s.trim()).filter(Boolean),
        discountPercent: Number(form.discountPercent) || 0,
        color: form.color,
        active: form.active,
      };
      if (isNew) await api.post("/memberships/plans", body);
      else if (plan) await api.patch(`/memberships/plans/${plan._id}`, body);
      invalidate("/memberships");
      toast.success(isNew ? "Plan created" : "Plan updated");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!plan}
      onClose={onClose}
      title={isNew ? "New membership plan" : "Edit plan"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!form.name}>
            Save plan
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Plan name" className="col-span-2">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Coating Care Club" autoFocus />
        </Field>
        <Field label="Price ($)">
          <Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </Field>
        <Field label="Billing interval">
          <Select value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value as "month" | "year" })}>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </Select>
        </Field>
        <Field label="Perks (one per line)" className="col-span-2">
          <Textarea value={form.perks} onChange={(e) => setForm({ ...form, perks: e.target.value })} className="min-h-28" />
        </Field>
        <Field label="Member discount on services (%)">
          <Input type="number" min={0} max={100} value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
        </Field>
        <Field label="Accent color">
          <div className="flex h-11 items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className={cn("size-7 rounded-full transition", form.color === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-void" : "")}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </Field>
        <label className="col-span-2 flex items-center gap-3 text-sm text-ink-2">
          <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Plan active" /> Available for new enrollments
        </label>
      </div>
    </Modal>
  );
}

function EnrollModal({ open, plans, initialPlan, onClose }: { open: boolean; plans: MembershipPlan[]; initialPlan: MembershipPlan | null; onClose: () => void }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [planId, setPlanId] = useState("");
  const [saving, setSaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPlanId(initialPlan?._id ?? plans[0]?._id ?? "");
      setCustomer(null);
      setVehicle(null);
    }
  }
  const plan = plans.find((p) => p._id === planId);

  async function enroll() {
    if (!customer || !planId) return;
    setSaving(true);
    try {
      await api.post("/memberships", { customer: customer._id, vehicle: vehicle?._id, plan: planId });
      invalidate("/memberships");
      toast.success(`${customerName(customer)} enrolled in ${plan?.name}`);
      onClose();
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
      title="Enroll a member"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={enroll} loading={saving} disabled={!customer || !planId}>
            Start membership
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Plan">
          <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            {plans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} — {formatMoney(p.price)}/{p.interval}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Customer">
          <CustomerPicker
            value={customer}
            onChange={(c) => {
              setCustomer(c);
              setVehicle(null);
            }}
          />
        </Field>
        <Field label="Vehicle (optional)" hint="Leave empty to cover any vehicle on the account.">
          <VehiclePicker customerId={customer?._id ?? null} value={vehicle} onChange={setVehicle} />
        </Field>
        {plan && (
          <p className="rounded-2xl bg-ink/[0.04] px-4 py-3 text-xs text-ink-3">
            First charge of <span className="font-semibold text-ink">{formatMoney(plan.price)}</span> today, then every {plan.interval} until cancelled.
          </p>
        )}
      </div>
    </Modal>
  );
}

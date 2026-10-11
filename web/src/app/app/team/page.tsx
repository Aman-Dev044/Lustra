"use client";

import { useMemo, useState } from "react";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek, subWeeks } from "date-fns";
import { Download, Mail, MoreHorizontal, Pencil, Phone, Plus, UserCheck, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { EarningsRow, Role, User } from "@/lib/types";
import { cn, formatDate, formatMoney, relativeTime, titleCase } from "@/lib/utils";
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, Field, Glass, Input, Menu, Modal, Segmented, Select, Skeleton } from "@/components/spatial";
import { PageHeader, Table, Td, Th } from "@/components/app/ui";
import { useAuth } from "@/components/app/auth-provider";

const roleTone = { owner: "plasma", admin: "iris", manager: "aqua", technician: "neutral" } as const;
type Period = "this_week" | "last_week" | "this_month";

function periodRange(p: Period) {
  const now = new Date();
  if (p === "this_week") return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
  if (p === "last_week") {
    const d = subWeeks(now, 1);
    return { from: startOfWeek(d, { weekStartsOn: 1 }), to: endOfWeek(d, { weekStartsOn: 1 }) };
  }
  return { from: startOfMonth(now), to: endOfMonth(now) };
}

export default function TeamPage() {
  const { user: me, can, isManager } = useAuth();
  const { data: team, loading } = useApi<User[]>("/team");
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState<Period>("this_week");
  const range = useMemo(() => periodRange(period), [period]);
  const { data: earnings, loading: earningsLoading } = useApi<EarningsRow[]>(isManager ? "/earnings" : null, {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  });
  const showCommission = can("commissions");
  const canEdit = me.role === "owner" || me.role === "admin";

  const totals = (earnings ?? []).reduce(
    (t, r) => ({ hours: t.hours + r.hours, wages: t.wages + r.wages, tips: t.tips + r.tips, commission: t.commission + r.commission, total: t.total + r.total, jobs: t.jobs + r.jobs }),
    { hours: 0, wages: 0, tips: 0, commission: 0, total: 0, jobs: 0 },
  );

  async function setActive(u: User, active: boolean) {
    setBusy(true);
    try {
      if (active) await api.patch(`/team/${u._id}`, { active: true });
      else await api.delete(`/team/${u._id}`);
      invalidate("/team", "/earnings");
      toast.success(`${u.name} ${active ? "reactivated" : "deactivated"}`);
      setDeactivating(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = ["Name", "Role", "Hours", "Wages", "Tips", ...(showCommission ? ["Commission"] : []), "Total", "Jobs"];
    const rows = (earnings ?? []).map((r) => [
      r.user.name,
      r.user.role,
      r.hours.toFixed(2),
      r.wages.toFixed(2),
      r.tips.toFixed(2),
      ...(showCommission ? [r.commission.toFixed(2)] : []),
      r.total.toFixed(2),
      String(r.jobs),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lustra-payroll-${range.from.toISOString().slice(0, 10)}-to-${range.to.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Team"
        description="Unlimited seats on every plan. Roles, pay rates and payroll-ready earnings in one place."
        actions={
          canEdit && (
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Invite teammate
            </Button>
          )
        }
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : !team?.length ? (
        <Glass>
          <EmptyState icon={<Users className="size-7" />} title="Just you so far" description="Invite technicians to assign jobs, track time and pay commissions." />
        </Glass>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {team.map((u) => (
            <Glass key={u._id} className={cn("relative p-5 transition hover:-translate-y-0.5", !u.active && "opacity-50")}>
              <div className="flex items-start justify-between">
                <Avatar name={u.name} size={48} />
                {canEdit && u._id !== me._id && u.role !== "owner" && (
                  <Menu
                    trigger={
                      <button className="rounded-full p-1.5 text-ink-4 hover:bg-ink/10 hover:text-ink" aria-label={`Actions for ${u.name}`}>
                        <MoreHorizontal className="size-4" />
                      </button>
                    }
                    items={[
                      { label: "Edit", icon: <Pencil className="size-4" />, onClick: () => setEditing(u) },
                      u.active
                        ? { label: "Deactivate", icon: <UserMinus className="size-4" />, danger: true, onClick: () => setDeactivating(u) }
                        : { label: "Reactivate", icon: <UserCheck className="size-4" />, onClick: () => void setActive(u, true) },
                    ]}
                  />
                )}
              </div>
              <p className="mt-3 truncate font-semibold text-ink">
                {u.name} {u._id === me._id && <span className="text-xs font-normal text-ink-4">(you)</span>}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={roleTone[u.role]}>{titleCase(u.role)}</Badge>
                {!u.active && <Badge tone="danger">Inactive</Badge>}
              </div>
              <div className="mt-4 space-y-1 text-xs text-ink-3">
                <p className="flex items-center gap-2 truncate">
                  <Mail className="size-3.5 shrink-0" /> {u.email}
                </p>
                {u.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="size-3.5" /> {u.phone}
                  </p>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-ink/[0.06] pt-3 text-xs">
                <div>
                  <p className="text-ink-4">Hourly</p>
                  <p className="text-ink tabular-nums">{u.hourlyRate ? formatMoney(u.hourlyRate) : "—"}</p>
                </div>
                <div>
                  <p className="text-ink-4">Commission</p>
                  <p className="text-ink tabular-nums">{u.commissionPercent ? `${u.commissionPercent}%` : "—"}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-ink-4">{u.lastLoginAt ? `Active ${relativeTime(u.lastLoginAt)}` : "Hasn't logged in yet"}</p>
            </Glass>
          ))}
        </div>
      )}

      {isManager && (
        <Glass className="mt-6 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-ink/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Earnings & payroll</h2>
              <p className="text-xs text-ink-4">
                {formatDate(range.from)} – {formatDate(range.to)} · hourly wages, tips{showCommission ? " and commissions" : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                size="sm"
                value={period}
                onChange={setPeriod}
                options={[
                  { value: "this_week", label: "This week" },
                  { value: "last_week", label: "Last week" },
                  { value: "this_month", label: "This month" },
                ]}
              />
              <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!earnings?.length}>
                <Download className="size-4" /> CSV
              </Button>
            </div>
          </div>
          {earningsLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : !earnings?.length ? (
            <p className="px-5 py-10 text-center text-sm text-ink-4">No clocked time in this period.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Teammate</Th>
                  <Th className="text-right">Hours</Th>
                  <Th className="text-right">Wages</Th>
                  <Th className="text-right">Tips</Th>
                  {showCommission && <Th className="text-right">Commission</Th>}
                  <Th className="text-right">Jobs</Th>
                  <Th className="text-right">Total pay</Th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((r) => (
                  <tr key={r.user._id} className="hover:bg-ink/[0.03]">
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <Avatar name={r.user.name} size={28} />
                        <span className="text-ink">{r.user.name}</span>
                      </span>
                    </Td>
                    <Td className="text-right tabular-nums">{r.hours.toFixed(1)}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(r.wages)}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(r.tips)}</Td>
                    {showCommission && <Td className="text-right tabular-nums">{formatMoney(r.commission)}</Td>}
                    <Td className="text-right tabular-nums">{r.jobs}</Td>
                    <Td className="text-right font-semibold text-ink tabular-nums">{formatMoney(r.total)}</Td>
                  </tr>
                ))}
                <tr className="bg-ink/[0.03]">
                  <Td className="font-semibold text-ink">Total</Td>
                  <Td className="text-right font-semibold tabular-nums">{totals.hours.toFixed(1)}</Td>
                  <Td className="text-right font-semibold tabular-nums">{formatMoney(totals.wages)}</Td>
                  <Td className="text-right font-semibold tabular-nums">{formatMoney(totals.tips)}</Td>
                  {showCommission && <Td className="text-right font-semibold tabular-nums">{formatMoney(totals.commission)}</Td>}
                  <Td className="text-right font-semibold tabular-nums">{totals.jobs}</Td>
                  <Td className="text-spectral text-right text-base font-semibold tabular-nums">{formatMoney(totals.total)}</Td>
                </tr>
              </tbody>
            </Table>
          )}
          {!showCommission && (
            <p className="border-t border-ink/[0.06] px-5 py-3 text-xs text-ink-4">Commission tracking is available on the Enterprise plan.</p>
          )}
        </Glass>
      )}

      <MemberModal member={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        onConfirm={() => deactivating && void setActive(deactivating, false)}
        loading={busy}
        danger
        title={`Deactivate ${deactivating?.name ?? ""}?`}
        description="They'll lose access immediately. Their history, time entries and earnings are kept."
        confirmLabel="Deactivate"
      />
    </>
  );
}

function MemberModal({ member, onClose }: { member: User | "new" | null; onClose: () => void }) {
  const isNew = member === "new";
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "technician" as Role, password: "", hourlyRate: "22", commissionPercent: "0" });
  const [last, setLast] = useState<typeof member>(null);
  const [saving, setSaving] = useState(false);

  if (member !== last) {
    setLast(member);
    if (member && member !== "new")
      setForm({
        name: member.name,
        email: member.email,
        phone: member.phone ?? "",
        role: member.role,
        password: "",
        hourlyRate: String(member.hourlyRate ?? 0),
        commissionPercent: String(member.commissionPercent ?? 0),
      });
    else if (member === "new") setForm({ name: "", email: "", phone: "", role: "technician", password: "", hourlyRate: "22", commissionPercent: "0" });
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        hourlyRate: Number(form.hourlyRate) || 0,
        commissionPercent: Number(form.commissionPercent) || 0,
        ...(form.password ? { password: form.password } : {}),
      };
      if (isNew) await api.post("/team", body);
      else if (member) await api.patch(`/team/${member._id}`, body);
      invalidate("/team", "/earnings");
      toast.success(isNew ? `${form.name} added to your team` : "Teammate updated");
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!member}
      onClose={onClose}
      title={isNew ? "Invite teammate" : `Edit ${(member as User | null)?.name ?? ""}`}
      description={isNew ? "They can log in right away with the temporary password you set." : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!form.name || !form.email || (isNew && form.password.length < 8)}>
            {isNew ? "Send invite" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name" className="col-span-2">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="technician">Technician</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <Field label={isNew ? "Temporary password" : "Reset password"} hint={isNew ? "At least 8 characters" : "Leave blank to keep current"}>
          <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
        </Field>
        <Field label="Hourly rate ($)">
          <Input type="number" min={0} step="0.5" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
        </Field>
        <Field label="Commission (%)">
          <Input type="number" min={0} max={100} value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

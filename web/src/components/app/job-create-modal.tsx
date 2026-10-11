"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Customer, Job, LineItem, Priority, Recurrence, User, Vehicle } from "@/lib/types";
import { priorityMeta, vehicleLabel } from "@/lib/domain";
import { cn, formatMoney, toDateTimeInput } from "@/lib/utils";
import { Avatar, Button, Field, Input, Modal, Select, Switch, Textarea } from "@/components/spatial";
import { Truck } from "lucide-react";
import { CustomerPicker, VehiclePicker } from "./pickers";
import { LineItemsEditor, computeTotals } from "./line-items-editor";
import { useOnOpen } from "@/lib/hooks/use-list-state";
import { serializeLineItems } from "@/lib/line-items";
import { useAuth } from "./auth-provider";
import { RecurrenceEditor } from "./recurrence-editor";

export interface JobDraftDefaults {
  start?: Date | null;
  end?: Date | null;
  bay?: number;
  customerId?: string | null;
}

/** Shared "new job" sheet used by the jobs list, calendar and quick actions. */
export function JobCreateModal({
  open,
  onClose,
  onCreated,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (job: Job) => void;
  defaults?: JobDraftDefaults;
}) {
  const { shop } = useAuth();
  const { data: team } = useApi<User[]>(open ? "/team" : null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [bay, setBay] = useState(1);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>("normal");
  const [notes, setNotes] = useState("");
  const [mobile, setMobile] = useState(false);
  const [serviceAddress, setServiceAddress] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null);
  const [saving, setSaving] = useState(false);

  useOnOpen(open, () => {
    setCustomer(null);
    setVehicle(null);
    setTitle("");
    setItems([]);
    setStart(defaults?.start ? toDateTimeInput(defaults.start) : "");
    setEnd(defaults?.end ? toDateTimeInput(defaults.end) : "");
    setBay(defaults?.bay ?? 1);
    setAssignees([]);
    setPriority("normal");
    setNotes("");
    setMobile(shop.industry === "mobile");
    setServiceAddress("");
    setRecurrence(null);
  });

  const prefillCustomer = open ? defaults?.customerId : null;
  useEffect(() => {
    if (!prefillCustomer) return;
    let cancelled = false;
    api
      .get<Customer>(`/customers/${prefillCustomer}`)
      .then((c) => !cancelled && setCustomer(c))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [prefillCustomer]);

  // Without an explicit end, derive it from the services' durations.
  const duration = useMemo(() => items.reduce((s, i) => s + (i.durationMinutes ?? 0) * (i.qty || 1), 0), [items]);
  const effectiveEnd = end || (start && duration ? toDateTimeInput(new Date(new Date(start).getTime() + duration * 60000)) : "");

  const totals = computeTotals(items, 0, shop.taxRate);
  const autoTitle = items.map((i) => i.name).slice(0, 2).join(" + ");

  async function save() {
    if (!customer) return toast.error("Pick a customer");
    const end = effectiveEnd;
    if (start && end && new Date(end) <= new Date(start)) return toast.error("End must be after start");
    if (mobile && !(serviceAddress || customer.address)) return toast.error("Mobile jobs need a service address");
    if (recurrence && !start) return toast.error("Schedule the first visit to make the job repeat");
    setSaving(true);
    try {
      const job = await api.post<Job>("/jobs", {
        customer: customer._id,
        vehicle: vehicle?._id,
        title: title || autoTitle || "New job",
        lineItems: serializeLineItems(items),
        scheduledStart: start ? new Date(start).toISOString() : undefined,
        scheduledEnd: end ? new Date(end).toISOString() : undefined,
        stage: start ? "scheduled" : "lead",
        bay,
        assignees,
        priority,
        notes: notes || undefined,
        mobile,
        serviceAddress: mobile ? serviceAddress || customer.address || undefined : undefined,
        recurrence: recurrence ?? undefined,
      });
      invalidate("/jobs", "/analytics", "/customers");
      toast.success(`Job #${job.number} created`);
      onClose();
      onCreated?.(job);
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
      title="New job"
      description="Book the work, assign the crew, and the live board updates for everyone."
      size="lg"
      footer={
        <>
          <span className="mr-auto text-sm text-ink-3">
            Total <span className="font-semibold text-ink tabular-nums">{formatMoney(totals.total)}</span>
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Create job
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer">
          <CustomerPicker
            value={customer}
            onChange={(c) => {
              setCustomer(c);
              setVehicle(null);
              if (c?.address) setServiceAddress(c.address);
            }}
          />
        </Field>
        <Field label="Vehicle">
          <VehiclePicker customerId={customer?._id ?? null} value={vehicle} onChange={setVehicle} />
        </Field>
        <Field label="Job title" className="sm:col-span-2" hint={!title && autoTitle ? `Defaults to “${autoTitle}”` : undefined}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={vehicle ? `e.g. Ceramic coating — ${vehicleLabel(vehicle)}` : "e.g. Full detail + ceramic"}
          />
        </Field>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-2">Services</p>
          <LineItemsEditor items={items} onChange={setItems} size={vehicle?.size ?? "medium"} />
        </div>
        <Field label="Start">
          <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="End">
          <Input type="datetime-local" value={effectiveEnd} onChange={(e) => setEnd(e.target.value)} />
        </Field>
        <Field label="Bay">
          <Select value={bay} onChange={(e) => setBay(Number(e.target.value))}>
            {Array.from({ length: Math.max(1, shop.booking?.bays ?? 2) }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Bay {i + 1}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {(Object.keys(priorityMeta) as Priority[]).map((p) => (
              <option key={p} value={p}>
                {priorityMeta[p].label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-medium tracking-wide text-ink-2">Assign crew</p>
          <div className="flex flex-wrap gap-2">
            {(team ?? [])
              .filter((u) => u.active)
              .map((u) => {
                const on = assignees.includes(u._id);
                return (
                  <button
                    key={u._id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setAssignees((a) => (on ? a.filter((x) => x !== u._id) : [...a, u._id]))}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs transition",
                      on ? "border-aqua/50 bg-aqua/10 text-ink" : "border-ink/10 text-ink-3 hover:border-ink/20 hover:text-ink",
                    )}
                  >
                    <Avatar name={u.name} size={22} />
                    {u.name}
                  </button>
                );
              })}
            {team && team.length === 0 && <span className="text-xs text-ink-4">No team members yet.</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-ink/[0.07] bg-ink/[0.03] p-3.5 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Truck className="size-4 text-aqua-soft" aria-hidden />
              <div>
                <p className="text-sm text-ink">Mobile job</p>
                <p className="text-[11px] text-ink-4">Crew travels to the customer — added to route planning & on-my-way texts</p>
              </div>
            </div>
            <Switch
              checked={mobile}
              onChange={(v) => {
                setMobile(v);
                if (v && !serviceAddress && customer?.address) setServiceAddress(customer.address);
              }}
              label="Mobile job"
            />
          </div>
          {mobile && (
            <Field label="Service address" className="mt-3">
              <Input value={serviceAddress} onChange={(e) => setServiceAddress(e.target.value)} placeholder="Street, city, ZIP" autoComplete="street-address" />
            </Field>
          )}
        </div>
        <div className="sm:col-span-2">
          <RecurrenceEditor value={recurrence} onChange={setRecurrence} />
        </div>
        <Field label="Notes for the crew" className="sm:col-span-2">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Customer requests, keys, access codes…" />
        </Field>
      </div>
    </Modal>
  );
}

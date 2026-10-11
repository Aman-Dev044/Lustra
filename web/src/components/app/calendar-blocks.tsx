"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban, CalendarOff, CalendarPlus, Users, Wrench } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import { useOnOpen } from "@/lib/hooks/use-list-state";
import type { CalendarBlock, User } from "@/lib/types";
import { cn, toDateInput, toDateTimeInput } from "@/lib/utils";
import { Button, ConfirmDialog, Field, Input, Modal, Segmented, Select, Switch, Textarea } from "@/components/spatial";
import { useAuth } from "./auth-provider";

export type BlockKind = CalendarBlock["kind"];

export const blockMeta: Record<BlockKind, { label: string; color: string; icon: typeof Ban }> = {
  time_off: { label: "Time off", color: "#f472b6", icon: CalendarOff },
  meeting: { label: "Meeting", color: "#60a5fa", icon: Users },
  blocked: { label: "Blocked", color: "#94a3b8", icon: Ban },
};

/** Diagonal hatching over glass — reads as "unavailable" at a glance, distinct from solid job tiles. */
export const hatchStyle = (kind: BlockKind) => {
  const c = blockMeta[kind].color;
  return {
    background: `repeating-linear-gradient(135deg, ${c}2e 0 7px, ${c}0d 7px 14px), linear-gradient(180deg, rgb(255 255 255 / 0.04), rgb(255 255 255 / 0.01))`,
    borderColor: `${c}59`,
  };
};

export const blockUserName = (b: CalendarBlock) => (b.user && typeof b.user === "object" ? b.user.name : null);

export interface BlockDraft {
  block?: CalendarBlock | null;
  start?: Date;
  end?: Date;
  bay?: number;
  kind?: BlockKind;
}

/** Create / edit / delete a time-off, meeting or blocked period. */
export function BlockModal({ draft, onClose }: { draft: BlockDraft | null; onClose: () => void }) {
  const { shop } = useAuth();
  const open = !!draft;
  const { data: team } = useApi<User[]>(open ? "/team" : null);
  const [kind, setKind] = useState<BlockKind>("time_off");
  const [title, setTitle] = useState("");
  const [userId, setUserId] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [bay, setBay] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editing = draft?.block ?? null;

  useOnOpen(open, () => {
    const b = draft?.block;
    const s = b ? new Date(b.start) : (draft?.start ?? new Date());
    const e = b ? new Date(b.end) : (draft?.end ?? new Date(s.getTime() + 60 * 60000));
    setKind(b?.kind ?? draft?.kind ?? "time_off");
    setTitle(b?.title ?? "");
    setUserId(b?.user ? (typeof b.user === "string" ? b.user : b.user._id) : "");
    setAllDay(b?.allDay ?? false);
    setStart(toDateTimeInput(s));
    setEnd(toDateTimeInput(e));
    setBay(b?.bay ? String(b.bay) : draft?.bay ? String(draft.bay) : "");
    setNotes(b?.notes ?? "");
  });

  function range() {
    if (allDay) {
      const s = new Date(`${start.slice(0, 10)}T00:00`);
      const e = new Date(`${(end || start).slice(0, 10)}T23:59:59`);
      return { s, e };
    }
    return { s: new Date(start), e: new Date(end) };
  }

  async function save() {
    const { s, e } = range();
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return toast.error("Pick a start and end");
    if (e <= s) return toast.error("End must be after start");
    setSaving(true);
    const body = {
      kind,
      title: title.trim() || blockMeta[kind].label,
      user: userId || null,
      allDay,
      start: s.toISOString(),
      end: e.toISOString(),
      bay: bay ? Number(bay) : null,
      notes: notes || undefined,
    };
    try {
      if (editing) await api.patch(`/calendar/blocks/${editing._id}`, body);
      else await api.post("/calendar/blocks", body);
      invalidate("/calendar/blocks", "/analytics/capacity");
      toast.success(editing ? "Block updated" : `${blockMeta[kind].label} added`);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing) return;
    try {
      await api.delete(`/calendar/blocks/${editing._id}`);
      invalidate("/calendar/blocks", "/analytics/capacity");
      toast.success("Block removed");
      setConfirmDelete(false);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={editing ? "Edit block" : "Block time"}
        description="Time off, meetings and blocked bays keep online booking and the crew schedule honest."
        footer={
          <>
            {editing && (
              <Button variant="danger" size="sm" className="mr-auto" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? "Save" : "Add block"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Segmented
            value={kind}
            onChange={setKind}
            options={(Object.keys(blockMeta) as BlockKind[]).map((k) => {
              const Icon = blockMeta[k].icon;
              return {
                value: k,
                label: (
                  <>
                    <Icon className="size-3.5" style={{ color: blockMeta[k].color }} /> {blockMeta[k].label}
                  </>
                ),
              };
            })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" className="sm:col-span-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "meeting" ? "Weekly crew sync" : kind === "time_off" ? "Vacation" : "Bay maintenance"} />
            </Field>
            <Field label="Who">
              <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Whole shop</option>
                {(team ?? []).map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Bay">
              <Select value={bay} onChange={(e) => setBay(e.target.value)}>
                <option value="">All bays</option>
                {Array.from({ length: Math.max(1, shop.booking?.bays ?? 2) }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Bay {i + 1}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-center justify-between rounded-2xl bg-ink/[0.04] px-3 py-2.5 text-sm sm:col-span-2">
              All day
              <Switch checked={allDay} onChange={setAllDay} label="All day" />
            </div>
            <Field label="Start">
              {allDay ? (
                <Input type="date" value={start.slice(0, 10)} onChange={(e) => setStart(`${e.target.value}T00:00`)} />
              ) : (
                <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
              )}
            </Field>
            <Field label="End">
              {allDay ? (
                <Input type="date" value={(end || start).slice(0, 10)} min={toDateInput(start ? new Date(start) : undefined)} onChange={(e) => setEnd(`${e.target.value}T23:59`)} />
              ) : (
                <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
              )}
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-16" />
            </Field>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        danger
        title="Delete this block?"
        description="The time opens back up for jobs and online booking."
        confirmLabel="Delete"
      />
    </>
  );
}

/** Asks what an empty-slot click should create: a job or a block. */
export function SlotChooser({
  at,
  onClose,
  onJob,
  onBlock,
}: {
  at: Date | null;
  onClose: () => void;
  onJob: () => void;
  onBlock: (kind: BlockKind) => void;
}) {
  const options = [
    { key: "job", label: "New job", hint: "Book work into this slot", icon: Wrench, color: "#45c4ff", action: onJob },
    ...(Object.keys(blockMeta) as BlockKind[]).map((k) => ({
      key: k,
      label: blockMeta[k].label,
      hint: k === "time_off" ? "Vacation, sick day, appointment" : k === "meeting" ? "Team sync, vendor visit" : "Bay maintenance, closed",
      icon: blockMeta[k].icon,
      color: blockMeta[k].color,
      action: () => onBlock(k),
    })),
  ];
  return (
    <Modal
      open={!!at}
      onClose={onClose}
      size="sm"
      title={at ? at.toLocaleString("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
      description="What would you like to add? Tip: hold Alt and drag on the calendar to block a range."
    >
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={o.action}
            className={cn("group flex flex-col items-start gap-2 rounded-2xl border border-ink/[0.08] bg-ink/[0.03] p-3.5 text-left transition hover:-translate-y-0.5 hover:border-ink/20 hover:bg-ink/[0.07]")}
          >
            <span className="flex size-9 items-center justify-center rounded-xl" style={{ background: `${o.color}22`, color: o.color }}>
              <o.icon className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-medium text-ink">{o.label}</span>
              <span className="block text-[11px] text-ink-4">{o.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

export const BlockTimeIcon = CalendarPlus;

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignLeft,
  ArrowLeft,
  CalendarDays,
  Car,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  Code2,
  Copy,
  ExternalLink,
  GripVertical,
  Inbox,
  List,
  Mail,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks/use-api";
import type { Job, LeadFieldType, LeadForm, Paginated, Service } from "@/lib/types";
import { customerName } from "@/lib/domain";
import { cn, relativeTime, slugify } from "@/lib/utils";
import { Badge, Button, ConfirmDialog, EmptyState, Field, Glass, Input, Segmented, Select, Skeleton, Switch } from "@/components/spatial";
import { PageHeader, PlanGate, StageBadge, Table, Td, Th } from "@/components/app/ui";
import { useAuth } from "@/components/app/auth-provider";
import { LeadFormRenderer } from "@/components/app/lead-form-renderer";

const listOf = <T,>(d: T[] | Paginated<T> | undefined) => (Array.isArray(d) ? d : (d?.items ?? []));
type FieldDef = LeadForm["fields"][number] & { _id: string };

const fieldTypes: { value: LeadFieldType; label: string; icon: typeof Type }[] = [
  { value: "text", label: "Short text", icon: Type },
  { value: "email", label: "Email", icon: Mail },
  { value: "phone", label: "Phone", icon: Phone },
  { value: "textarea", label: "Long text", icon: AlignLeft },
  { value: "select", label: "Dropdown", icon: ChevronDown },
  { value: "vehicle", label: "Vehicle", icon: Car },
  { value: "services", label: "Services", icon: Sparkles },
  { value: "date", label: "Date", icon: CalendarDays },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
];
const typeMeta = (t: LeadFieldType) => fieldTypes.find((f) => f.value === t) ?? fieldTypes[0]!;
const tmpId = () => `tmp-${Math.random().toString(36).slice(2, 9)}`;

const starterFields = (): FieldDef[] => [
  { _id: tmpId(), key: "name", label: "Full name", type: "text", required: true, options: [] },
  { _id: tmpId(), key: "phone", label: "Mobile phone", type: "phone", required: true, options: [] },
  { _id: tmpId(), key: "email", label: "Email", type: "email", required: true, options: [] },
  { _id: tmpId(), key: "vehicle", label: "Your vehicle", type: "vehicle", required: true, options: [] },
  { _id: tmpId(), key: "services", label: "What are you interested in?", type: "services", required: false, options: [] },
  { _id: tmpId(), key: "details", label: "Anything else we should know?", type: "textarea", required: false, options: [] },
];

type Draft = Omit<LeadForm, "_id" | "submissions" | "createdAt" | "fields"> & { _id?: string; fields: FieldDef[]; submissions?: number };

const toDraft = (f: LeadForm): Draft => ({ ...f, fields: f.fields.map((x) => ({ ...x, _id: x._id ?? tmpId() })) });
const newDraft = (): Draft => ({
  name: "Ceramic coating quote",
  slug: "ceramic-coating-quote",
  title: "Get your ceramic coating quote",
  description: "Tell us about your vehicle and we'll send a tailored quote within the hour.",
  fields: starterFields(),
  submitLabel: "Request a quote",
  successMessage: "Thanks! We'll text you a personalized quote shortly.",
  createJob: true,
  active: true,
});

export default function FormsPage() {
  return (
    <PlanGate feature="lead_forms">
      <Forms />
    </PlanGate>
  );
}

function Forms() {
  const { shop } = useAuth();
  const { data, loading } = useApi<Paginated<LeadForm> | LeadForm[]>("/forms", { pageSize: 100 });
  const forms = listOf(data);
  const [draft, setDraft] = useState<Draft | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (draft) return <Builder initial={draft} onBack={() => setDraft(null)} />;

  const copy = (text: string, what: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  };

  return (
    <>
      <PageHeader
        title="Lead forms"
        description="Branded quote-request forms for your website and socials. Every submission becomes a customer, vehicle and lead."
        actions={
          <Button onClick={() => setDraft(newDraft())}>
            <Plus className="size-4" /> New form
          </Button>
        }
      />
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : forms.length === 0 ? (
        <Glass>
          <EmptyState
            icon={<ClipboardList className="size-7" />}
            title="No lead forms yet"
            description="Start with our proven ceramic-coating quote form — it converts 3× better than a contact page."
            action={
              <Button onClick={() => setDraft(newDraft())}>
                <Plus className="size-4" /> Create form
              </Button>
            }
          />
        </Glass>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {forms.map((f) => {
            const url = `${origin}/f/${shop.slug}/${f.slug}`;
            const embed = `<iframe src="${url}" title="${f.title}" style="width:100%;min-height:720px;border:0;border-radius:24px" loading="lazy"></iframe>`;
            return (
              <Glass key={f._id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <button onClick={() => setDraft(toDraft(f))} className="min-w-0 text-left">
                    <p className="truncate text-sm font-semibold text-ink hover:text-aqua-soft">{f.name}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-4">/{f.slug}</p>
                  </button>
                  <Badge tone={f.active ? "success" : "neutral"} dot>
                    {f.active ? "Live" : "Paused"}
                  </Badge>
                </div>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-3xl font-semibold tabular-nums">{f.submissions ?? 0}</span>
                  <span className="pb-1 text-xs text-ink-4">submissions · {f.fields.length} fields</span>
                </div>
                <div className="glass-inset mt-4 flex items-center gap-1 rounded-full py-1 pr-1 pl-3">
                  <span className="flex-1 truncate font-mono text-[11px] text-ink-3">{url}</span>
                  <button onClick={() => copy(url, "Link")} className="rounded-full p-1.5 text-ink-3 hover:bg-ink/10 hover:text-ink" aria-label="Copy link">
                    <Copy className="size-3.5" />
                  </button>
                  <a href={url} target="_blank" rel="noopener" className="rounded-full p-1.5 text-ink-3 hover:bg-ink/10 hover:text-ink" aria-label="Open form">
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => setDraft(toDraft(f))}>
                    Edit form
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => copy(embed, "Embed code")}>
                    <Code2 className="size-4" /> Embed
                  </Button>
                </div>
              </Glass>
            );
          })}
        </div>
      )}
    </>
  );
}

function SortableField({ field, selected, onSelect, onRemove }: { field: FieldDef; selected: boolean; onSelect: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field._id });
  const T = typeMeta(field.type);
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-2xl border px-2 py-2 transition-colors",
        selected ? "border-aqua/50 bg-aqua/10" : "border-ink/[0.07] bg-ink/[0.03] hover:border-ink/15",
        isDragging && "z-10 shadow-2xl",
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab rounded-lg p-1.5 text-ink-4 hover:text-ink active:cursor-grabbing" aria-label={`Reorder ${field.label}`}>
        <GripVertical className="size-4" />
      </button>
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <T.icon className="size-4 shrink-0 text-aqua-soft" />
        <span className="min-w-0">
          <span className="block truncate text-sm text-ink">
            {field.label || "Untitled"} {field.required && <span className="text-plasma">*</span>}
          </span>
          <span className="text-[11px] text-ink-4">
            {T.label} · {field.key}
          </span>
        </span>
      </button>
      <button onClick={onRemove} className="rounded-full p-1.5 text-ink-4 hover:bg-danger/10 hover:text-danger" aria-label={`Remove ${field.label}`}>
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}

function Builder({ initial, onBack }: { initial: Draft; onBack: () => void }) {
  const { shop } = useAuth();
  const [d, setD] = useState<Draft>(initial);
  const [selected, setSelected] = useState<string | null>(initial.fields[0]?._id ?? null);
  const [tab, setTab] = useState<"builder" | "submissions">("builder");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initial._id);
  const { data: servicesData } = useApi<Paginated<Service>>("/services", { active: true, pageSize: 200 });
  const services = (servicesData?.items ?? []).filter((s) => s.bookable !== false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const sel = d.fields.find((f) => f._id === selected);

  const patchField = (patch: Partial<FieldDef>) => setD({ ...d, fields: d.fields.map((f) => (f._id === selected ? { ...f, ...patch } : f)) });
  const addField = (type: LeadFieldType) => {
    const base = typeMeta(type).label;
    let key = slugify(base).replace(/-/g, "_");
    let n = 2;
    while (d.fields.some((f) => f.key === key)) key = `${slugify(base).replace(/-/g, "_")}_${n++}`;
    const f: FieldDef = { _id: tmpId(), key, label: base, type, required: false, options: type === "select" ? ["Option 1", "Option 2"] : [] };
    setD({ ...d, fields: [...d.fields, f] });
    setSelected(f._id);
  };
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = d.fields.findIndex((f) => f._id === e.active.id);
    const to = d.fields.findIndex((f) => f._id === e.over!.id);
    setD({ ...d, fields: arrayMove(d.fields, from, to) });
  }

  async function save() {
    const keys = d.fields.map((f) => f.key);
    if (new Set(keys).size !== keys.length) return void toast.error("Field keys must be unique");
    if (!d.slug) return void toast.error("Add a URL slug");
    setSaving(true);
    try {
      const body = {
        name: d.name,
        slug: d.slug,
        title: d.title,
        description: d.description,
        submitLabel: d.submitLabel,
        successMessage: d.successMessage,
        createJob: d.createJob,
        active: d.active,
        fields: d.fields.map(({ _id, ...f }) => (_id.startsWith("tmp-") ? f : { _id, ...f })),
      };
      const saved = d._id ? await api.patch<LeadForm>(`/forms/${d._id}`, body) : await api.post<LeadForm>("/forms", body);
      setD(toDraft(saved));
      setSlugTouched(true);
      invalidate("/forms");
      toast.success("Form saved");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!d._id) return onBack();
    try {
      await api.delete(`/forms/${d._id}`);
      invalidate("/forms");
      toast.success("Form deleted");
      onBack();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const url = typeof window !== "undefined" ? `${window.location.origin}/f/${shop.slug}/${d.slug}` : "";

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <button onClick={onBack} className="rounded-full p-2 text-ink-3 hover:bg-ink/10 hover:text-ink" aria-label="Back to forms">
              <ArrowLeft className="size-5" />
            </button>
            {d.name || "Untitled form"}
          </span>
        }
        description={d._id ? <span className="font-mono text-xs">{url}</span> : "Not published yet — save to get your link."}
        actions={
          <>
            {d._id && (
              <Segmented
                size="sm"
                value={tab}
                onChange={setTab}
                options={[
                  { value: "builder", label: "Builder" },
                  { value: "submissions", label: `Submissions${d.submissions ? ` (${d.submissions})` : ""}` },
                ]}
              />
            )}
            {d._id && (
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button onClick={save} loading={saving}>
              <Save className="size-4" /> Save
            </Button>
          </>
        }
      />

      {tab === "submissions" && d._id ? (
        <Submissions formId={d._id} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[360px_1fr_1fr]">
          <div className="space-y-4">
            <Glass className="p-5">
              <h2 className="mb-3 text-sm font-semibold">Form settings</h2>
              <div className="space-y-3">
                <Field label="Internal name">
                  <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value, slug: slugTouched ? d.slug : slugify(e.target.value) })} />
                </Field>
                <Field label="URL slug">
                  <Input
                    value={d.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setD({ ...d, slug: slugify(e.target.value) });
                    }}
                    className="font-mono text-xs"
                  />
                </Field>
                <Field label="Headline">
                  <Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
                </Field>
                <Field label="Intro text">
                  <Input value={d.description ?? ""} onChange={(e) => setD({ ...d, description: e.target.value })} />
                </Field>
                <Field label="Button label">
                  <Input value={d.submitLabel} onChange={(e) => setD({ ...d, submitLabel: e.target.value })} />
                </Field>
                <Field label="Success message">
                  <Input value={d.successMessage ?? ""} onChange={(e) => setD({ ...d, successMessage: e.target.value })} />
                </Field>
                <label className="flex items-center justify-between text-sm text-ink-2">
                  Create a lead job for each submission
                  <Switch checked={d.createJob} onChange={(v) => setD({ ...d, createJob: v })} label="Create job" />
                </label>
                <label className="flex items-center justify-between text-sm text-ink-2">
                  Form is live
                  <Switch checked={d.active} onChange={(v) => setD({ ...d, active: v })} label="Active" />
                </label>
              </div>
            </Glass>
          </div>

          <div className="space-y-4">
            <Glass className="p-5">
              <h2 className="mb-3 text-sm font-semibold">Fields</h2>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={d.fields.map((f) => f._id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-1.5">
                    {d.fields.map((f) => (
                      <SortableField
                        key={f._id}
                        field={f}
                        selected={selected === f._id}
                        onSelect={() => setSelected(f._id)}
                        onRemove={() => {
                          setD({ ...d, fields: d.fields.filter((x) => x._id !== f._id) });
                          if (selected === f._id) setSelected(null);
                        }}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
              <p className="mt-4 mb-2 text-xs font-medium text-ink-3">Add field</p>
              <div className="grid grid-cols-3 gap-1.5">
                {fieldTypes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => addField(t.value)}
                    className="flex flex-col items-center gap-1 rounded-xl border border-ink/[0.07] bg-ink/[0.02] py-2.5 text-[11px] text-ink-3 transition hover:border-aqua/40 hover:text-ink"
                  >
                    <t.icon className="size-4" />
                    {t.label}
                  </button>
                ))}
              </div>
            </Glass>

            {sel && (
              <Glass className="p-5">
                <h2 className="mb-3 text-sm font-semibold">Field settings</h2>
                <div className="space-y-3">
                  <Field label="Label">
                    <Input value={sel.label} onChange={(e) => patchField({ label: e.target.value })} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Key" hint="Used in submissions & automations">
                      <Input value={sel.key} onChange={(e) => patchField({ key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "_") })} className="font-mono text-xs" />
                    </Field>
                    <Field label="Type">
                      <Select value={sel.type} onChange={(e) => patchField({ type: e.target.value as LeadFieldType })}>
                        {fieldTypes.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <label className="flex items-center justify-between text-sm text-ink-2">
                    Required
                    <Switch checked={sel.required} onChange={(v) => patchField({ required: v })} label="Required" />
                  </label>
                  {sel.type === "select" && (
                    <Field label="Options (one per line)">
                      <textarea
                        value={sel.options.join("\n")}
                        onChange={(e) => patchField({ options: e.target.value.split("\n") })}
                        onBlur={() => patchField({ options: sel.options.map((o) => o.trim()).filter(Boolean) })}
                        className="min-h-24 w-full rounded-[var(--radius-control)] border border-ink/10 bg-surface-lo px-3.5 py-3 text-sm focus:border-aqua/60 focus:outline-none"
                      />
                    </Field>
                  )}
                  {sel.type === "services" && <p className="text-xs text-ink-4">Shows your bookable services ({services.length}) as tappable chips.</p>}
                </div>
              </Glass>
            )}
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 px-1 text-xs font-medium tracking-wide text-ink-3 uppercase">
              <List className="size-3.5" /> Live preview
            </p>
            <div className="glass-2 rim rounded-[28px] p-6 xl:sticky xl:top-24">
              <LeadFormRenderer form={d} services={services} brand={shop.brandColor} preview />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        danger
        title="Delete this form?"
        description="Its public link stops working. Jobs it already created are kept."
        confirmLabel="Delete form"
      />
    </>
  );
}

function Submissions({ formId }: { formId: string }) {
  const { data, loading } = useApi<Paginated<Job> | Job[]>(`/forms/${formId}/submissions`, { pageSize: 100 });
  const jobs = useMemo(() => listOf(data), [data]);
  return (
    <Glass className="overflow-hidden">
      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState icon={<Inbox className="size-7" />} title="No submissions yet" description="Share your form link or embed it on your site to start collecting leads." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Lead</Th>
              <Th>Job</Th>
              <Th>Stage</Th>
              <Th className="text-right">Received</Th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j._id} className="hover:bg-ink/[0.03]">
                <Td className="text-ink">{customerName(j.customer)}</Td>
                <Td>
                  <Link href={`/app/jobs/${j._id}`} className="text-aqua-soft hover:text-ink">
                    #{j.number} · {j.title}
                  </Link>
                </Td>
                <Td>
                  <StageBadge stage={j.stage} />
                </Td>
                <Td className="text-right text-xs text-ink-3">{relativeTime(j.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Glass>
  );
}

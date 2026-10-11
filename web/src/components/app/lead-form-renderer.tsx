"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { LeadForm, Service } from "@/lib/types";
import { cn, formatMoney } from "@/lib/utils";
import { Button, Field, Input, Select, Textarea } from "@/components/spatial";

export type LeadFormShape = Pick<LeadForm, "title" | "description" | "fields" | "submitLabel">;
export type Answers = Record<string, unknown>;

/** Validates answers against the form definition; returns a key → message map. */
export function validateAnswers(form: LeadFormShape, answers: Answers) {
  const errors: Record<string, string> = {};
  for (const f of form.fields) {
    const v = answers[f.key];
    const empty =
      v === undefined ||
      v === null ||
      v === "" ||
      v === false ||
      (Array.isArray(v) && v.length === 0) ||
      (f.type === "vehicle" && typeof v === "object" && !Array.isArray(v) && !(v as { make?: string }).make);
    if (f.required && empty) {
      errors[f.key] = f.type === "checkbox" ? "Please confirm to continue" : "Required";
      continue;
    }
    if (empty) continue;
    if (f.type === "email" && !/^\S+@\S+\.\S+$/.test(String(v))) errors[f.key] = "Enter a valid email";
    if (f.type === "phone" && String(v).replace(/\D/g, "").length < 7) errors[f.key] = "Enter a valid phone number";
  }
  return errors;
}

/** Renders a lead form exactly as customers see it — used by the public page and the builder's live preview. */
export function LeadFormRenderer({
  form,
  services = [],
  brand = "#7c5cff",
  onSubmit,
  submitting,
  preview,
}: {
  form: LeadFormShape;
  services?: Pick<Service, "_id" | "name" | "basePrice">[];
  brand?: string;
  onSubmit?: (answers: Answers) => void;
  submitting?: boolean;
  preview?: boolean;
}) {
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (key: string, v: unknown) => {
    setAnswers((a) => ({ ...a, [key]: v }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview) return;
    const errs = validateAnswers(form, answers);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    onSubmit?.(answers);
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">{form.title || "Untitled form"}</h1>
        {form.description && <p className="mt-1.5 text-sm text-ink-3">{form.description}</p>}
      </div>
      {form.fields.map((f, i) => {
        const id = `lf-${f.key || i}`;
        const label = `${f.label || "Untitled field"}${f.required ? " *" : ""}`;
        const err = errors[f.key];
        switch (f.type) {
          case "textarea":
            return (
              <Field key={id} label={label} htmlFor={id} error={err}>
                <Textarea id={id} value={String(answers[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)} />
              </Field>
            );
          case "select":
            return (
              <Field key={id} label={label} htmlFor={id} error={err}>
                <Select id={id} value={String(answers[f.key] ?? "")} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">Select…</option>
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </Select>
              </Field>
            );
          case "vehicle": {
            const v = (answers[f.key] as { year?: string; make?: string; model?: string }) ?? {};
            return (
              <Field key={id} label={label} error={err}>
                <div className="grid grid-cols-[90px_1fr_1fr] gap-2">
                  <Input aria-label="Year" placeholder="Year" inputMode="numeric" value={v.year ?? ""} onChange={(e) => set(f.key, { ...v, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
                  <Input aria-label="Make" placeholder="Make" value={v.make ?? ""} onChange={(e) => set(f.key, { ...v, make: e.target.value })} />
                  <Input aria-label="Model" placeholder="Model" value={v.model ?? ""} onChange={(e) => set(f.key, { ...v, model: e.target.value })} />
                </div>
              </Field>
            );
          }
          case "services": {
            const sel = (answers[f.key] as string[]) ?? [];
            const opts = services.length ? services : f.options.map((o) => ({ _id: o, name: o, basePrice: 0 }));
            return (
              <Field key={id} label={label} error={err}>
                <div className="flex flex-wrap gap-2">
                  {opts.length === 0 && <span className="text-xs text-ink-4">Services appear here from your catalog.</span>}
                  {opts.map((s) => {
                    const on = sel.includes(s._id);
                    return (
                      <button
                        key={s._id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set(f.key, on ? sel.filter((x) => x !== s._id) : [...sel, s._id])}
                        className={cn("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition", on ? "text-white" : "border-ink/12 bg-ink/[0.03] text-ink-2 hover:border-ink/25")}
                        style={on ? { background: brand, borderColor: brand } : undefined}
                      >
                        {on && <Check className="size-3.5" />}
                        {s.name}
                        {s.basePrice > 0 && <span className="text-[11px] opacity-70">from {formatMoney(s.basePrice).replace(".00", "")}</span>}
                      </button>
                    );
                  })}
                </div>
              </Field>
            );
          }
          case "checkbox":
            return (
              <div key={id}>
                <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-2">
                  <input
                    type="checkbox"
                    checked={!!answers[f.key]}
                    onChange={(e) => set(f.key, e.target.checked)}
                    className="mt-0.5 size-4 rounded border-ink/20 bg-surface-lo"
                    style={{ accentColor: brand }}
                  />
                  {label}
                </label>
                {err && <p className="mt-1 text-xs text-danger">{err}</p>}
              </div>
            );
          default:
            return (
              <Field key={id} label={label} htmlFor={id} error={err}>
                <Input
                  id={id}
                  type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : f.type === "date" ? "date" : "text"}
                  autoComplete={f.type === "email" ? "email" : f.type === "phone" ? "tel" : undefined}
                  value={String(answers[f.key] ?? "")}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </Field>
            );
        }
      })}
      <Button type="submit" size="lg" className="w-full" loading={submitting} style={{ background: `linear-gradient(120deg, ${brand}, #22d3ee)` }}>
        {form.submitLabel || "Request a quote"}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Send } from "lucide-react";
import { Button, Field, Input, Segmented, Textarea } from "@/components/spatial";
import { api, ApiError, errorMessage } from "@/lib/api";

type Topic = "demo" | "contact";

export function ContactForm() {
  const params = useSearchParams();
  const [topic, setTopic] = useState<Topic>(params.get("topic") === "demo" ? "demo" : "contact");
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email address.";
    if (topic === "contact" && form.message.trim().length < 10) e.message = "Tell us a little more (10+ characters).";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post("/public/leads", { ...form, source: topic });
      setDone(true);
      toast.success(topic === "demo" ? "Demo request sent!" : "Message sent!");
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION") setErrors({ form: err.message });
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center py-12 text-center" role="status">
        <CheckCircle2 className="size-14 text-success" aria-hidden />
        <h2 className="mt-5 text-2xl font-semibold">We’ve got it, {form.name.split(" ")[0]}.</h2>
        <p className="mt-2 max-w-sm text-sm text-ink-3">
          {topic === "demo"
            ? "A product specialist will email you within one business day to schedule a live, 30-minute walkthrough."
            : "Our team typically replies within a few hours on business days."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Segmented
        value={topic}
        onChange={setTopic}
        options={[
          { value: "demo", label: "Book a demo" },
          { value: "contact", label: "General question" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="c-name" error={errors.name}>
          <Input id="c-name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Work email" htmlFor="c-email" error={errors.email}>
          <Input id="c-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!errors.email} />
        </Field>
        <Field label="Phone" htmlFor="c-phone" hint="Optional">
          <Input id="c-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Shop name" htmlFor="c-company">
          <Input id="c-company" autoComplete="organization" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </Field>
      </div>
      <Field
        label={topic === "demo" ? "What would you like to see? (optional)" : "How can we help?"}
        htmlFor="c-message"
        error={errors.message}
      >
        <Textarea
          id="c-message"
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder={topic === "demo" ? "e.g. We're a 3-bay PPF & tint shop moving off spreadsheets…" : "Your question…"}
          aria-invalid={!!errors.message}
        />
      </Field>
      {errors.form && <p className="text-sm text-danger">{errors.form}</p>}
      <Button type="submit" size="lg" loading={loading} className="w-full sm:w-auto">
        <Send className="size-4" /> {topic === "demo" ? "Request my demo" : "Send message"}
      </Button>
      <p className="text-xs text-ink-4">
        By submitting, you agree to our privacy policy. We never sell your data.
      </p>
    </form>
  );
}

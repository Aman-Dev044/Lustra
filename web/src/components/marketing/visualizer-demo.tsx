"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button, Field, Glass, Input } from "@/components/spatial";
import { VisualizerLoader } from "@/components/visualizer/visualizer-loader";
import { defaultConfig, describeConfig, type VisualizerConfig } from "@/components/visualizer/config";
import { api, errorMessage } from "@/lib/api";

/** Live 3D demo plus lead capture that records the configuration the visitor built. */
export function VisualizerDemo() {
  const [config, setConfig] = useState<VisualizerConfig>(defaultConfig);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const onConfigChange = useCallback((c: VisualizerConfig) => setConfig(c), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/public/leads", {
        ...form,
        source: "visualizer",
        message: `3D Visualizer demo request. Configuration: ${describeConfig(config)}`,
      });
      setSent(true);
      toast.success("Request received — we'll reach out within one business day.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <VisualizerLoader mode="marketing" onConfigChange={onConfigChange} />
      <Glass tier={2} rim className="grid gap-6 rounded-[28px] p-6 sm:p-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Want this on your website?</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-3">
            Tell us where to send a personalized walkthrough. We’ll set the visualizer up with the film lines you install and
            show you the lead capture in action.
          </p>
          <p className="mt-3 rounded-xl bg-ink/[0.04] px-3 py-2 text-xs text-ink-3">
            <span className="text-ink-2">Your build:</span> {describeConfig(config)}
          </p>
        </div>
        {sent ? (
          <div className="rounded-2xl border border-success/30 bg-success/10 p-6 text-sm text-success" role="status">
            Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}! Your request and configuration are with our team. Expect a reply
            within one business day.
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <Field label="Your name" htmlFor="viz-name">
              <Input id="viz-name" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Shop name" htmlFor="viz-company">
              <Input id="viz-company" autoComplete="organization" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </Field>
            <Field label="Email" htmlFor="viz-email">
              <Input id="viz-email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone (optional)" htmlFor="viz-phone">
              <Input id="viz-phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Button type="submit" loading={sending} className="sm:col-span-2">
              <Send className="size-4" /> Get my visualizer walkthrough
            </Button>
          </form>
        )}
      </Glass>
    </div>
  );
}

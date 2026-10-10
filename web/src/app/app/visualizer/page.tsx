"use client";

import { Box, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/app/auth-provider";
import { PageHeader } from "@/components/app/ui";
import { Button, Glass } from "@/components/spatial";
import { VisualizerLoader } from "@/components/visualizer/visualizer-loader";
import { estimateConfig, type VisualizerConfig } from "@/components/visualizer/config";
import { visualizerAddOn } from "@/lib/plans";
import { formatMoney } from "@/lib/utils";

export default function AppVisualizerPage() {
  const { shop } = useAuth();

  if (!shop.addOns?.visualizer) {
    return (
      <>
        <PageHeader title="3D Visualizer" description="Preview PPF coverage, wraps and tint on a live 3D vehicle." />
        <Glass tier={2} rim className="mx-auto mt-6 max-w-2xl p-10 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-iris to-aqua shadow-[var(--shadow-glow-iris)]">
            <Box className="size-7 text-white" aria-hidden />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Add the 3D Visualizer to {shop.name}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-3">{visualizerAddOn.description}</p>
          <ul className="mx-auto mt-6 grid max-w-md gap-2 text-left text-sm text-ink-2 sm:grid-cols-2">
            {["PPF coverage tiers", "Gloss, satin, matte & chrome", "5–70% tint preview", "Website embed + lead capture"].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="size-4 text-aqua" aria-hidden /> {f}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-3">
            <span className="text-2xl font-semibold text-ink">${visualizerAddOn.monthly}</span>/month · works with any plan · cancel anytime
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button href="/app/settings?tab=billing">
              <Sparkles className="size-4" /> Add the visualizer
            </Button>
            <Button href="/visualizer" variant="secondary">
              Try the public demo
            </Button>
          </div>
        </Glass>
      </>
    );
  }

  async function save(config: VisualizerConfig, summary: string) {
    const estimate = estimateConfig(config);
    const text = [
      `${shop.name} — 3D Visualizer build`,
      summary,
      ...estimate.lines.map((l) => `• ${l.label}: ${formatMoney(l.price)}`),
      `Estimated package: ${formatMoney(estimate.total)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Configuration copied", { description: "Paste it into a quote, note or message." });
    } catch {
      toast.error("Couldn't access the clipboard", { description: summary });
    }
  }

  return (
    <>
      <PageHeader
        title="3D Visualizer"
        description="Build the customer's car live — then save the configuration into a quote or message."
        actions={
          <Button href="/app/quotes/new" variant="secondary" size="sm">
            New quote
          </Button>
        }
      />
      <VisualizerLoader mode="app" onSave={save} />
    </>
  );
}

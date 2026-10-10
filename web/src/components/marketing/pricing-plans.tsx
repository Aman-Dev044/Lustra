"use client";

import { useState } from "react";
import { Box, Check } from "lucide-react";
import { Badge, Button, Glass, Segmented } from "@/components/spatial";
import { Reveal } from "@/components/spatial/motion";
import { pricingPlans, visualizerAddOn } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function PricingPlans() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  return (
    <div>
      <div className="flex justify-center">
        <Segmented
          value={billing}
          onChange={setBilling}
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly" },
          ]}
        />
      </div>
      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {pricingPlans.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.08}>
            <Glass
              tier={p.highlight ? 2 : 1}
              rim={p.highlight}
              className={cn("relative flex h-full flex-col rounded-[30px] p-8", p.highlight && "lg:-translate-y-4")}
            >
              {p.highlight && (
                <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-80 -translate-x-1/2 rounded-full bg-iris/25 blur-[70px]" aria-hidden />
              )}
              <div className="relative flex items-center justify-between">
                <h2 className="text-xl font-semibold">{p.name}</h2>
                {p.highlight && <Badge tone="aqua">Most popular</Badge>}
              </div>
              <p className="relative mt-2 min-h-12 text-sm text-ink-3">{p.tagline}</p>
              <div className="relative mt-7">
                {billing === "monthly" ? (
                  <p className="flex items-baseline gap-1">
                    <span className="text-6xl font-semibold tracking-[-0.05em]">${p.monthly}</span>
                    <span className="text-sm text-ink-3">/month</span>
                  </p>
                ) : (
                  <p className="flex items-baseline gap-1">
                    <span className="text-6xl font-semibold tracking-[-0.05em]">${p.yearly.toLocaleString("en-US")}</span>
                    <span className="text-sm text-ink-3">/year</span>
                  </p>
                )}
                <p className="mt-1.5 text-xs text-ink-4">
                  {billing === "monthly"
                    ? `or $${p.yearly.toLocaleString("en-US")} billed yearly`
                    : `≈ $${Math.round(p.yearly / 12)}/month, billed annually`}{" "}
                  · unlimited users
                </p>
              </div>
              <Button href={`/signup?plan=${p.id}`} variant={p.highlight ? "primary" : "secondary"} className="relative mt-7 w-full" size="lg">
                Start 14-day free trial
              </Button>
              <ul className="relative mt-8 space-y-3 text-sm text-ink-2">
                {p.inherits && <li className="text-xs font-semibold tracking-wide text-ink-3 uppercase">{p.inherits}</li>}
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-aqua" aria-hidden /> {f}
                  </li>
                ))}
              </ul>
            </Glass>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <Glass tier={2} rim className="mt-6 flex flex-col gap-6 rounded-[30px] p-8 md:flex-row md:items-center">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-iris to-aqua shadow-[var(--shadow-glow-iris)]">
            <Box className="size-7 text-white" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">{visualizerAddOn.name}</span>
              <Badge tone="iris">Add-on for any plan</Badge>
            </p>
            <p className="mt-1 text-sm text-ink-3">{visualizerAddOn.description}</p>
          </div>
          <div className="flex items-center gap-4">
            <p className="flex items-baseline gap-1">
              <span className="text-4xl font-semibold tracking-tight">${visualizerAddOn.monthly}</span>
              <span className="text-sm text-ink-3">/month</span>
            </p>
            <Button href="/visualizer" variant="secondary">
              Try the demo
            </Button>
          </div>
        </Glass>
      </Reveal>
    </div>
  );
}

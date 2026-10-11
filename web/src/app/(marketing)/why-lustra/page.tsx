import { Check, Download, HeartHandshake, Minus, Rocket, Upload, X } from "lucide-react";
import { Container, Glass, SectionHeading } from "@/components/spatial";
import { Reveal } from "@/components/spatial/motion";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { CTASection, FAQSection, PageHero, SpatialImage, TestimonialsSection } from "@/components/marketing/sections";
import { breadcrumbLd, buildMetadata, faqLd, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Why Switch — The Modern Detailing Shop Platform",
  description:
    "See how Lustra compares to typical detailing shop software: real-time sync, AI quoting, customer portal, QR warranty certificates, memberships and free migration at the same price.",
  path: "/why-lustra",
  keywords: ["detailing software alternative", "switch detailing CRM", "Urable alternative", "best detailing shop software"],
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Why Lustra", path: "/why-lustra" },
];

type Mark = "yes" | "no" | "partial";
const rows: { label: string; lustra: Mark | string; typical: Mark | string }[] = [
  { label: "Real-time job board synced across devices", lustra: "yes", typical: "partial" },
  { label: "AI quote drafting from plain-English notes", lustra: "yes", typical: "no" },
  { label: "Live customer portal (track, approve, sign, pay)", lustra: "yes", typical: "partial" },
  { label: "QR-verifiable warranty certificates", lustra: "yes", typical: "no" },
  { label: "Memberships with recurring billing", lustra: "yes", typical: "partial" },
  { label: "Visual automation builder with waits & conditions", lustra: "yes", typical: "partial" },
  { label: "Bay capacity heatmap", lustra: "yes", typical: "no" },
  { label: "Command palette & instant global search", lustra: "yes", typical: "no" },
  { label: "AI Insights: revenue forecast & churn radar", lustra: "yes", typical: "no" },
  { label: "Smart segmented SMS & email campaigns", lustra: "yes", typical: "partial" },
  { label: "Reputation hub with AI review replies", lustra: "yes", typical: "no" },
  { label: "Route optimization & on-my-way texts", lustra: "yes", typical: "yes" },
  { label: "Coupons & e-gift cards", lustra: "yes", typical: "yes" },
  { label: "QuickBooks, Stripe, Square & Zapier", lustra: "yes", typical: "partial" },
  { label: "Developer API keys & signed webhooks", lustra: "yes", typical: "partial" },
  { label: "Interactive 3D visualizer", lustra: "Add-on", typical: "Add-on" },
  { label: "Users included", lustra: "Unlimited", typical: "Unlimited" },
  { label: "Starting price", lustra: "$70/mo", typical: "$70/mo" },
  { label: "Free data migration", lustra: "yes", typical: "partial" },
];

function MarkCell({ v }: { v: Mark | string }) {
  if (v === "yes") return <Check className="mx-auto size-5 text-aqua" aria-label="Yes" />;
  if (v === "no") return <X className="mx-auto size-4 text-ink-4" aria-label="No" />;
  if (v === "partial") return <Minus className="mx-auto size-4 text-warning" aria-label="Partial or limited" />;
  return <span className="text-sm text-ink">{v}</span>;
}

const migration = [
  { icon: Download, title: "Export", body: "Download customers, vehicles and history from your current tool as CSV — we'll show you exactly where." },
  { icon: Upload, title: "We import", body: "Our team maps and imports everything for free, usually within two business days." },
  { icon: Rocket, title: "Go live", body: "Industry presets, automations and a 30-minute onboarding call get your whole team running." },
];

const faqs = [
  { q: "Is switching risky in the middle of a busy season?", a: "No. We import your data while you keep working in your current tool, then you switch on the day you choose. Most shops are fully live within a week." },
  { q: "Will my prices be the same?", a: "Yes. Lustra's plans match the price points shops already pay — $70, $110 and $183 per month — with far more included." },
  { q: "What if my team doesn't like it?", a: "There are no contracts. If Lustra isn't right within your first 60 days on a paid plan, we'll refund your subscription — no questions asked." },
];

export default function WhyLustraPage() {
  return (
    <>
      <PageHero
        breadcrumbs={crumbs}
        eyebrow="Why switch"
        title={
          <>
            Same price as yesterday’s software. <span className="text-spectral">Built for tomorrow’s shop.</span>
          </>
        }
        description="Most shop software digitized the paper ticket. Lustra was designed from the ground up to be live, intelligent and customer-facing — so your shop feels as premium as the work you do."
      />

      <section className="pb-20" aria-labelledby="compare-title">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
            <Reveal>
              <Glass tier={2} className="overflow-hidden rounded-[28px]">
                <h2 id="compare-title" className="sr-only">
                  Lustra compared with typical detailing shop software
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-ink/[0.08]">
                        <th scope="col" className="px-6 py-5 text-left text-xs font-semibold tracking-[0.1em] text-ink-4 uppercase">
                          Capability
                        </th>
                        <th scope="col" className="bg-iris/[0.08] px-4 py-5 text-center text-base font-semibold text-ink">
                          Lustra
                        </th>
                        <th scope="col" className="px-4 py-5 text-center text-sm font-medium text-ink-3">
                          Typical shop software
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.label} className="border-t border-ink/[0.04]">
                          <th scope="row" className="px-6 py-3.5 text-left font-normal text-ink-2">
                            {r.label}
                          </th>
                          <td className="bg-iris/[0.05] px-4 py-3.5 text-center">
                            <MarkCell v={r.lustra} />
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <MarkCell v={r.typical} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Glass>
            </Reveal>
            <Reveal delay={0.1}>
              <SpatialImage src="/images/garage-night.webp" alt="Sports car in a modern detailing garage at night" className="h-80 lg:h-full" sizes="(min-width: 1024px) 480px, 100vw">
                <div className="on-photo absolute right-5 bottom-5 left-5">
                  <p className="text-xs tracking-[0.14em] text-aqua-soft uppercase">Typical result</p>
                  <p className="mt-1 text-2xl font-semibold text-white">+38% booked jobs in year one</p>
                  <p className="text-sm text-ink-2">Median across shops that switched in 2025</p>
                </div>
              </SpatialImage>
            </Reveal>
          </div>
        </Container>
      </section>

      <section className="py-20" aria-labelledby="roi-title">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="ROI calculator"
              title={<span id="roi-title">What could Lustra be worth to your shop?</span>}
              description="Move the sliders to match your business. The math is intentionally conservative."
            />
          </Reveal>
          <div className="mt-12">
            <RoiCalculator />
          </div>
        </Container>
      </section>

      <section className="py-20" aria-labelledby="migrate-title">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="White-glove migration" title={<span id="migrate-title">Switch in three steps. We do the heavy lifting.</span>} />
          </Reveal>
          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {migration.map((m, i) => (
              <Reveal as="li" key={m.title} delay={i * 0.08}>
                <Glass className="h-full p-7">
                  <div className="flex items-center gap-3">
                    <span className="bg-spectral flex size-10 items-center justify-center rounded-full text-sm font-semibold text-white">{i + 1}</span>
                    <m.icon className="size-5 text-aqua-soft" aria-hidden />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{m.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-3">{m.body}</p>
                </Glass>
              </Reveal>
            ))}
          </ol>
          <Reveal>
            <Glass tier={2} rim className="mt-6 flex flex-col items-start gap-5 rounded-[28px] p-7 sm:flex-row sm:items-center">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-success/15 text-success">
                <HeartHandshake className="size-7" aria-hidden />
              </span>
              <div>
                <h3 className="text-lg font-semibold">The 60-day switching guarantee</h3>
                <p className="mt-1 text-sm text-ink-3">
                  Free migration, free onboarding, and if Lustra isn’t the right fit within 60 days of your first paid month, we refund
                  your subscription in full.
                </p>
              </div>
            </Glass>
          </Reveal>
        </Container>
      </section>

      <TestimonialsSection limit={3} />
      <FAQSection faqs={faqs} title="Switching questions" />
      <CTASection title="Make the switch this week." />
      <JsonLd data={[breadcrumbLd(crumbs), faqLd(faqs)]} />
    </>
  );
}

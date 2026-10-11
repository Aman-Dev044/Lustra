import { Check, CreditCard, FileUp, Infinity as InfinityIcon, Minus, ShieldCheck, Zap } from "lucide-react";
import { Container, Glass, SectionHeading } from "@/components/spatial";
import { Reveal } from "@/components/spatial/motion";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { CTASection, FAQSection, PageHero } from "@/components/marketing/sections";
import { comparison, pricingFaqs } from "@/lib/content/marketing";
import { pricingPlans, visualizerAddOn } from "@/lib/plans";
import { breadcrumbLd, buildMetadata, faqLd, JsonLd } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Pricing — Express $70, Pro $110, Enterprise $183",
  description:
    "Simple Lustra pricing with unlimited users on every plan: Express $70/mo, Pro $110/mo, Enterprise $183/mo, plus the 3D Visualizer add-on at $150/mo. No contracts, free data import.",
  path: "/pricing",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Pricing", path: "/pricing" },
];

const guarantees = [
  { icon: InfinityIcon, title: "Unlimited users", body: "Never pay per seat. Add every tech, detailer and front-desk teammate." },
  { icon: ShieldCheck, title: "No contracts", body: "Month-to-month or yearly. Upgrade, downgrade or cancel in Settings." },
  { icon: FileUp, title: "Free data import", body: "We migrate customers, vehicles, services and history for you." },
  { icon: Zap, title: "Live in a day", body: "Industry presets, templates and video guides get you running fast." },
];

const productLd = pricingPlans.map((p) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: `${site.name} ${p.name}`,
  description: p.tagline,
  brand: { "@type": "Brand", name: site.name },
  offers: [
    {
      "@type": "Offer",
      price: String(p.monthly),
      priceCurrency: "USD",
      url: absoluteUrl(`/signup?plan=${p.id}`),
      availability: "https://schema.org/InStock",
      priceSpecification: { "@type": "UnitPriceSpecification", price: String(p.monthly), priceCurrency: "USD", unitCode: "MON" },
    },
    {
      "@type": "Offer",
      price: String(p.yearly),
      priceCurrency: "USD",
      url: absoluteUrl(`/signup?plan=${p.id}`),
      availability: "https://schema.org/InStock",
      priceSpecification: { "@type": "UnitPriceSpecification", price: String(p.yearly), priceCurrency: "USD", unitCode: "ANN" },
    },
  ],
}));

const addOnLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: `${site.name} ${visualizerAddOn.name}`,
  description: visualizerAddOn.description,
  brand: { "@type": "Brand", name: site.name },
  offers: {
    "@type": "Offer",
    price: String(visualizerAddOn.monthly),
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: absoluteUrl("/visualizer"),
  },
};

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "string") return <span className="text-sm font-medium text-ink">{value}</span>;
  return value ? (
    <Check className="mx-auto size-5 text-aqua" aria-label="Included" />
  ) : (
    <Minus className="mx-auto size-4 text-ink-4" aria-label="Not included" />
  );
}

export default function PricingPage() {
  return (
    <>
      <PageHero
        breadcrumbs={crumbs}
        eyebrow="Pricing"
        title={
          <>
            Honest pricing. <span className="text-spectral">Unlimited everything that matters.</span>
          </>
        }
        description="The same price points shops already pay for yesterday's software — with a real-time job board, AI Quote Copilot, customer portal, memberships and more inside. 14-day free trial, no credit card."
      >
        <div className="mt-14">
          <PricingPlans />
        </div>
      </PageHero>

      <section aria-label="Guarantees" className="py-10">
        <Container>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {guarantees.map((g) => (
              <Glass key={g.title} className="p-5">
                <g.icon className="size-5 text-aqua-soft" aria-hidden />
                <h2 className="mt-3 text-sm font-semibold">{g.title}</h2>
                <p className="mt-1 text-sm text-ink-3">{g.body}</p>
              </Glass>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20" aria-labelledby="compare-title">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Compare plans" title={<span id="compare-title">Every feature, side by side</span>} />
          </Reveal>
          <Glass tier={2} className="mt-12 overflow-hidden rounded-[28px]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <caption className="sr-only">Feature comparison across Express, Pro and Enterprise plans</caption>
                <thead className="sticky top-0">
                  <tr className="border-b border-ink/[0.08] bg-surface/85 backdrop-blur">
                    <th scope="col" className="w-1/2 px-6 py-5 text-left text-xs font-semibold tracking-[0.1em] text-ink-4 uppercase">
                      Feature
                    </th>
                    {pricingPlans.map((p) => (
                      <th key={p.id} scope="col" className="px-4 py-5 text-center">
                        <span className="block text-base font-semibold text-ink">{p.name}</span>
                        <span className="text-xs font-normal text-ink-3">${p.monthly}/mo</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                {comparison.map((g) => (
                  <tbody key={g.group}>
                    <tr>
                      <th colSpan={4} scope="colgroup" className="bg-ink/[0.03] px-6 py-3 text-left text-xs font-semibold tracking-[0.12em] text-aqua-soft uppercase">
                        {g.group}
                      </th>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.label} className="border-t border-ink/[0.04]">
                        <th scope="row" className="px-6 py-3.5 text-left font-normal text-ink-2">
                          {r.label}
                        </th>
                        <td className="px-4 py-3.5 text-center">
                          <Cell value={r.values.express} />
                        </td>
                        <td className="bg-iris/[0.04] px-4 py-3.5 text-center">
                          <Cell value={r.values.pro} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <Cell value={r.values.enterprise} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </Glass>
        </Container>
      </section>

      <section className="py-12" aria-labelledby="lustrapay-title">
        <Container>
          <Glass tier={2} rim className="grid gap-8 rounded-[30px] p-8 sm:p-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-success/15 text-success">
                <CreditCard className="size-6" aria-hidden />
              </span>
              <h2 id="lustrapay-title" className="mt-5 text-3xl font-semibold tracking-[-0.03em]">
                LustraPay: processing without the fine print
              </h2>
              <p className="mt-3 text-ink-2">
                Flat, published rates. No setup fees, no monthly minimums, no annual processing contract, no PCI fees. Prefer
                Stripe or Square? Connect them on any plan.
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ["In person", "2.6% + 10¢", "Tap-to-pay, chip & contactless"],
                ["Online", "2.9% + 30¢", "Text-to-pay, portal & booking deposits"],
                ["Payouts", "Next business day", "Instant payouts available"],
                ["Hidden fees", "$0", "No setup, monthly or PCI fees"],
              ].map(([k, v, d]) => (
                <div key={k} className="glass-inset rounded-2xl p-5">
                  <dt className="text-xs tracking-wide text-ink-3 uppercase">{k}</dt>
                  <dd className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{v}</dd>
                  <dd className="mt-1 text-xs text-ink-4">{d}</dd>
                </div>
              ))}
            </dl>
          </Glass>
        </Container>
      </section>

      <FAQSection faqs={pricingFaqs} title="Pricing questions" />
      <CTASection />
      <JsonLd data={[breadcrumbLd(crumbs), faqLd(pricingFaqs), ...productLd, addOnLd]} />
    </>
  );
}

import Image from "next/image";
import { Code2, Layers, MousePointerClick, Palette, ShieldCheck, SunDim, Target, TrendingUp } from "lucide-react";
import { Container, Glass, SectionHeading } from "@/components/spatial";
import { Reveal } from "@/components/spatial/motion";
import { CTASection, FAQSection, PageHero } from "@/components/marketing/sections";
import { VisualizerDemo } from "@/components/marketing/visualizer-demo";
import { visualizerAddOn } from "@/lib/plans";
import { breadcrumbLd, buildMetadata, faqLd, JsonLd } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";

export const metadata = buildMetadata({
  title: "3D Visualizer for PPF, Wraps & Window Tint",
  description:
    "Interactive 3D car configurator for PPF coverage, vinyl wrap colors and finishes, and window tint shades. Embed it on your site with lead capture — $150/month add-on for any Lustra plan.",
  path: "/visualizer",
  keywords: ["PPF visualizer", "car wrap visualizer", "window tint visualizer", "3D car configurator", "wrap color preview tool"],
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "3D Visualizer", path: "/visualizer" },
];

const benefits = [
  { icon: Palette, title: "Every finish, true to life", body: "Gloss, satin, matte, metallic and chrome react realistically to studio, sunset and night lighting." },
  { icon: Layers, title: "Coverage you can see", body: "Partial front, full front, track pack and full body PPF are highlighted panel by panel." },
  { icon: SunDim, title: "Tint by VLT", body: "Preview 70% to 5% shades so customers choose confidently — and legally." },
  { icon: Code2, title: "Embed anywhere", body: "Drop the visualizer on your website or Instagram link and capture leads with their build attached." },
  { icon: Target, title: "Quote-ready", body: "Saved builds attach to quotes and approvals, so what they saw is exactly what they buy." },
  { icon: TrendingUp, title: "Pays for itself", body: "One full-front → track-pack upgrade covers a full year of the add-on." },
];

const faqs = [
  { q: "How much does the 3D Visualizer cost?", a: "The visualizer is a $150/month add-on available on Express, Pro and Enterprise. No setup fee, cancel any time." },
  { q: "Can I embed it on my website?", a: "Yes. Subscribers get an embeddable version with lead capture, so visitors can build their car and send it straight to your inbox." },
  { q: "Does it show PPF coverage tiers?", a: "Yes. Partial front, full front, track pack and full body coverage are highlighted on the vehicle, alongside color PPF and wrap finishes." },
  { q: "Does it work on phones and tablets?", a: "Yes. It runs in any modern browser on desktop, tablet and phone. A tablet at the front counter is a favorite setup." },
];

export default function VisualizerPage() {
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${site.name} 3D Visualizer`,
    description: visualizerAddOn.description,
    image: absoluteUrl("/images/red-coupe.webp"),
    brand: { "@type": "Brand", name: site.name },
    offers: { "@type": "Offer", price: String(visualizerAddOn.monthly), priceCurrency: "USD", availability: "https://schema.org/InStock", url: absoluteUrl("/visualizer") },
  };

  return (
    <>
      <PageHero
        breadcrumbs={crumbs}
        eyebrow={`Add-on · $${visualizerAddOn.monthly}/month`}
        title={
          <>
            Sell the finish <span className="text-spectral">before you touch the paint.</span>
          </>
        }
        description="An interactive 3D studio for color PPF, wraps, coverage tiers and window tint. Spin it, light it, price it — then send it straight into a quote. Try the live demo below."
      >
        <div className="mt-12">
          <VisualizerDemo />
        </div>
      </PageHero>

      <section className="py-20" aria-labelledby="viz-benefits">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Why shops love it" title={<span id="viz-benefits">A showroom on every screen</span>} />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={(i % 3) * 0.06}>
                <Glass className="h-full p-6">
                  <b.icon className="size-6 text-aqua-soft" aria-hidden />
                  <h3 className="mt-4 font-semibold text-ink">{b.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{b.body}</p>
                </Glass>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-12" aria-labelledby="counter-title">
        <Container>
          <Glass tier={2} rim className="grid overflow-hidden rounded-[32px] lg:grid-cols-2">
            <div className="relative h-72 lg:h-auto">
              <Image src="/images/ppf-install.webp" alt="Installer applying paint protection film after the customer approved coverage in 3D" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="p-8 sm:p-12">
              <h2 id="counter-title" className="text-3xl font-semibold tracking-tight">
                From “just the bumper” to full front — at the counter.
              </h2>
              <ol className="mt-6 space-y-4">
                {[
                  { Icon: MousePointerClick, text: "Customer builds their car on a tablet or your website." },
                  { Icon: ShieldCheck, text: "Coverage tiers make the value of more film obvious." },
                  { Icon: TrendingUp, text: "Their build lands in a quote with a deposit link." },
                ].map(({ Icon, text }) => (
                  <li key={text} className="flex gap-3 text-ink-2">
                    <span className="glass-2 flex size-9 shrink-0 items-center justify-center rounded-xl text-aqua-soft">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="pt-1.5 text-sm">{text}</span>
                  </li>
                ))}
              </ol>
            </div>
          </Glass>
        </Container>
      </section>

      <FAQSection faqs={faqs} title="3D Visualizer FAQ" />
      <CTASection title="Give every customer a showroom." />
      <JsonLd data={[breadcrumbLd(crumbs), faqLd(faqs), productLd]} />
    </>
  );
}

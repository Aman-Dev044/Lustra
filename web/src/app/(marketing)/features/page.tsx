import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, Container, Glass } from "@/components/spatial";
import { Reveal, TiltCard } from "@/components/spatial/motion";
import { CTASection, PageHero } from "@/components/marketing/sections";
import { featureMocks } from "@/components/marketing/mocks";
import { featureCatalog } from "@/lib/content/catalog";
import { features } from "@/lib/content/features";
import { breadcrumbLd, buildMetadata, JsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { titleCase } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Features — Booking, Quotes, Payments & More",
  description:
    "Explore every Lustra feature: live job board, AI Quote Copilot, online booking, customer portal, payments, inspections, automations, memberships, warranty certificates and analytics.",
  path: "/features",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Features", path: "/features" },
];

export default function FeaturesPage() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Lustra features",
    itemListElement: features.map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/features/${f.slug}`),
      name: f.title,
    })),
  };

  return (
    <>
      <PageHero
        breadcrumbs={crumbs}
        eyebrow="Platform"
        title={
          <>
            Fifteen tools. <span className="text-spectral">One live workspace.</span>
          </>
        }
        description="Every Lustra feature shares the same real-time data, so a booking becomes a quote, a job, an inspection, an invoice and a warranty — without retyping a thing."
      />
      <section aria-label="All features" className="pb-12">
        <Container>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featureCatalog.map((entry, i) => {
              const f = features.find((x) => x.slug === entry.slug)!;
              const Mock = featureMocks[entry.slug];
              return (
                <Reveal key={entry.slug} delay={(i % 3) * 0.05}>
                  <TiltCard max={4}>
                    <Link
                      href={`/features/${entry.slug}`}
                      className="group glass flex h-full flex-col rounded-[26px] p-5 transition hover:bg-ink/[0.07]"
                    >
                      {Mock && (
                        <div className="pointer-events-none h-56 overflow-hidden rounded-[22px] [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
                          <Mock />
                        </div>
                      )}
                      <div className="mt-4 flex items-center gap-2">
                        <entry.icon className="size-4 text-aqua-soft" aria-hidden />
                        <h2 className="text-base font-semibold text-ink">{entry.title}</h2>
                        {entry.isNew && <Badge tone="aqua">New</Badge>}
                        <Badge className="ml-auto">{titleCase(f.plan)}+</Badge>
                      </div>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-3">{entry.short}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-aqua-soft">
                        Learn more <ArrowRight className="size-3.5 transition group-hover:translate-x-1" aria-hidden />
                      </span>
                    </Link>
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
          <Glass className="mt-10 flex flex-col items-center justify-between gap-4 rounded-[26px] p-6 text-center sm:flex-row sm:text-left">
            <p className="text-sm text-ink-2">
              <span className="font-semibold text-ink">Every plan includes unlimited users</span>, free data import, iPhone & Android apps
              and live chat support.
            </p>
            <Link href="/pricing" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-aqua-soft hover:text-ink">
              Compare plans <ArrowRight className="size-4" />
            </Link>
          </Glass>
        </Container>
      </section>
      <CTASection />
      <JsonLd data={[breadcrumbLd(crumbs), itemList]} />
    </>
  );
}

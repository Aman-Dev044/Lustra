import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/spatial";
import { Reveal, TiltCard } from "@/components/spatial/motion";
import { CTASection, PageHero, TestimonialsSection } from "@/components/marketing/sections";
import { industryCatalog } from "@/lib/content/catalog";
import { industries } from "@/lib/content/industries";
import { breadcrumbLd, buildMetadata, JsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Industries — Detailing, PPF, Tint, Wrap & Marine",
  description:
    "Lustra is purpose-built for auto detailing, ceramic coating, paint protection film, window tint, vinyl wrap, mobile and marine detailing, flat glass, landscaping and lawn care businesses.",
  path: "/industries",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Industries", path: "/industries" },
];

export default function IndustriesPage() {
  return (
    <>
      <PageHero
        breadcrumbs={crumbs}
        eyebrow="Who it's for"
        title={
          <>
            Purpose-built for <span className="text-spectral">the trades that make things shine.</span>
          </>
        }
        description="Different services, different pricing, different days. Lustra adapts its menus, quotes, scheduling and automations to the way your kind of shop actually works."
      />
      <section aria-label="Industries" className="pb-12">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {industryCatalog.map((entry, i) => {
              const ind = industries.find((x) => x.slug === entry.slug)!;
              return (
                <Reveal key={entry.slug} delay={(i % 3) * 0.05}>
                  <TiltCard max={5}>
                    <Link
                      href={`/industries/${entry.slug}`}
                      className="group glass-2 relative flex h-80 flex-col justify-end overflow-hidden rounded-[28px] p-6"
                    >
                      <Image
                        src={ind.image}
                        alt={ind.imageAlt}
                        fill
                        sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                        className="-z-10 object-cover opacity-70 transition duration-700 group-hover:scale-105 group-hover:opacity-90"
                      />
                      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#04050a] via-[#04050a]/50 to-transparent" />
                      <span className="glass mb-auto flex size-11 items-center justify-center rounded-2xl text-aqua-soft">
                        <entry.icon className="size-5" aria-hidden />
                      </span>
                      <h2 className="text-xl font-semibold text-white">{entry.title}</h2>
                      <p className="mt-1.5 text-sm text-ink-2">{entry.short}</p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-aqua-soft">
                        See how it works <ArrowRight className="size-3.5 transition group-hover:translate-x-1" aria-hidden />
                      </span>
                    </Link>
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>
      <TestimonialsSection limit={3} />
      <CTASection />
      <JsonLd data={breadcrumbLd(crumbs)} />
    </>
  );
}

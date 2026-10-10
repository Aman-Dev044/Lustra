import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Quote, Star, X } from "lucide-react";
import { Button, Container, Glass, SectionHeading } from "@/components/spatial";
import { Reveal, TiltCard } from "@/components/spatial/motion";
import { CTASection, FAQSection, PageHero, PricingPreview, SpatialImage } from "@/components/marketing/sections";
import { featureMocks } from "@/components/marketing/mocks";
import { featureCatalog, industryCatalog } from "@/lib/content/catalog";
import { industries, industryBySlug } from "@/lib/content/industries";
import { breadcrumbLd, buildMetadata, faqLd, JsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ind = industryBySlug(slug);
  if (!ind) return {};
  return buildMetadata({
    title: ind.seo.title,
    description: ind.seo.description,
    keywords: ind.seo.keywords,
    path: `/industries/${ind.slug}`,
  });
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ind = industryBySlug(slug);
  if (!ind) notFound();
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Industries", path: "/industries" },
    { name: ind.title, path: `/industries/${ind.slug}` },
  ];
  const highlighted = ind.features
    .map((s) => featureCatalog.find((c) => c.slug === s))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  const LeadMock = featureMocks[ind.features[0] ?? ""];

  return (
    <>
      <PageHero
        breadcrumbs={crumbs}
        eyebrow={ind.eyebrow}
        title={ind.headline}
        description={ind.subhead}
        actions={
          <>
            <Button href="/signup" size="lg">
              Start free <ArrowRight className="size-4" />
            </Button>
            <Button href="/pricing" size="lg" variant="secondary">
              See pricing
            </Button>
          </>
        }
      >
        <div className="relative mt-14">
          <SpatialImage src={ind.image} alt={ind.imageAlt} priority className="h-72 sm:h-[480px]" sizes="(min-width: 1280px) 1200px, 100vw">
              <div className="absolute right-4 bottom-4 left-4 grid grid-cols-3 gap-2 sm:right-auto sm:bottom-8 sm:left-8 sm:w-[460px]">
                {ind.stats.map((s) => (
                  <div key={s.label} className="glass-2 rounded-2xl p-3 text-center">
                    <p className="text-lg font-semibold text-white sm:text-xl">{s.value}</p>
                    <p className="text-[11px] leading-tight text-ink-2">{s.label}</p>
                  </div>
                ))}
              </div>
            </SpatialImage>
          {LeadMock && (
            <div className="absolute -top-6 right-6 hidden w-80 animate-float lg:block">
              <LeadMock />
            </div>
          )}
        </div>
      </PageHero>

      <section className="py-20" aria-labelledby="pains-title">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Sound familiar?" title={<span id="pains-title">The headaches Lustra takes off your plate</span>} />
          </Reveal>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {ind.pains.map((p, i) => (
              <Reveal key={p.pain} delay={i * 0.06}>
                <Glass className="h-full p-6">
                  <p className="flex gap-3 text-sm text-ink-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger">
                      <X className="size-3.5" aria-hidden />
                    </span>
                    {p.pain}
                  </p>
                  <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <p className="flex gap-3 text-[15px] font-medium text-ink">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                      <Check className="size-3.5" aria-hidden />
                    </span>
                    {p.solution}
                  </p>
                </Glass>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20" aria-labelledby="menu-title">
        <Container>
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.1fr]">
            <Reveal>
              <SectionHeading
                align="left"
                eyebrow="Ready-made service menu"
                title={<span id="menu-title">Start with a proven {ind.title.toLowerCase()} price book.</span>}
                description="When you sign up, Lustra pre-loads a menu like this with typical market prices and durations. Change anything — Copilot, booking and invoices follow your numbers."
              />
              <p className="mt-4 text-xs text-ink-4">Example prices for illustration; set your own in Settings → Services.</p>
            </Reveal>
            <Reveal delay={0.1}>
              <Glass tier={2} rim className="overflow-hidden p-2">
                <table className="w-full text-sm">
                  <caption className="sr-only">Example {ind.title} service menu</caption>
                  <thead>
                    <tr className="text-left text-[11px] tracking-[0.1em] text-ink-4 uppercase">
                      <th scope="col" className="px-5 py-3 font-semibold">Service</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Duration</th>
                      <th scope="col" className="px-5 py-3 text-right font-semibold">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ind.menu.map((m) => (
                      <tr key={m.name} className="border-t border-white/[0.05]">
                        <td className="px-5 py-3.5 text-ink">{m.name}</td>
                        <td className="px-5 py-3.5 text-ink-3">{m.duration}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-ink tabular-nums">{m.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Glass>
            </Reveal>
          </div>
        </Container>
      </section>

      <section className="py-20" aria-labelledby="tools-title">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Your toolkit" title={<span id="tools-title">The features {ind.title.toLowerCase()} pros lean on most</span>} />
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {highlighted.map((c, i) => {
              const Mock = featureMocks[c.slug];
              return (
                <Reveal key={c.slug} delay={(i % 2) * 0.06}>
                  <TiltCard max={4}>
                    <Link href={`/features/${c.slug}`} className="group glass grid h-full gap-5 rounded-[26px] p-5 sm:grid-cols-[1fr_1.1fr]">
                      <div className="flex flex-col">
                        <span className="glass-2 flex size-10 items-center justify-center rounded-xl text-aqua-soft">
                          <c.icon className="size-5" aria-hidden />
                        </span>
                        <h3 className="mt-4 text-lg font-semibold text-ink">{c.title}</h3>
                        <p className="mt-1.5 flex-1 text-sm text-ink-3">{c.short}</p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm text-aqua-soft">
                          Learn more <ArrowRight className="size-3.5 transition group-hover:translate-x-1" aria-hidden />
                        </span>
                      </div>
                      <div className="pointer-events-none">{Mock && <Mock />}</div>
                    </Link>
                  </TiltCard>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="py-20" aria-label="Customer story">
        <Container className="max-w-4xl">
          <Reveal>
            <Glass tier={2} rim as="figure" className="relative p-8 sm:p-12">
              <Quote className="absolute top-8 right-8 size-14 text-white/[0.05]" aria-hidden />
              <div className="flex gap-0.5 text-warning" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="size-4 fill-current" aria-hidden />
                ))}
              </div>
              <blockquote className="mt-5 text-xl leading-relaxed font-medium tracking-tight text-ink sm:text-2xl">
                “{ind.testimonial.quote}”
              </blockquote>
              <figcaption className="mt-6 text-sm text-ink-3">
                <span className="font-semibold text-ink">{ind.testimonial.name}</span> · {ind.testimonial.role},{" "}
                {ind.testimonial.business} · {ind.testimonial.city}
              </figcaption>
            </Glass>
          </Reveal>
        </Container>
      </section>

      <PricingPreview />
      <FAQSection faqs={ind.faqs} title={`${ind.title} software FAQ`} />

      <section aria-labelledby="other-ind" className="py-12">
        <Container>
          <h2 id="other-ind" className="mb-6 text-lg font-semibold">
            Other industries
          </h2>
          <div className="flex flex-wrap gap-2">
            {industryCatalog
              .filter((c) => c.slug !== ind.slug)
              .map((c) => (
                <Link key={c.slug} href={`/industries/${c.slug}`} className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-ink-2 transition hover:text-ink">
                  <c.icon className="size-4 text-aqua-soft" aria-hidden /> {c.title}
                </Link>
              ))}
          </div>
        </Container>
      </section>

      <CTASection title={`Built for ${ind.title.toLowerCase()}. Ready when you are.`} />
      <JsonLd data={[breadcrumbLd(crumbs), faqLd(ind.faqs)]} />
    </>
  );
}

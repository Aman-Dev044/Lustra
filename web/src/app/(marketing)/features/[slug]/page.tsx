import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { Badge, Button, Container, Glass, SectionHeading } from "@/components/spatial";
import { Reveal, TiltCard } from "@/components/spatial/motion";
import { CTASection, FAQSection, PageHero, SpatialImage } from "@/components/marketing/sections";
import { featureMocks } from "@/components/marketing/mocks";
import { featureCatalog } from "@/lib/content/catalog";
import { featureBySlug, features } from "@/lib/content/features";
import { breadcrumbLd, buildMetadata, faqLd, JsonLd } from "@/lib/seo";
import { titleCase } from "@/lib/utils";

export function generateStaticParams() {
  return features.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = featureBySlug(slug);
  if (!f) return {};
  return buildMetadata({
    ownImage: true,
    title: f.seo.title,
    description: f.seo.description,
    keywords: f.seo.keywords,
    path: `/features/${f.slug}`,
  });
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = featureBySlug(slug);
  if (!f) notFound();
  const Mock = featureMocks[f.slug];
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Features", path: "/features" },
    { name: f.title, path: `/features/${f.slug}` },
  ];
  const related = f.related.map((s) => featureCatalog.find((c) => c.slug === s)).filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <>
      <PageHero
        breadcrumbs={crumbs}
        eyebrow={f.eyebrow}
        title={f.headline}
        description={f.subhead}
        actions={
          <>
            <Button href={`/signup?plan=${f.plan}`} size="lg">
              Start free <ArrowRight className="size-4" />
            </Button>
            <Button href="/contact?topic=demo" size="lg" variant="secondary">
              Book a demo
            </Button>
            <Badge tone="iris" className="self-center">
              Included in {titleCase(f.plan)}
              {f.plan !== "enterprise" ? " and up" : ""}
            </Badge>
          </>
        }
      >
        <div className="mt-14 grid items-stretch gap-4 lg:grid-cols-[1.35fr_1fr]">
          <SpatialImage src={f.image} alt={f.imageAlt} priority className="h-72 sm:h-[440px]" sizes="(min-width: 1024px) 760px, 100vw" />
          <Reveal delay={0.1}>
            <TiltCard max={6}>
              <div className="flex h-full flex-col justify-center gap-4">
                {Mock && <Mock />}
                <div className="grid grid-cols-3 gap-2">
                  {f.stats.map((s) => (
                    <Glass key={s.label} className="rounded-2xl p-3 text-center">
                      <p className="text-lg font-semibold tracking-tight text-ink">{s.value}</p>
                      <p className="mt-0.5 text-[11px] leading-tight text-ink-3">{s.label}</p>
                    </Glass>
                  ))}
                </div>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </PageHero>

      <section className="py-20" aria-labelledby="benefits-title">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Why it matters" title={<span id="benefits-title">What {f.title} does for your shop</span>} />
          </Reveal>
          <div className={`mt-12 grid gap-4 sm:grid-cols-2 ${f.benefits.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {f.benefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.06}>
                <Glass className="h-full p-6">
                  <span className="glass-2 flex size-11 items-center justify-center rounded-2xl text-aqua-soft">
                    <b.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-base font-semibold text-ink">{b.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-3">{b.body}</p>
                </Glass>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20" aria-labelledby="how-title">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2">
            <Reveal>
              <SectionHeading align="left" eyebrow="How it works" title={<span id="how-title">Set up in minutes, felt on day one.</span>} />
              <ol className="mt-10 space-y-4">
                {f.steps.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="bg-spectral flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-ink">{s.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-3">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
            <Reveal delay={0.1}>
              <Glass tier={2} rim className="h-full p-8">
                <h3 className="text-sm font-semibold tracking-[0.14em] text-aqua-soft uppercase">Highlights</h3>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {f.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2.5 text-sm text-ink-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-aqua" aria-hidden /> {h}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 border-t border-white/[0.07] pt-6">
                  <p className="text-sm text-ink-3">Works seamlessly with</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {related.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/features/${r.slug}`}
                        className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm text-ink-2 transition hover:text-ink"
                      >
                        <r.icon className="size-4 text-aqua-soft" aria-hidden />
                        {r.title}
                      </Link>
                    ))}
                  </div>
                </div>
              </Glass>
            </Reveal>
          </div>
        </Container>
      </section>

      <FAQSection faqs={f.faqs} title={`${f.title} FAQ`} />

      <section aria-labelledby="more-title" className="py-12">
        <Container>
          <h2 id="more-title" className="mb-6 text-lg font-semibold">
            Explore more features
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featureCatalog
              .filter((c) => c.slug !== f.slug)
              .slice(0, 8)
              .map((c) => (
                <Link key={c.slug} href={`/features/${c.slug}`} className="glass group flex items-start gap-3 rounded-2xl p-4 transition hover:bg-white/[0.07]">
                  <c.icon className="mt-0.5 size-4 shrink-0 text-aqua-soft" aria-hidden />
                  <span>
                    <span className="block text-sm font-medium text-ink">{c.title}</span>
                    <span className="mt-0.5 block text-xs text-ink-3">{c.short}</span>
                  </span>
                </Link>
              ))}
          </div>
        </Container>
      </section>

      <CTASection title={`Put ${f.title} to work this week.`} />
      <JsonLd data={[breadcrumbLd(crumbs), faqLd(f.faqs)]} />
    </>
  );
}

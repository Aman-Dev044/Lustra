import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Badge, Container, Glass } from "@/components/spatial";
import { Reveal, TiltCard } from "@/components/spatial/motion";
import { CTASection, PageHero } from "@/components/marketing/sections";
import { articleDate, posts, readingMinutes } from "@/lib/content/blog";
import { breadcrumbLd, buildMetadata, JsonLd } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";


export const metadata = buildMetadata({
  title: "Blog — Pricing & Growth for Detailing Shops",
  description:
    "Practical guides for detailing, ceramic coating, PPF, tint and mobile detailing businesses: pricing playbooks, operations, automation and growth strategies.",
  path: "/blog",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Blog", path: "/blog" },
];

export default function BlogPage() {
  const [featured, ...rest] = [...posts].sort((a, b) => b.published.localeCompare(a.published));
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${site.name} Blog`,
    url: absoluteUrl("/blog"),
    publisher: { "@id": `${site.url}/#organization` },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: absoluteUrl(`/blog/${p.slug}`),
      datePublished: p.published,
      dateModified: p.updated,
    })),
  };

  return (
    <>
      <PageHero
        breadcrumbs={crumbs}
        eyebrow="The Lustra Journal"
        title={
          <>
            Run a sharper shop. <span className="text-spectral">Written by people who’ve run one.</span>
          </>
        }
        description="Pricing playbooks, operations guides and growth strategies for detailing, coating, PPF, tint and mobile pros."
      />
      <section aria-label="Articles" className="pb-12">
        <Container>
          {featured && (
            <Reveal>
              <Link href={`/blog/${featured.slug}`} className="group glass-2 rim grid overflow-hidden rounded-[30px] lg:grid-cols-2">
                <div className="relative h-64 lg:h-auto lg:min-h-[380px]">
                  <Image src={featured.image} alt={featured.imageAlt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
                </div>
                <div className="flex flex-col justify-center p-8 sm:p-12">
                  <div className="flex items-center gap-3 text-xs text-ink-3">
                    <Badge tone="aqua">{featured.category}</Badge>
                    <time dateTime={featured.published}>{articleDate(featured.published)}</time>
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{featured.title}</h2>
                  <p className="mt-3 text-ink-2">{featured.description}</p>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-aqua-soft">
                    Read article <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
                  </span>
                </div>
              </Link>
            </Reveal>
          )}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 3) * 0.05}>
                <TiltCard max={4}>
                  <Glass as="article" className="group h-full overflow-hidden rounded-[26px]">
                    <Link href={`/blog/${p.slug}`} className="flex h-full flex-col">
                      <div className="relative h-48">
                        <Image src={p.image} alt={p.imageAlt} fill sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-void/85 to-transparent" />
                        <Badge tone="aqua" className="absolute top-4 left-4">
                          {p.category}
                        </Badge>
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <h2 className="text-lg font-semibold tracking-tight text-ink">{p.title}</h2>
                        <p className="mt-2 line-clamp-3 flex-1 text-sm text-ink-3">{p.description}</p>
                        <p className="mt-4 flex items-center gap-3 text-xs text-ink-4">
                          <time dateTime={p.published}>{articleDate(p.published)}</time>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" aria-hidden /> {readingMinutes(p.body)} min read
                          </span>
                        </p>
                      </div>
                    </Link>
                  </Glass>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
      <CTASection />
      <JsonLd data={[breadcrumbLd(crumbs), blogLd]} />
    </>
  );
}

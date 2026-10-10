import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock } from "lucide-react";
import { Avatar, Badge, Button, Container, Glass } from "@/components/spatial";
import { ArticleBody } from "@/components/marketing/article-body";
import { Breadcrumbs, CTASection } from "@/components/marketing/sections";
import { articleDate, headingsOf, postBySlug, posts, readingMinutes } from "@/lib/content/blog";
import { breadcrumbLd, buildMetadata, JsonLd } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";


export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) return {};
  return buildMetadata({
    ownImage: true,
    title: post.title,
    // Long article headlines already carry the keyword; skip the brand suffix to stay within ~65 chars.
    absoluteTitle: post.title.length > 55,
    description: post.description,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
    type: "article",
    publishedTime: post.published,
    modifiedTime: post.updated,
    authors: [post.author.name],
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();
  const toc = headingsOf(post.body);
  const minutes = readingMinutes(post.body);
  const related = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ];
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: [absoluteUrl(post.image)],
    datePublished: post.published,
    dateModified: post.updated,
    wordCount: post.body.split(/\s+/).length,
    keywords: post.keywords.join(", "),
    articleSection: post.category,
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/blog/${post.slug}`) },
    author: { "@type": "Person", name: post.author.name, jobTitle: post.author.role },
    publisher: { "@id": `${site.url}/#organization` },
  };

  return (
    <>
      <article className="pt-32 sm:pt-40">
        <Container className="max-w-4xl">
          <Breadcrumbs items={crumbs} />
          <header>
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-3">
              <Badge tone="aqua">{post.category}</Badge>
              <time dateTime={post.published}>{articleDate(post.published)}</time>
              <span className="flex items-center gap-1">
                <Clock className="size-3" aria-hidden /> {minutes} min read
              </span>
            </div>
            <h1 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-[-0.04em] text-balance sm:text-5xl">{post.title}</h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-2">{post.description}</p>
            <div className="mt-6 flex items-center gap-3">
              <Avatar name={post.author.name} size={40} />
              <div className="text-sm">
                <p className="font-medium text-ink">{post.author.name}</p>
                <p className="text-ink-3">{post.author.role}</p>
              </div>
            </div>
          </header>
          <div className="glass-2 rim relative mt-10 overflow-hidden rounded-[28px] p-2">
            <div className="relative aspect-[16/8] overflow-hidden rounded-[22px]">
              <Image src={post.image} alt={post.imageAlt} fill priority sizes="(min-width: 1024px) 900px, 100vw" className="object-cover" />
            </div>
          </div>
        </Container>

        <Container className="mt-12 grid max-w-6xl gap-10 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <nav aria-label="Table of contents" className="sticky top-28">
              <p className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-ink-4 uppercase">On this page</p>
              <ol className="space-y-2 border-l border-white/10 text-sm">
                {toc.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className="-ml-px block border-l border-transparent pl-4 text-ink-3 transition hover:border-aqua hover:text-ink">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
          <div className="min-w-0 max-w-3xl">
            <ArticleBody body={post.body} />
            <Glass tier={2} rim className="mt-14 flex flex-col items-start gap-5 rounded-[26px] p-7 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="text-lg font-semibold">Put this playbook to work in Lustra</p>
                <p className="mt-1 text-sm text-ink-3">Size-aware pricing, automated reminders and memberships are built in. Try it free for 14 days.</p>
              </div>
              <Button href="/signup">
                Start free <ArrowRight className="size-4" />
              </Button>
            </Glass>
          </div>
        </Container>
      </article>

      <section aria-labelledby="related-title" className="pt-20">
        <Container>
          <h2 id="related-title" className="mb-6 text-xl font-semibold">
            Keep reading
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {related.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="group glass flex flex-col overflow-hidden rounded-[24px] transition hover:bg-white/[0.07]">
                <div className="relative h-40">
                  <Image src={p.image} alt={p.imageAlt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <p className="text-xs text-aqua-soft">{p.category}</p>
                  <h3 className="mt-1 font-semibold text-ink">{p.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>
      <CTASection />
      <JsonLd data={[breadcrumbLd(crumbs), articleLd]} />
    </>
  );
}

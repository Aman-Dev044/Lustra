import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowRight, Check, ChevronRight, Plus, Quote, Star } from "lucide-react";
import { Badge, Button, Container, Glass, SectionHeading } from "@/components/spatial";
import { Reveal } from "@/components/spatial/motion";
import { industryCatalog } from "@/lib/content/catalog";
import { testimonials } from "@/lib/content/marketing";
import { pricingPlans } from "@/lib/plans";
import { cn } from "@/lib/utils";

/* ── Visible breadcrumbs (paired with BreadcrumbList JSON-LD on each page) ── */

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-4">
        {items.map((item, i) => (
          <li key={item.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3" aria-hidden />}
            {i === items.length - 1 ? (
              <span aria-current="page" className="text-ink-3">
                {item.name}
              </span>
            ) : (
              <Link href={item.path} className="transition hover:text-ink">
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ── Inner-page hero ───────────────────────────────────────────────────── */

export function PageHero({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: { name: string; path: string }[];
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-20">
      <div className="grid-floor pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]" aria-hidden />
      <Container>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <SectionHeading as="h1" align="left" eyebrow={eyebrow} title={title} description={description} className="max-w-3xl" />
        {actions && (
          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-wrap gap-3">{actions}</div>
          </Reveal>
        )}
        {children}
      </Container>
    </section>
  );
}

/* ── FAQ accordion (native details/summary: zero JS, crawlable) ─────────── */

export function FAQSection({
  faqs,
  title = "Questions, answered",
  eyebrow = "FAQ",
  id = "faq",
}: {
  faqs: { q: string; a: string }[];
  title?: string;
  eyebrow?: string;
  id?: string;
}) {
  return (
    <section id={id} className="py-24" aria-labelledby={`${id}-title`}>
      <Container className="max-w-4xl">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-xs font-medium tracking-[0.14em] text-aqua-soft uppercase">{eyebrow}</p>
            <h2 id={`${id}-title`} className="text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
              {title}
            </h2>
          </div>
        </Reveal>
        <div className="mt-12 space-y-3">
          {faqs.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.04}>
              <details className="group glass rounded-[22px] px-6 py-1 open:bg-ink/[0.07]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="glass-inset flex size-8 shrink-0 items-center justify-center rounded-full transition group-open:rotate-45">
                    <Plus className="size-4 text-aqua-soft" aria-hidden />
                  </span>
                </summary>
                <p className="pb-5 text-sm leading-relaxed text-ink-2">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ── Final call to action ──────────────────────────────────────────────── */

export function CTASection({
  title = "Your shop, like a flagship showroom.",
  description = "Start a 14-day free trial. Unlimited users, free data import, no credit card, no contracts.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="py-24" aria-labelledby="cta-title">
      <Container>
        <Reveal>
          <Glass tier={2} rim className="relative overflow-hidden rounded-[36px] px-6 py-16 text-center sm:px-16 sm:py-20">
            <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-iris/30 blur-[110px]" aria-hidden />
            <div className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-[40rem] rounded-full bg-aqua/20 blur-[110px]" aria-hidden />
            <div className="relative">
              <h2 id="cta-title" className="text-spectral mx-auto max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
                {title}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base text-ink-2 sm:text-lg">{description}</p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Button href="/signup" size="lg">
                  Start free trial <ArrowRight className="size-4" />
                </Button>
                <Button href="/contact?topic=demo" size="lg" variant="secondary">
                  Book a live demo
                </Button>
              </div>
              <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-ink-3">
                {["Unlimited users", "Free data import", "Cancel anytime", "Web · iPhone · Android"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-aqua" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </Glass>
        </Reveal>
      </Container>
    </section>
  );
}

/* ── Testimonials ──────────────────────────────────────────────────────── */

export function TestimonialsSection({ limit = 6 }: { limit?: number }) {
  return (
    <section className="py-24" aria-labelledby="testimonials-title">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Loved by shop owners"
            title={<span id="testimonials-title">Built with installers, not just for them.</span>}
            description="Thousands of detailing, coating, PPF, tint and wrap pros run their entire day on Lustra."
          />
        </Reveal>
        <div className="mt-14 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {testimonials.slice(0, limit).map((t, i) => (
            <Reveal key={t.name} delay={(i % 3) * 0.06} className="mb-4 break-inside-avoid">
              <Glass as="figure" className="relative p-6">
                <Quote className="absolute top-5 right-5 size-8 text-ink/[0.07]" aria-hidden />
                <div className="flex gap-0.5 text-warning" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="size-3.5 fill-current" aria-hidden />
                  ))}
                </div>
                <blockquote className="mt-4 text-[15px] leading-relaxed text-ink">“{t.quote}”</blockquote>
                <figcaption className="mt-5 flex items-center justify-between gap-3 border-t border-ink/[0.06] pt-4">
                  <div>
                    <p className="text-sm font-medium text-ink">{t.name}</p>
                    <p className="text-xs text-ink-3">
                      {t.role} · {t.city}
                    </p>
                  </div>
                  <Badge tone="aqua">{t.metric}</Badge>
                </figcaption>
              </Glass>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ── Industries marquee ────────────────────────────────────────────────── */

export function IndustriesMarquee() {
  const items = [...industryCatalog, ...industryCatalog];
  return (
    <section aria-label="Industries we serve" className="relative overflow-hidden py-10 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
      <ul className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
        {items.map((ind, i) => (
          <li key={`${ind.slug}-${i}`} aria-hidden={i >= industryCatalog.length || undefined}>
            <Link
              href={`/industries/${ind.slug}`}
              tabIndex={i >= industryCatalog.length ? -1 : undefined}
              className="glass flex items-center gap-2.5 rounded-full px-5 py-3 text-sm text-ink-2 transition hover:text-ink"
            >
              <ind.icon className="size-4 text-aqua-soft" aria-hidden />
              {ind.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Gallery marquee: a slow-moving strip of real work ─────────────────── */

const galleryShots = [
  { src: "/images/wheel-bronze.webp", alt: "Bronze forged wheel on a black sports car after a ceramic wheel coating", label: "Wheel & caliper coating" },
  { src: "/images/interior-luxury.webp", alt: "Freshly detailed luxury interior with cream leather and gloss trim", label: "Interior restoration" },
  { src: "/images/ppf-install.webp", alt: "Installer squeegeeing paint protection film across a hood", label: "Paint protection film" },
  { src: "/images/hex-garage.webp", alt: "Supercars under hexagon detailing lights in a studio", label: "Studio finishing" },
  { src: "/images/wheel-red-caliper.webp", alt: "Black alloy wheel with red brake caliper on a red performance car", label: "Track-pack protection" },
  { src: "/images/tint-dark.webp", alt: "Dark sedan with ceramic window tint at dusk", label: "Ceramic window tint" },
  { src: "/images/foam-wash.webp", alt: "Detailer applying snow foam to a red car", label: "Maintenance washes" },
  { src: "/images/interior-sport.webp", alt: "Sport steering wheel and carbon dashboard after interior detailing", label: "Cockpit detailing" },
  { src: "/images/wheel-gold.webp", alt: "Gold mesh wheel on a lowered black coupe", label: "Show-car prep" },
];

export function GalleryMarquee() {
  const items = [...galleryShots, ...galleryShots];
  return (
    <section
      aria-label="Work from shops on Lustra"
      className="relative overflow-hidden py-14 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]"
    >
      <ul className="flex w-max animate-marquee-slow gap-5 hover:[animation-play-state:paused]">
        {items.map((shot, i) => (
          <li key={`${shot.src}-${i}`} aria-hidden={i >= galleryShots.length || undefined}>
            <figure className="group sheen relative h-72 w-56 overflow-hidden rounded-[26px] border border-white/10 sm:h-96 sm:w-72">
              <Image
                src={shot.src}
                alt={i >= galleryShots.length ? "" : shot.alt}
                fill
                sizes="288px"
                className="object-cover transition duration-[1200ms] ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-scrim/85 via-scrim/10 to-transparent" />
              <figcaption className="on-photo absolute right-4 bottom-4 left-4 text-sm font-medium">
                <span className="mb-1.5 block h-px w-8 bg-iris" aria-hidden />
                {shot.label}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Pricing preview (home & industry pages) ───────────────────────────── */

export function PricingPreview() {
  return (
    <section className="py-24" aria-labelledby="pricing-preview-title">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Simple, honest pricing"
            title={<span id="pricing-preview-title">Same price as the old way. Light-years more inside.</span>}
            description="Unlimited users on every plan. No contracts, no setup fees, free data import."
          />
        </Reveal>
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {pricingPlans.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <Glass
                tier={p.highlight ? 2 : 1}
                rim={p.highlight}
                className={cn("relative flex h-full flex-col p-7", p.highlight && "lg:-translate-y-3")}
              >
                {p.highlight && (
                  <Badge tone="aqua" className="absolute top-6 right-6">
                    Most popular
                  </Badge>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-1 min-h-10 text-sm text-ink-3">{p.tagline}</p>
                <p className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold tracking-[-0.04em]">${p.monthly}</span>
                  <span className="text-sm text-ink-3">/month</span>
                </p>
                <p className="mt-1 text-xs text-ink-4">or ${p.yearly.toLocaleString("en-US")} billed yearly</p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink-2">
                  {p.inherits && <li className="text-xs font-medium text-ink-3">{p.inherits}</li>}
                  {p.features.slice(0, 6).map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-aqua" aria-hidden /> {f}
                    </li>
                  ))}
                </ul>
                <Button href={`/signup?plan=${p.id}`} variant={p.highlight ? "primary" : "secondary"} className="mt-8 w-full">
                  Start {p.name} free
                </Button>
              </Glass>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-ink-3">
          Add the interactive 3D Visualizer for $150/month.{" "}
          <Link href="/pricing" className="text-aqua-soft underline-offset-4 hover:underline">
            Compare every feature →
          </Link>
        </p>
      </Container>
    </section>
  );
}

/* ── Image panel framed as a floating spatial window ───────────────────── */

export function SpatialImage({
  src,
  alt,
  priority,
  className,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  children,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("glass-2 rim relative overflow-hidden rounded-[30px] p-2", className)}>
      <div className="relative h-full overflow-hidden rounded-[24px]">
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" quality={75} />
        <div className="absolute inset-0 bg-gradient-to-t from-scrim/60 via-transparent to-transparent" aria-hidden />
        {children}
      </div>
    </div>
  );
}

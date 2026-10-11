import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Box, Check, Play, Smartphone, Star } from "lucide-react";
import { Badge, Button, Container, Glass, SectionHeading } from "@/components/spatial";
import { CountUp, Reveal, TiltCard } from "@/components/spatial/motion";
import { HeroVisual } from "@/components/marketing/hero-visual";
import {
  AutomationMock,
  BoardMock,
  CapacityMock,
  CertificateMock,
  CopilotMock,
  CampaignMock,
  InsightsMock,
  IntegrationsMock,
  ReviewsMock,
  RouteMock,
  InspectionMock,
  MembershipMock,
  PortalMock,
} from "@/components/marketing/mocks";
import {
  CTASection,
  FAQSection,
  IndustriesMarquee,
  GalleryMarquee,
  PricingPreview,
  TestimonialsSection,
} from "@/components/marketing/sections";
import { homeFaqs, trustStats } from "@/lib/content/marketing";
import { buildMetadata, faqLd, JsonLd } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "Lustra — Detailing, PPF & Tint Shop Software",
  description:
    "The operating system for auto appearance shops. Live job board, AI Quote Copilot, online booking, customer portal, payments, inspections, warranty certificates and memberships — from $70/month with unlimited users.",
  path: "/",
  absoluteTitle: true,
});

const bento = [
  {
    title: "Live Job Board",
    body: "A real-time kanban for every bay. Move a car and every screen — and the customer's portal — updates instantly.",
    href: "/features/live-job-board",
    Mock: BoardMock,
    className: "lg:col-span-2",
  },
  {
    title: "AI Quote Copilot",
    body: "Type what the customer said. Get an itemized, size-adjusted quote from your own price book.",
    href: "/features/quote-copilot",
    Mock: CopilotMock,
    className: "",
  },
  {
    title: "Live Customer Portal",
    body: "One link to track progress, approve add-ons, sign and pay. No app, no login.",
    href: "/features/customer-portal",
    Mock: PortalMock,
    className: "",
  },
  {
    title: "Warranty Certificates + QR",
    body: "Verifiable coating and PPF certificates that add real resale value.",
    href: "/features/warranty-certificates",
    Mock: CertificateMock,
    className: "",
  },
  {
    title: "Memberships",
    body: "Wash clubs and maintenance plans that bill themselves every month.",
    href: "/features/memberships",
    Mock: MembershipMock,
    className: "",
  },
  {
    title: "Workflow Automations",
    body: "If a coating is completed, wait 11 months, then offer maintenance. Built visually, runs forever.",
    href: "/features/workflow-automations",
    Mock: AutomationMock,
    className: "",
  },
  {
    title: "Bay Capacity Planner",
    body: "An hour-by-hour heatmap of every bay, so you fill gaps before they cost you.",
    href: "/features/smart-scheduling",
    Mock: CapacityMock,
    className: "",
  },
  {
    title: "Digital Inspections",
    body: "Damage pins, HD photo & video and e-signatures — liability protection in 90 seconds.",
    href: "/features/digital-inspections",
    Mock: InspectionMock,
    className: "lg:col-span-1",
  },
  {
    title: "AI Insights",
    body: "A 30-day revenue forecast, a churn radar for your regulars and opportunities ranked by dollar impact.",
    href: "/features/ai-insights",
    Mock: InsightsMock,
    className: "",
  },
  {
    title: "Smart Campaigns",
    body: "Text the coating-anniversary crowd or lapsed regulars in two minutes — and see exactly what it booked.",
    href: "/features/smart-campaigns",
    Mock: CampaignMock,
    className: "",
  },
  {
    title: "Reputation Hub",
    body: "Automatic review requests, every source in one feed, and AI-drafted replies that sound like you.",
    href: "/features/reputation-hub",
    Mock: ReviewsMock,
    className: "",
  },
  {
    title: "Mobile Routing",
    body: "Optimized stop order per technician, on-my-way ETA texts and one-tap navigation for crews on the road.",
    href: "/features/mobile-routing",
    Mock: RouteMock,
    className: "",
  },
  {
    title: "Integrations & API",
    body: "QuickBooks, Stripe, Square and Zapier — plus API keys, signed webhooks and CSV import/export.",
    href: "/features/integrations-api",
    Mock: IntegrationsMock,
    className: "lg:col-span-2",
  },
];

const journey = [
  {
    step: "Lead",
    title: "Capture every inquiry — even at midnight",
    body: "Booking page, lead forms and the 3D Visualizer turn Instagram scrollers into real requests with a vehicle and a budget attached.",
    image: "/images/night-performance.webp",
    alt: "Black sports car at night with glowing tail lights",
  },
  {
    step: "Quote",
    title: "Quote in seconds, close with a signature",
    body: "Copilot drafts the quote; the customer toggles add-ons, signs and pays a deposit from their phone.",
    image: "/images/paint-correction.webp",
    alt: "Detailer machine-polishing a black hood",
  },
  {
    step: "Book",
    title: "Only book what your bays can deliver",
    body: "Bay-aware availability and line-item scheduling keep multi-day PPF and quick tints from colliding.",
    image: "/images/tint-dark.webp",
    alt: "Dark tinted sedan in a garage",
  },
  {
    step: "Inspect",
    title: "Document every chip before you start",
    body: "Pin damage on a vehicle map, attach photos and get it signed. Disputes end in two taps.",
    image: "/images/red-coupe.webp",
    alt: "Red coupe ready for inspection",
  },
  {
    step: "Work",
    title: "Run the floor from one live board",
    body: "Techs clock in, check off steps and move cards. The customer watches progress in real time.",
    image: "/images/ppf-install.webp",
    alt: "Installer applying paint protection film to a hood",
  },
  {
    step: "Pay",
    title: "Get paid before the car leaves",
    body: "Text-to-pay, tap-to-pay, financing and tips — reconciled to the job and the tech automatically.",
    image: "/images/ceramic-polish.webp",
    alt: "Technician polishing a car's paint",
  },
  {
    step: "Retain",
    title: "Turn one visit into a lifetime",
    body: "Warranty certificates, review requests, maintenance reminders and memberships bring them back.",
    image: "/images/foam-wash.webp",
    alt: "Maintenance snow-foam wash on a red car",
  },
];

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: site.name,
  url: site.url,
  description: site.description,
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Shop management software",
  operatingSystem: "Web, iOS, Android",
  image: absoluteUrl("/opengraph-image"),
  publisher: { "@id": `${site.url}/#organization` },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: "70",
    highPrice: "183",
    offerCount: "3",
    url: absoluteUrl("/pricing"),
  },
  aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", ratingCount: "1200", bestRating: "5" },
};

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      {/* Full-bleed showroom: the photo slowly pushes in while a light band sweeps the frame */}
      <section className="relative flex min-h-[100svh] items-end overflow-hidden pb-16 sm:pb-24" aria-labelledby="hero-title">
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <Image
            src="/images/showroom-black.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            quality={85}
            className="animate-ken-burns object-cover object-[60%_55%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-void via-void/55 to-void/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-void/90 via-void/40 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-[35vw] animate-sweep bg-gradient-to-r from-transparent via-white/[0.06] to-transparent [animation-duration:9s]" />
        </div>
        <Container className="relative grid items-end gap-12 pt-36 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <Reveal>
              <Link
                href="/features/quote-copilot"
                className="glass inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs text-ink-2 transition hover:text-ink"
              >
                <Badge tone="iris">New</Badge>
                AI Quote Copilot is live on Pro & Enterprise
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Reveal>
            <h1
              id="hero-title"
              className="mt-7 max-w-4xl text-[44px] leading-[0.98] font-bold text-balance sm:text-6xl lg:text-[86px]"
            >
              Run your detailing shop <span className="text-spectral">like a flagship showroom.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-pretty text-ink-2 sm:text-lg">
              Lustra is the operating system for detailing, ceramic coating, PPF, tint and wrap pros. Book, quote,
              schedule, inspect, get paid and keep customers coming back — all live, all in one place.
            </p>
            <Reveal delay={0.18}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button href="/signup" size="lg" className="sheen-loop">
                  Start free <ArrowRight className="size-4" />
                </Button>
                <Button href="/visualizer" size="lg" variant="secondary">
                  <Play className="size-4 fill-current" /> See it live
                </Button>
              </div>
              <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-3">
                <span className="flex items-center gap-1.5">
                  <span className="flex text-warning" aria-hidden>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-3 fill-current" />
                    ))}
                  </span>
                  4.9 from 1,200+ shops
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-iris" aria-hidden /> 14-day free trial
                </span>
                <span className="flex items-center gap-1.5">
                  <Smartphone className="size-3.5 text-iris" aria-hidden /> Web, iPhone & Android
                </span>
              </p>
            </Reveal>
          </div>
          {/* Live product chips floating over the showroom */}
          <div className="relative hidden h-full min-h-[380px] lg:block" aria-hidden>
            <div className="glass-2 absolute top-6 right-0 w-72 animate-float rounded-3xl p-4">
              <p className="flex items-center justify-between text-[11px] text-ink-3">
                <span className="font-mono">#2087 · Bay 2</span>
                <Badge tone="iris" dot>
                  In progress
                </Badge>
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">2024 Porsche 911 Carrera</p>
              <p className="text-xs text-ink-3">Ceramic 5yr + Stage 1 correction</p>
              <div className="mt-3 flex gap-1">
                {[1, 1, 0.6, 0].map((v, i) => (
                  <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-ink/10">
                    <span className="block h-full rounded-full bg-iris" style={{ width: `${v * 100}%` }} />
                  </span>
                ))}
              </div>
            </div>
            <div className="glass-2 absolute top-44 right-24 w-64 animate-float-slow rounded-3xl p-4 [animation-delay:-3s]">
              <p className="text-[11px] tracking-[0.16em] text-iris-soft uppercase">Payment received</p>
              <p className="mt-1 text-2xl font-semibold text-ink">$1,849.00</p>
              <p className="text-xs text-ink-3">Full front PPF · tip $120 · Apple Pay</p>
            </div>
            <div className="glass-2 absolute right-4 bottom-0 w-60 animate-float rounded-3xl p-4 [animation-delay:-5s]">
              <p className="flex items-center gap-2 text-xs text-ink-2">
                <span className="size-2 animate-pulse rounded-full bg-success" /> Booked online · 2 min ago
              </p>
              <p className="mt-1 text-sm font-medium text-ink">Tesla Model Y · 5-yr ceramic</p>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Product in action ───────────────────────────────────────── */}
      <section className="relative pt-8" aria-label="Lustra in a working shop">
        <Container>
          <HeroVisual />
        </Container>
      </section>

      <GalleryMarquee />

      {/* ── Trust stats ──────────────────────────────────────────────── */}
      <section aria-label="Lustra by the numbers" className="py-10">
        <Container>
          <Glass className="grid grid-cols-2 divide-ink/[0.06] rounded-[28px] lg:grid-cols-4 lg:divide-x">
            {trustStats.map((s) => (
              <div key={s.label} className="px-6 py-8 text-center">
                <p className="text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
                  <CountUp to={s.to} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals ?? 0} />
                </p>
                <p className="mt-2 text-xs text-ink-3 sm:text-sm">{s.label}</p>
              </div>
            ))}
          </Glass>
        </Container>
      </section>

      <IndustriesMarquee />

      {/* ── Bento: core tech ─────────────────────────────────────────── */}
      <section className="py-24" aria-labelledby="bento-title">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Built different"
              title={<span id="bento-title">Thirteen next-gen tools. One calm, live workspace.</span>}
              description="Everything you expect from shop software — booking, quotes, invoices, payments — rebuilt real-time, plus the tools nobody else has."
            />
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bento.map(({ title, body, href, Mock, className }, i) => (
              <Reveal key={title} delay={(i % 3) * 0.06} className={className}>
                <TiltCard max={5}>
                  <Link href={href} className="group glass flex h-full flex-col rounded-[26px] p-5 transition hover:bg-ink/[0.07]">
                    <div className="flex-1">
                      <Mock />
                    </div>
                    <div className="mt-5 px-1">
                      <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
                        {title}
                        <ArrowRight className="size-4 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{body}</p>
                    </div>
                  </Link>
                </TiltCard>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button href="/features" variant="secondary">
              Explore all 22 features <ArrowRight className="size-4" />
            </Button>
          </div>
        </Container>
      </section>

      {/* ── Journey storyline ────────────────────────────────────────── */}
      <section className="py-24" aria-labelledby="journey-title">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="One continuous flow"
              title={<span id="journey-title">From first DM to fifth visit — without dropping a thread.</span>}
              description="Lustra connects every step of the customer journey, so nothing lives in a notebook, a group chat or someone's memory."
            />
          </Reveal>
          <ol className="relative mt-16 space-y-6 lg:space-y-10">
            <span className="absolute top-0 bottom-0 left-[19px] hidden w-px bg-gradient-to-b from-iris/60 via-aqua/40 to-transparent lg:left-1/2 lg:block" aria-hidden />
            {journey.map((j, i) => (
              <Reveal as="li" key={j.step} className="relative">
                <div className={cn("grid items-center gap-6 lg:grid-cols-2 lg:gap-16", i % 2 === 1 && "lg:[&>*:first-child]:order-2")}>
                  <div className={cn("lg:max-w-md", i % 2 === 0 ? "lg:ml-auto lg:text-right" : "")}>
                    <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-ink/[0.04] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-aqua-soft uppercase">
                      {String(i + 1).padStart(2, "0")} · {j.step}
                    </span>
                    <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-ink">{j.title}</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{j.body}</p>
                  </div>
                  <div className="glass-2 rim relative overflow-hidden rounded-[28px] p-2">
                    <div className="relative aspect-[16/10] overflow-hidden rounded-[22px]">
                      <Image src={j.image} alt={j.alt} fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover transition duration-700 hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-scrim/30 to-transparent" />
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      {/* ── 3D visualizer teaser ─────────────────────────────────────── */}
      <section className="py-24" aria-labelledby="viz-title">
        <Container>
          <Glass tier={2} rim className="relative overflow-hidden rounded-[36px]">
            <div className="grid items-center lg:grid-cols-2">
              <div className="p-8 sm:p-14">
                <Badge tone="iris">
                  <Box className="size-3" aria-hidden /> Add-on · $150/mo
                </Badge>
                <h2 id="viz-title" className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-5xl">
                  Let customers see it <span className="text-iris-aqua">before you install it.</span>
                </h2>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-2">
                  An interactive 3D configurator for color PPF, satin wraps, coverage tiers and tint shades — on your website, at
                  the counter and inside every quote. One full-front to track-pack upgrade pays for the year.
                </p>
                <ul className="mt-6 grid gap-2 text-sm text-ink-2 sm:grid-cols-2">
                  {["Gloss, satin, matte & chrome finishes", "PPF coverage tiers highlighted", "5–70% tint preview", "Embeddable with lead capture"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-4 text-aqua" aria-hidden /> {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button href="/visualizer">
                    Try the live 3D demo <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="relative h-80 lg:h-full lg:min-h-[520px]">
                <Image
                  src="/images/red-coupe.webp"
                  alt="Red performance coupe — preview wraps and PPF in 3D before installation"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-void via-void/30 to-transparent lg:from-void" />
                <div className="glass-2 absolute right-6 bottom-6 flex gap-2 rounded-full p-2" aria-hidden>
                  {["#e11d48", "#0f172a", "#e5e7eb", "#ff6a2b", "#45c4ff", "#a3e635"].map((c) => (
                    <span key={c} className="size-7 rounded-full ring-2 ring-ink/20" style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
          </Glass>
        </Container>
      </section>

      <TestimonialsSection />
      <PricingPreview />
      <FAQSection faqs={homeFaqs} />
      <CTASection />

      <JsonLd data={[softwareLd, faqLd(homeFaqs)]} />
    </>
  );
}

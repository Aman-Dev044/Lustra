import { Eye, Gauge, HeartHandshake, Sparkles } from "lucide-react";
import { Avatar, Container, Glass, SectionHeading } from "@/components/spatial";
import { Reveal } from "@/components/spatial/motion";
import { CTASection, PageHero, SpatialImage } from "@/components/marketing/sections";
import { breadcrumbLd, buildMetadata, JsonLd } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";

export const metadata = buildMetadata({
    ownImage: true,
  title: "About Lustra — Built by Detailers and Engineers",
  description:
    "Lustra was founded by a former PPF shop owner and a real-time systems engineer to give appearance shops software as premium as their work.",
  path: "/about",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
];

const values = [
  { icon: Sparkles, title: "Craft over clutter", body: "Every screen should feel as considered as a two-stage correction. If a feature adds noise, it doesn't ship." },
  { icon: Gauge, title: "Live by default", body: "Shops move fast. Data should too — every view in Lustra updates in real time, everywhere." },
  { icon: Eye, title: "Radical transparency", body: "Published prices, published processing rates, no contracts. You should never need a sales call to know what you pay." },
  { icon: HeartHandshake, title: "Owners first", body: "We ship what shop owners ask for. Our roadmap is shaped every month by the Pro User Group." },
];

const team = [
  { name: "Elena Vasquez", role: "Co-founder & CEO", bio: "Ran a three-bay PPF studio for eight years before deciding the software had to be better." },
  { name: "Rohan Mehta", role: "Co-founder & CTO", bio: "Built real-time trading systems; now builds the live sync engine behind every Lustra board." },
  { name: "Grace Whitfield", role: "VP Customer Success", bio: "Has personally onboarded 900+ shops — and still answers live chat on Saturdays." },
  { name: "Kenji Arai", role: "Head of Design", bio: "Former spatial computing designer obsessed with depth, light and touch." },
];

const timeline = [
  { year: "2021", text: "Elena's PPF studio loses a $6,500 full-body job to a missed text. The idea for Lustra is born." },
  { year: "2022", text: "First version ships to 12 local shops in Austin. The live job board is the first feature." },
  { year: "2023", text: "LustraPay launches with flat, published rates and next-day payouts." },
  { year: "2024", text: "Warranty certificates with QR verification and memberships go live." },
  { year: "2025", text: "AI Quote Copilot and the 3D Visualizer launch. 4,000 shops cross the line." },
  { year: "2026", text: "The spatial redesign: one calm, live workspace across web, iPhone and Android." },
];

export default function AboutPage() {
  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    url: absoluteUrl("/about"),
    name: `About ${site.name}`,
    mainEntity: { "@id": `${site.url}/#organization` },
  };

  return (
    <>
      <PageHero
        breadcrumbs={crumbs}
        eyebrow="Our story"
        title={
          <>
            Built by people who’ve <span className="text-spectral">held the squeegee.</span>
          </>
        }
        description="Lustra started in a PPF bay in Austin, Texas. We build the software we wished we'd had: fast, beautiful, honest — and live."
      >
        <div className="mt-14 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <SpatialImage src="/images/ppf-install.webp" alt="Installer applying paint protection film in a clean, bright workshop" priority className="h-80 sm:h-[440px]" />
          <Reveal delay={0.1}>
            <Glass tier={2} rim className="flex h-full flex-col justify-center p-8">
              <h2 className="text-sm font-semibold tracking-[0.14em] text-aqua-soft uppercase">Our mission</h2>
              <p className="mt-4 text-2xl leading-snug font-medium tracking-tight text-ink">
                Give every appearance shop the operational superpowers of a flagship studio — at a price a one-person mobile
                detailer can afford.
              </p>
              <dl className="mt-8 grid grid-cols-3 gap-3 text-center">
                {[
                  ["4,800+", "shops"],
                  ["11", "countries"],
                  ["62", "teammates"],
                ].map(([v, l]) => (
                  <div key={l} className="glass-inset rounded-2xl p-3">
                    <dt className="sr-only">{l}</dt>
                    <dd className="text-xl font-semibold text-ink">{v}</dd>
                    <dd className="text-xs text-ink-3">{l}</dd>
                  </div>
                ))}
              </dl>
            </Glass>
          </Reveal>
        </div>
      </PageHero>

      <section className="py-20" aria-labelledby="values-title">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="What we believe" title={<span id="values-title">Four principles behind every pixel</span>} />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.06}>
                <Glass className="h-full p-6">
                  <v.icon className="size-6 text-aqua-soft" aria-hidden />
                  <h3 className="mt-4 font-semibold">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-3">{v.body}</p>
                </Glass>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20" aria-labelledby="timeline-title">
        <Container className="max-w-4xl">
          <Reveal>
            <SectionHeading eyebrow="Timeline" title={<span id="timeline-title">From one bay to thousands</span>} />
          </Reveal>
          <ol className="relative mt-12 space-y-4 border-l border-ink/10 pl-8">
            {timeline.map((t, i) => (
              <Reveal as="li" key={t.year} delay={i * 0.04} className="relative">
                <span className="bg-spectral absolute top-5 -left-[41px] size-4 rounded-full ring-4 ring-void" aria-hidden />
                <Glass className="p-5">
                  <p className="font-mono text-sm text-aqua-soft">{t.year}</p>
                  <p className="mt-1 text-ink-2">{t.text}</p>
                </Glass>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      <section className="py-20" aria-labelledby="team-title">
        <Container>
          <Reveal>
            <SectionHeading eyebrow="Leadership" title={<span id="team-title">The team behind Lustra</span>} />
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m, i) => (
              <Reveal key={m.name} delay={i * 0.06}>
                <Glass className="h-full p-6 text-center">
                  <Avatar name={m.name} size={72} className="mx-auto" />
                  <h3 className="mt-4 font-semibold">{m.name}</h3>
                  <p className="text-sm text-aqua-soft">{m.role}</p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-3">{m.bio}</p>
                </Glass>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <CTASection title="Join 4,800+ shops building something beautiful." />
      <JsonLd data={[breadcrumbLd(crumbs), aboutLd]} />
    </>
  );
}

import { Suspense } from "react";
import { Clock, LifeBuoy, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Container, Glass, Skeleton } from "@/components/spatial";
import { Reveal } from "@/components/spatial/motion";
import { ContactForm } from "@/components/marketing/contact-form";
import { PageHero } from "@/components/marketing/sections";
import { breadcrumbLd, buildMetadata, JsonLd } from "@/lib/seo";
import { absoluteUrl, site } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Contact Lustra — Book a Demo or Talk to Our Team",
  description:
    "Book a live Lustra demo or contact our team. Live chat, email and phone support for detailing, PPF, tint and wrap shops.",
  path: "/contact",
});

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Contact", path: "/contact" },
];

const channels = [
  { icon: MessageCircle, title: "Live chat", body: "Inside the app, 7 days a week. Median first reply: 3 minutes.", value: "In-app" },
  { icon: Mail, title: "Email", body: "Sales, partnerships and general questions.", value: site.email },
  { icon: LifeBuoy, title: "Support", body: "Account, billing and technical help.", value: site.supportEmail },
  { icon: Phone, title: "Phone", body: "Mon–Fri, 8am–6pm Central.", value: site.phone },
];

export default function ContactPage() {
  const contactLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    url: absoluteUrl("/contact"),
    name: `Contact ${site.name}`,
    mainEntity: {
      "@id": `${site.url}/#organization`,
      contactPoint: [
        { "@type": "ContactPoint", contactType: "sales", email: site.email, telephone: site.phone, availableLanguage: ["English", "Spanish"] },
        { "@type": "ContactPoint", contactType: "customer support", email: site.supportEmail, availableLanguage: ["English", "Spanish"] },
      ],
    },
  };

  return (
    <>
      <PageHero
        breadcrumbs={crumbs}
        eyebrow="Contact"
        title={
          <>
            Let’s talk about <span className="text-spectral">your shop.</span>
          </>
        }
        description="See Lustra on your own workflow in a 30-minute live demo, or send us a question — real humans who know detailing reply fast."
      />
      <section className="pb-12" aria-label="Contact options">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Reveal>
              <Glass tier={2} rim className="p-6 sm:p-10">
                <Suspense fallback={<Skeleton className="h-[460px]" />}>
                  <ContactForm />
                </Suspense>
              </Glass>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="space-y-3">
                {channels.map((c) => (
                  <Glass key={c.title} className="flex gap-4 p-5">
                    <span className="glass-2 flex size-11 shrink-0 items-center justify-center rounded-2xl text-aqua-soft">
                      <c.icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <h2 className="font-semibold">{c.title}</h2>
                      <p className="text-sm text-ink-3">{c.body}</p>
                      <p className="mt-1 text-sm text-ink">{c.value}</p>
                    </div>
                  </Glass>
                ))}
                <Glass className="p-5">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <MapPin className="size-4 text-aqua-soft" aria-hidden /> Headquarters
                  </h2>
                  <address className="mt-2 text-sm text-ink-2 not-italic">
                    {site.legalName}
                    <br />
                    {site.address.street}
                    <br />
                    {site.address.city}, {site.address.region} {site.address.postalCode}
                  </address>
                  <p className="mt-3 flex items-center gap-2 text-xs text-ink-4">
                    <Clock className="size-3.5" aria-hidden /> Visits by appointment
                  </p>
                </Glass>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
      <JsonLd data={[breadcrumbLd(crumbs), contactLd]} />
    </>
  );
}

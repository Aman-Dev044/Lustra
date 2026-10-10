import Link from "next/link";
import { Logo } from "@/components/spatial/logo";
import { featureCatalog, industryCatalog } from "@/lib/content/catalog";
import { site } from "@/lib/site";
import { FacebookIcon, InstagramIcon, LinkedinIcon, XIcon, YoutubeIcon } from "./social-icons";
import { NewsletterForm } from "./newsletter-form";

const company = [
  { label: "About", href: "/about" },
  { label: "Why Lustra", href: "/why-lustra" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "Log in", href: "/login" },
];

const legal = [
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Sitemap", href: "/sitemap.xml" },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-32 border-t border-white/[0.06]">
      <div className="pointer-events-none absolute inset-x-0 -top-px mx-auto h-px max-w-4xl bg-gradient-to-r from-transparent via-aqua/50 to-transparent" />
      <div className="mx-auto max-w-7xl px-5 pt-16 pb-10 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-3">{site.description}</p>
            <NewsletterForm />
            <div className="mt-6 flex items-center gap-2">
              {[
                { href: site.social.instagram, label: "Instagram", Icon: InstagramIcon },
                { href: site.social.youtube, label: "YouTube", Icon: YoutubeIcon },
                { href: site.social.facebook, label: "Facebook", Icon: FacebookIcon },
                { href: site.social.x, label: "X", Icon: XIcon },
                { href: site.social.linkedin, label: "LinkedIn", Icon: LinkedinIcon },
              ].map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${site.name} on ${label}`}
                  className="glass inline-flex size-10 items-center justify-center rounded-full text-ink-3 transition hover:-translate-y-0.5 hover:text-ink"
                >
                  <Icon width={16} height={16} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <FooterCol title="Features" items={featureCatalog.slice(0, 8).map((f) => ({ label: f.title, href: `/features/${f.slug}` }))} />
            <FooterCol title="Industries" items={industryCatalog.map((f) => ({ label: f.title, href: `/industries/${f.slug}` }))} />
            <FooterCol title="Company" items={company} />
            <FooterCol title="Legal" items={legal} />
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/[0.06] pt-6 text-xs text-ink-4 sm:flex-row sm:items-center">
          <p>
            © 2026 {site.legalName}. All rights reserved.
          </p>
          <p>
            {site.address.city}, {site.address.region} · {site.email} · Available on Web, iPhone & Android
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <h2 className="text-xs font-semibold tracking-[0.14em] text-ink-2 uppercase">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="text-sm text-ink-3 transition hover:text-ink">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

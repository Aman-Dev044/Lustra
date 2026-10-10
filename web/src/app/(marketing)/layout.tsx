import { AuroraBackground } from "@/components/spatial/motion";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";
import { JsonLd, organizationLd, websiteLd } from "@/lib/seo";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-black"
      >
        Skip to content
      </a>
      <AuroraBackground />
      <SiteNav />
      <main id="main" className="relative">
        {children}
      </main>
      <SiteFooter />
      <JsonLd data={[organizationLd(), websiteLd()]} />
    </>
  );
}

export const site = {
  name: "Lustra",
  legalName: "Lustra Technologies, Inc.",
  tagline: "The spatial operating system for detailing, PPF, tint & wrap shops",
  description:
    "Lustra is the all-in-one shop management platform for auto detailing, ceramic coating, PPF, window tint, vinyl wrap and marine pros. Real-time job board, AI Quote Copilot, online booking, payments, digital inspections, warranty certificates and a 3D visualizer — on web, iPhone and Android.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  email: "hello@lustra.app",
  supportEmail: "support@lustra.app",
  phone: "+1 (512) 555-0142",
  address: {
    street: "500 W 2nd St, Suite 1900",
    city: "Austin",
    region: "TX",
    postalCode: "78701",
    country: "US",
  },
  social: {
    instagram: "https://instagram.com/lustra.app",
    youtube: "https://youtube.com/@lustraapp",
    facebook: "https://facebook.com/lustra.app",
    x: "https://x.com/lustraapp",
    linkedin: "https://linkedin.com/company/lustra-app",
  },
  keywords: [
    "auto detailing software",
    "detailing CRM",
    "ceramic coating software",
    "PPF shop software",
    "paint protection film CRM",
    "window tint software",
    "vinyl wrap shop management",
    "mobile detailing app",
    "marine detailing software",
    "detailing scheduling app",
    "auto spa booking software",
    "Urable alternative",
  ],
  ogImage: "/opengraph-image",
} as const;

export const marketingNav = [
  { label: "Features", href: "/features" },
  { label: "Industries", href: "/industries" },
  { label: "3D Visualizer", href: "/visualizer" },
  { label: "Pricing", href: "/pricing" },
  { label: "Why Lustra", href: "/why-lustra" },
  { label: "Blog", href: "/blog" },
] as const;

export const absoluteUrl = (path = "/") => `${site.url}${path.startsWith("/") ? path : `/${path}`}`;

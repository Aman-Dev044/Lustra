import type { MetadataRoute } from "next";
import { features } from "@/lib/content/features";
import { industries } from "@/lib/content/industries";
import { posts } from "@/lib/content/blog";
import { absoluteUrl } from "@/lib/site";

/** Content revision date for static marketing pages — bump when the copy materially changes. */
const SITE_UPDATED = "2026-09-15T00:00:00.000Z";
const LEGAL_UPDATED = "2026-08-01T00:00:00.000Z";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"]; updated?: string }[] = [
    { path: "/", priority: 1, freq: "weekly" },
    { path: "/pricing", priority: 0.95, freq: "monthly" },
    { path: "/features", priority: 0.9, freq: "monthly" },
    { path: "/industries", priority: 0.85, freq: "monthly" },
    { path: "/visualizer", priority: 0.85, freq: "monthly" },
    { path: "/why-lustra", priority: 0.8, freq: "monthly" },
    { path: "/blog", priority: 0.75, freq: "weekly" },
    { path: "/about", priority: 0.6, freq: "yearly" },
    { path: "/contact", priority: 0.6, freq: "yearly" },
    { path: "/legal/privacy", priority: 0.3, freq: "yearly", updated: LEGAL_UPDATED },
    { path: "/legal/terms", priority: 0.3, freq: "yearly", updated: LEGAL_UPDATED },
  ];

  return [
    ...staticRoutes.map((r) => ({
      url: absoluteUrl(r.path),
      lastModified: r.updated ?? SITE_UPDATED,
      changeFrequency: r.freq,
      priority: r.priority,
    })),
    ...features.map((f) => ({
      url: absoluteUrl(`/features/${f.slug}`),
      lastModified: SITE_UPDATED,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: [absoluteUrl(f.image)],
    })),
    ...industries.map((i) => ({
      url: absoluteUrl(`/industries/${i.slug}`),
      lastModified: SITE_UPDATED,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      images: [absoluteUrl(i.image)],
    })),
    ...posts.map((p) => ({
      url: absoluteUrl(`/blog/${p.slug}`),
      lastModified: `${p.updated}T00:00:00.000Z`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      images: [absoluteUrl(p.image)],
    })),
  ];
}

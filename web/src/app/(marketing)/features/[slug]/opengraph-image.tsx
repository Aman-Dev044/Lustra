import { featureBySlug, features } from "@/lib/content/features";
import { ogContentType, ogSize, renderOgImage } from "@/lib/og";

export const alt = "Lustra feature overview";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return features.map((f) => ({ slug: f.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = featureBySlug(slug);
  return renderOgImage({
    eyebrow: f?.title ?? "Feature",
    title: f?.headline ?? "Lustra features",
    subtitle: f?.seo.description,
  });
}

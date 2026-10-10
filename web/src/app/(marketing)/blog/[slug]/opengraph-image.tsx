import { postBySlug, posts } from "@/lib/content/blog";
import { ogContentType, ogSize, renderOgImage } from "@/lib/og";

export const alt = "Lustra blog article";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  return renderOgImage({
    eyebrow: post?.category ?? "Blog",
    title: post?.title ?? "The Lustra Journal",
    subtitle: post ? `By ${post.author.name}` : undefined,
  });
}

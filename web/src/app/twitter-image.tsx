import { ogContentType, ogSize, renderOgImage } from "@/lib/og";

export const alt = "Lustra — shop management software for detailing, PPF, tint and wrap";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgImage({
    eyebrow: "Shop OS",
    title: "Book, quote, schedule, inspect and get paid — live.",
    subtitle: "From $70/month · unlimited users · web, iPhone & Android",
  });
}

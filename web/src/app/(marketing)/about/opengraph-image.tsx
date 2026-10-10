import { ogContentType, ogSize, renderOgImage } from "@/lib/og";

export const alt = "About Lustra";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgImage({ eyebrow: "About", title: "Built by people who've held the squeegee." });
}

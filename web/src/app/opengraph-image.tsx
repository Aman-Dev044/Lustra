import { ogContentType, ogSize, renderOgImage } from "@/lib/og";

export const alt = "Lustra — the spatial operating system for detailing, PPF, tint and wrap shops";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgImage({
    eyebrow: "Shop OS",
    title: "Run your detailing shop in a whole new dimension.",
    subtitle: "Live job board · AI Quote Copilot · Booking · Payments · Inspections · Memberships",
  });
}

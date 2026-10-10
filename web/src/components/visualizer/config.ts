/* Visualizer catalogs and config helpers — kept free of three.js so forms and summaries can import them cheaply. */

export type BodyStyle = "coupe" | "sedan" | "suv";
export type Finish = "gloss" | "satin" | "matte" | "metallic" | "chrome";
export type Coverage = "none" | "partial" | "full_front" | "track" | "full_body";
export type Tint = "none" | 70 | 50 | 35 | 20 | 5;
export type EnvPreset = "studio" | "sunset" | "night";

export interface VisualizerConfig {
  style: BodyStyle;
  colorId: string;
  finish: Finish;
  coverage: Coverage;
  showCoverage: boolean;
  tint: Tint;
  wheelId: string;
  caliperId: string;
  env: EnvPreset;
  autoRotate: boolean;
}

export interface Swatch {
  id: string;
  name: string;
  hex: string;
}

/** First entry is the factory paint — any other color implies a color-change wrap or color PPF. */
export const bodyColors: Swatch[] = [
  { id: "factory", name: "Factory Liquid Silver", hex: "#aab2bd" },
  { id: "obsidian", name: "Obsidian Black", hex: "#0d0f14" },
  { id: "arctic", name: "Arctic White", hex: "#eef1f5" },
  { id: "nardo", name: "Concrete Grey", hex: "#7d8287" },
  { id: "racing-red", name: "Racing Red", hex: "#c8102e" },
  { id: "sunburst", name: "Sunburst Orange", hex: "#f2711c" },
  { id: "acid", name: "Acid Lime", hex: "#a3e635" },
  { id: "miami", name: "Miami Blue", hex: "#1fb6e8" },
  { id: "midnight", name: "Midnight Purple", hex: "#3b1f6b" },
  { id: "iris", name: "Spectral Iris", hex: "#7c5cff" },
  { id: "british", name: "British Racing Green", hex: "#0f3d2e" },
  { id: "rose", name: "Rose Gold", hex: "#d79a8a" },
];

export const wheelColors: Swatch[] = [
  { id: "gunmetal", name: "Gunmetal", hex: "#3a3f47" },
  { id: "gloss-black", name: "Gloss Black", hex: "#0b0c10" },
  { id: "silver", name: "Hyper Silver", hex: "#c9ced6" },
  { id: "bronze", name: "Satin Bronze", hex: "#8c6a3f" },
  { id: "white", name: "Pearl White", hex: "#f2f2f2" },
];

export const caliperColors: Swatch[] = [
  { id: "red", name: "Red", hex: "#e11d48" },
  { id: "yellow", name: "Yellow", hex: "#facc15" },
  { id: "blue", name: "Blue", hex: "#2563eb" },
  { id: "black", name: "Black", hex: "#111318" },
  { id: "lime", name: "Lime", hex: "#a3e635" },
];

export const finishes: { id: Finish; label: string }[] = [
  { id: "gloss", label: "Gloss" },
  { id: "satin", label: "Satin" },
  { id: "matte", label: "Matte" },
  { id: "metallic", label: "Metallic" },
  { id: "chrome", label: "Chrome" },
];

export const coverages: { id: Coverage; label: string; price: number; detail: string }[] = [
  { id: "none", label: "No PPF", price: 0, detail: "Paint only" },
  { id: "partial", label: "Partial front", price: 995, detail: "Bumper, 18–24\" hood & fenders, mirrors" },
  { id: "full_front", label: "Full front", price: 1800, detail: "Full bumper, hood, fenders, mirrors, headlights" },
  { id: "track", label: "Track pack", price: 2400, detail: "Full front + rockers & lower doors" },
  { id: "full_body", label: "Full body", price: 6500, detail: "Every painted panel" },
];

export const tints: { id: Tint; label: string }[] = [
  { id: "none", label: "Clear" },
  { id: 70, label: "70%" },
  { id: 50, label: "50%" },
  { id: 35, label: "35%" },
  { id: 20, label: "20%" },
  { id: 5, label: "5%" },
];

export const defaultConfig: VisualizerConfig = {
  style: "coupe",
  colorId: "iris",
  finish: "satin",
  coverage: "full_front",
  showCoverage: true,
  tint: 35,
  wheelId: "gunmetal",
  caliperId: "red",
  env: "studio",
  autoRotate: true,
};

export const WRAP_PRICE = 3800;
export const TINT_PRICE = 399;

export const swatchById = (list: Swatch[], id: string) => list.find((s) => s.id === id) ?? list[0]!;

export function estimateConfig(c: VisualizerConfig) {
  const lines: { label: string; price: number }[] = [];
  if (c.colorId !== "factory") lines.push({ label: `${swatchById(bodyColors, c.colorId).name} ${c.finish} wrap`, price: WRAP_PRICE });
  const cov = coverages.find((x) => x.id === c.coverage)!;
  if (cov.price) lines.push({ label: `${cov.label} PPF`, price: cov.price });
  if (c.tint !== "none") lines.push({ label: `Ceramic tint ${c.tint}%`, price: TINT_PRICE });
  return { lines, total: lines.reduce((s, l) => s + l.price, 0) };
}

export function describeConfig(c: VisualizerConfig) {
  const color = swatchById(bodyColors, c.colorId).name;
  const cov = coverages.find((x) => x.id === c.coverage)!.label;
  const parts = [
    `${c.style[0]!.toUpperCase()}${c.style.slice(1)}`,
    c.colorId === "factory" ? "Factory paint" : `${color} (${c.finish})`,
    cov === "No PPF" ? "No PPF" : `${cov} PPF`,
    c.tint === "none" ? "No tint" : `${c.tint}% tint`,
    `${swatchById(wheelColors, c.wheelId).name} wheels`,
    `${swatchById(caliperColors, c.caliperId).name} calipers`,
  ];
  return parts.join(" · ");
}

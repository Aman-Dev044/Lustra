import { MarketplaceProduct } from '../models/growth.js';

type P = [vendor: string, name: string, sku: string, category: string, price: number, unit: string, rating: number, description: string, badge?: string];

/** Global supplier catalog (vendor-style names, not real trademarks). Member price = 12% off, rounded. */
const PRODUCTS: P[] = [
  ['Nanoshield Labs', 'Quartz Guard 9H Ceramic Coating 50ml', 'NSL-QG9H-50', 'ceramic', 64, 'kit', 4.9, 'Professional SiO2/TiO2 hybrid coating, up to 5-year durability with two layers.', 'Best seller'],
  ['Nanoshield Labs', 'Quartz Guard Light Topper 500ml', 'NSL-QGT-500', 'ceramic', 29, 'bottle', 4.8, 'Spray sealant topper that revives hydrophobics on coated vehicles.'],
  ['Aurelion Pro', 'Graphene Infinity Coating 30ml', 'AUP-GIC-30', 'ceramic', 79, 'kit', 4.8, 'Graphene-reinforced coating with excellent water-spot resistance.', 'New'],
  ['Aurelion Pro', 'Wheel & Caliper Ceramic 30ml', 'AUP-WCC-30', 'ceramic', 39, 'kit', 4.7, 'High-temperature coating for wheels and calipers up to 800°C.'],
  ['Vitrex', 'Glass Shield Windshield Coating 30ml', 'VTX-GSW-30', 'ceramic', 24, 'kit', 4.6, 'Bonding glass coating with 12-month rain repellency.'],
  ['Vitrex', 'Trim Restore Ceramic 15ml', 'VTX-TRC-15', 'ceramic', 26, 'kit', 4.7, 'Restores faded plastics and seals them for two years.'],
  ['ClearArmor', 'Self-Healing PPF 60" × 50ft Gloss', 'CLA-SH60-50G', 'ppf', 689, 'roll', 4.9, '8-mil TPU film, self-healing topcoat, 10-year warranty.', 'Pro favorite'],
  ['ClearArmor', 'Self-Healing PPF 60" × 50ft Matte', 'CLA-SH60-50M', 'ppf', 749, 'roll', 4.8, 'Satin finish TPU film that turns gloss paint matte.'],
  ['ClearArmor', 'Self-Healing PPF 24" × 50ft Gloss', 'CLA-SH24-50G', 'ppf', 289, 'roll', 4.8, 'Narrow roll for rockers, door cups and partial kits.'],
  ['Polarlite', 'Stealth Ceramic PPF 60" × 30ft', 'PLL-SCP-60-30', 'ppf', 589, 'roll', 4.7, 'Pre-coated hydrophobic PPF — no separate coating needed.'],
  ['Polarlite', 'PPF Slip & Tack Concentrate 1L', 'PLL-STC-1', 'ppf', 19, 'bottle', 4.6, 'Install solution concentrate, makes 20 L of slip or tack.'],
  ['Heatline Films', 'Nano-Ceramic Tint 35% 40" × 100ft', 'HLF-NC35-40', 'tint', 249, 'roll', 4.8, 'Up to 96% IR rejection, signal-friendly, lifetime warranty.', 'Best seller'],
  ['Heatline Films', 'Nano-Ceramic Tint 20% 40" × 100ft', 'HLF-NC20-40', 'tint', 249, 'roll', 4.8, 'Darker shade, 98% IR rejection.'],
  ['Heatline Films', 'Clear Windshield Film 70% 60" × 100ft', 'HLF-CW70-60', 'tint', 329, 'roll', 4.7, 'Virtually clear windshield film blocking 90% of infrared heat.'],
  ['Opticool', 'Carbon Tint 15% 40" × 100ft', 'OPC-CT15-40', 'tint', 139, 'roll', 4.5, 'Color-stable carbon film, great value tier.'],
  ['Opticool', 'Residential Solar Film 60" × 100ft', 'OPC-RSF-60', 'tint', 419, 'roll', 4.6, 'Flat glass solar control film for homes and offices.'],
  ['Wrapcore', 'Cast Vinyl Gloss Black 60" × 25yd', 'WPC-CVGB-60', 'wrap', 469, 'roll', 4.8, 'Air-release cast vinyl, 7-year outdoor durability.'],
  ['Wrapcore', 'Cast Vinyl Satin Nardo 60" × 25yd', 'WPC-CVSN-60', 'wrap', 519, 'roll', 4.9, 'The color everyone asks for — satin finish, repositionable.', 'Trending'],
  ['Wrapcore', 'Chrome Delete Satin Black 60" × 5yd', 'WPC-CDSB-5', 'wrap', 109, 'roll', 4.7, 'Perfect for window trim, badges and grilles.'],
  ['Wrapcore', 'Knifeless Design Tape 50m', 'WPC-KDT-50', 'wrap', 32, 'roll', 4.8, 'Filament tape for blade-free cutting on paint.'],
  ['Brightworks', 'One-Step Polish 32oz', 'BRW-OSP-32', 'chemicals', 34, 'bottle', 4.8, 'Corrects and finishes in a single step with high gloss.'],
  ['Brightworks', 'Heavy Cut Compound 32oz', 'BRW-HCC-32', 'chemicals', 38, 'bottle', 4.7, 'Removes 1500-grit sanding marks quickly with low dust.'],
  ['Brightworks', 'Finishing Polish 32oz', 'BRW-FP-32', 'chemicals', 33, 'bottle', 4.8, 'Jeweling polish for flawless results on soft paint.'],
  ['Purewash', 'pH-Neutral Snow Foam 1gal', 'PWW-SF-1G', 'chemicals', 29, 'gallon', 4.7, 'Thick clinging foam, safe on coatings and PPF.'],
  ['Purewash', 'Iron Fallout Remover 1gal', 'PWW-IFR-1G', 'chemicals', 44, 'gallon', 4.8, 'Color-changing decon that dissolves embedded iron.'],
  ['Purewash', 'Interior Cleaner Concentrate 1gal', 'PWW-ICC-1G', 'chemicals', 31, 'gallon', 4.7, 'Dilutable all-surface interior cleaner, matte finish.'],
  ['Purewash', 'Panel Prep IPA 32oz', 'PWW-PP-32', 'chemicals', 15, 'bottle', 4.6, 'Removes polishing oils before coating.'],
  ['Purewash', 'Tar & Adhesive Remover 32oz', 'PWW-TAR-32', 'chemicals', 18, 'bottle', 4.5, 'Lifts tar, sap and sticker residue without harming clear coat.'],
  ['TorqueLine', '15mm Long-Throw DA Polisher', 'TQL-DA15', 'tools', 349, 'unit', 4.9, 'Smooth 15mm orbit, 900W, variable speed with soft start.', 'Pro favorite'],
  ['TorqueLine', 'Cordless Mini Polisher Kit', 'TQL-MINI', 'tools', 279, 'kit', 4.7, '3" and 2" backing plates for tight areas, two batteries.'],
  ['TorqueLine', 'LED Paint Inspection Light', 'TQL-LED', 'tools', 129, 'unit', 4.8, 'Color-matched 4500K light to reveal swirls and holograms.'],
  ['TorqueLine', 'Paint Depth Gauge', 'TQL-PDG', 'tools', 189, 'unit', 4.7, 'Measures clear coat thickness on steel and aluminum.'],
  ['TorqueLine', 'Heat Gun with Digital Display', 'TQL-HG', 'tools', 69, 'unit', 4.6, 'Precise temperatures for PPF and wrap post-heating.'],
  ['Cutright', 'PPF Squeegee Set (6pc)', 'CTR-SQ6', 'tools', 24, 'set', 4.7, 'Hard, medium and soft squeegees for film installs.'],
  ['Cutright', 'Foam Polishing Pads 5.5" (6pk)', 'CTR-FP55', 'tools', 42, 'pack', 4.8, 'Cut, polish and finish foam pads with cooling design.'],
  ['Cutright', 'Microfiber Cutting Pads 5" (4pk)', 'CTR-MC5', 'tools', 36, 'pack', 4.7, 'Aggressive cut for hard clear coats.'],
  ['Plushline', 'Edgeless Microfiber Towels 16" (10pk)', 'PLL-EMT-10', 'towels', 29, 'pack', 4.9, '350gsm plush towels for coating removal and final wipes.', 'Best seller'],
  ['Plushline', 'Twist-Loop Drying Towel 25×36"', 'PLL-TDT', 'towels', 26, 'unit', 4.8, 'Absorbs a full car in one pass without streaks.'],
  ['Plushline', 'Glass Waffle Towels (6pk)', 'PLL-GWT-6', 'towels', 19, 'pack', 4.7, 'Lint-free waffle weave for streak-free glass.'],
  ['Plushline', 'Coating Suede Applicators (20pk)', 'PLL-CSA-20', 'towels', 22, 'pack', 4.8, 'Suede cloths and blocks for even coating application.'],
];

export async function ensureMarketplaceCatalog(): Promise<number> {
  const count = await MarketplaceProduct.estimatedDocumentCount();
  if (count >= PRODUCTS.length) return count;
  await MarketplaceProduct.bulkWrite(
    PRODUCTS.map(([vendor, name, sku, category, price, unit, rating, description, badge]) => ({
      updateOne: {
        filter: { sku },
        update: { $set: { vendor, name, category, price, memberPrice: Math.round(price * 0.88 * 100) / 100, unit, rating, description, badge: badge ?? '' } },
        upsert: true,
      },
    })),
  );
  return PRODUCTS.length;
}

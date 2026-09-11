// Roomvana's room/style taxonomy.
//
// The AUTHORITATIVE list of what exists is the live, public, no-auth endpoint
// GET https://api.roomvana.co/options (the API domain stays on .co forever —
// the shipped iOS build has it compiled in). We fetch it so this server never
// offers a room or style the product can't actually render. The maps below are
// a hand-maintained MIRROR used only to attach a human-readable label to each
// id (the /options payload carries ids only); an id present live but missing
// here still gets listed, just with a title-cased fallback label. Refresh these
// when app/options.py changes — they are enrichment, not the source of truth.

export const API_BASE = "https://api.roomvana.co";
export const SITE_BASE = "https://roomvana.ai";

/** style id -> short description (mirror of app/options.py STYLES) */
export const STYLE_LABELS: Record<string, string> = {
  modern: "sleek modern — clean lines, uncluttered surfaces, neutral palette with bold accents",
  minimalist: "minimalist — essential furniture only, calm neutral tones, hidden storage",
  scandinavian: "Scandinavian — light woods, white walls, cozy textiles, functional simplicity",
  japandi: "Japandi — Japanese-Scandinavian fusion, warm woods, low-profile furniture, serene neutrals",
  "mid-century-modern": "mid-century modern — walnut and teak furniture, organic curves, retro accents",
  industrial: "industrial loft — exposed brick and metal, dark tones, raw finishes",
  bohemian: "bohemian — layered patterns and textures, plants, warm eclectic decor",
  "modern-farmhouse": "modern farmhouse — shiplap accents, warm woods, black fixtures, cozy rustic-meets-clean",
  coastal: "coastal — airy whites and blues, natural fibers, beach-house freshness",
  traditional: "traditional — classic furniture silhouettes, rich woods, elegant symmetry",
  contemporary: "contemporary — current-day polish, mixed materials, comfortable sophistication",
  rustic: "rustic — reclaimed wood, stone textures, warm cabin comfort",
  "french-country": "French country — soft pastels, carved wood, linen fabrics, Provencal charm",
  mediterranean: "Mediterranean — terracotta, wrought iron, warm plaster walls, arched details",
  "art-deco": "Art Deco — geometric patterns, brass and velvet, glamorous jewel tones",
  "modern-luxury": "modern luxury — marble, brass details, statement lighting, hotel-suite polish",
  vintage: "vintage retro — curated second-hand furniture, nostalgic colors, timeless character",
  "dark-academia": "dark academia — moody deep tones, wood paneling, library-inspired warmth",
  tropical: "tropical — lush green plants, rattan and bamboo, resort-like brightness",
  cottagecore: "cottagecore — floral patterns, soft vintage furniture, whimsical countryside coziness",
  transitional: "transitional — traditional silhouettes with contemporary lines, soft neutral palette",
  "spanish-colonial-revival":
    "Spanish Colonial Revival — white stucco, dark carved wood beams, terracotta tile, arched openings",
  "2026-trends": "2026 interior trends — organic curved furniture, earthy color-drenched walls, sculptural lighting",
};

/** room/space id -> human-readable name (mirror of app/options.py) */
export const ROOM_LABELS: Record<string, string> = {
  // interior
  kitchen: "kitchen",
  "living-room": "living room",
  bedroom: "bedroom",
  bathroom: "bathroom",
  "dining-room": "dining room",
  "home-office": "home office",
  "kids-room": "kids room",
  nursery: "nursery",
  basement: "basement",
  attic: "attic bedroom",
  entryway: "entryway",
  "laundry-room": "laundry room",
  closet: "walk-in closet",
  "home-theater": "home theater room",
  "home-gym": "home gym",
  "wine-cellar": "wine cellar",
  "basement-bar": "basement bar",
  staircase: "staircase and stairwell",
  // exterior
  exterior: "house exterior",
  // gardens / outdoor
  garden: "garden",
  backyard: "backyard",
  landscape: "yard and surrounding landscape",
  patio: "patio and outdoor seating area",
  deck: "deck",
  porch: "porch",
  balcony: "balcony",
};

// Offline fallback: the id lists as of the last mirror refresh. Used only when
// the live /options fetch fails (e.g. a sandbox with no network) so tool calls
// still return something sensible.
export const FALLBACK = {
  rooms: [
    "kitchen", "living-room", "bedroom", "bathroom", "dining-room", "home-office",
    "kids-room", "nursery", "basement", "attic", "entryway", "laundry-room", "closet",
    "home-theater", "home-gym", "wine-cellar", "basement-bar", "staircase",
  ],
  exteriors: ["exterior"],
  gardens: ["garden", "backyard", "landscape", "patio", "deck", "porch", "balcony"],
  styles: Object.keys(STYLE_LABELS),
};

export interface Catalog {
  rooms: string[];
  exteriors: string[];
  gardens: string[];
  styles: string[];
  live: boolean; // true when fetched from /options, false when the fallback was used
}

let cache: { at: number; data: Catalog } | null = null;
const TTL_MS = 10 * 60 * 1000;

/** Fetch the live taxonomy from /options, cached for 10 min, falling back to
 * the bundled lists if the network is unavailable. */
export async function getCatalog(): Promise<Catalog> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${API_BASE}/options`, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`/options HTTP ${res.status}`);
    const j = (await res.json()) as Record<string, unknown>;
    const arr = (k: string): string[] => (Array.isArray(j[k]) ? (j[k] as string[]) : []);
    const data: Catalog = {
      rooms: arr("rooms").length ? arr("rooms") : FALLBACK.rooms,
      exteriors: arr("exteriors").length ? arr("exteriors") : FALLBACK.exteriors,
      gardens: arr("gardens").length ? arr("gardens") : FALLBACK.gardens,
      styles: arr("styles").length ? arr("styles") : FALLBACK.styles,
      live: true,
    };
    cache = { at: Date.now(), data };
    return data;
  } catch {
    const data: Catalog = { ...FALLBACK, live: false };
    cache = { at: Date.now(), data };
    return data;
  }
}

export function styleLabel(id: string): string {
  return STYLE_LABELS[id] ?? titleCase(id);
}

export function roomLabel(id: string): string {
  return ROOM_LABELS[id] ?? titleCase(id);
}

function titleCase(id: string): string {
  return id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build the deep link that opens the Roomvana studio with a room (and,
 * optionally, a style) pre-selected. Verified against DesignTool.tsx, which
 * reads ?room= and ?style= at mount. */
export function designLink(room: string, style?: string): string {
  const p = new URLSearchParams({ room });
  if (style) p.set("style", style);
  return `${SITE_BASE}/design?${p.toString()}`;
}

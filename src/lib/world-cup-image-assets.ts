import { worldCupImageAssets as generatedWorldCupImageAssets } from "@/lib/world-cup-image-assets.generated";

export type WorldCupImageAsset = {
  id: string;
  src: string;
  title: string;
  alt: string;
  caption: string;
  context: string;
  facts: string[];
  credit: string;
  license: string;
  sourceUrl: string;
  approved: boolean;
  mediaType: "photo" | "diagram" | "map" | "typographic";
  year: string;
  teams: string[];
  matchIds: string[];
  momentIds: string[];
  tags: string[];
  orientation: "landscape" | "portrait" | "square";
  focus: "center" | "top" | "bottom";
};

export type WorldCupImageContext = {
  surface?: string;
  seed?: string;
  matchId?: string;
  momentId?: string;
  year?: string;
  teams?: string[];
  tags?: string[];
  stage?: string;
};

export type SeenImagesState = {
  global: string[];
  surfaces: Record<string, string[]>;
};

export const SEEN_IMAGES_STORAGE_KEY = "tippekjelleren.seenImages.v1";
const GLOBAL_SEEN_LIMIT = 20;
const SURFACE_SEEN_LIMIT = 8;

export const worldCupImageFallback: WorldCupImageAsset = {
  id: "typographic-archive-fallback",
  src: "/daily-images/fallback.svg",
  title: "VM-arkivkort",
  alt: "Typografisk arkivkort for VM-nostalgi",
  caption: "Et generert arkivkort brukes når ingen godkjente bilder er tilgjengelige.",
  context: "Kjelleren får beholde stemningen uten å lene seg på uklare rettigheter, offisielle VM-merker eller tilfeldige pressebilder.",
  facts: ["Fallbacken er lokal og generert.", "Den bruker ingen FIFA-logoer eller turneringsmerker.", "Arkivet kan fylles videre uten databaseendring."],
  credit: "Tippekjelleren",
  license: "Generert typografisk fallback",
  sourceUrl: "",
  approved: true,
  mediaType: "typographic",
  year: "2026",
  teams: [],
  matchIds: [],
  momentIds: [],
  tags: ["fallback", "archive", "typographic"],
  orientation: "landscape",
  focus: "center",
};

export const worldCupImageAssets = generatedWorldCupImageAssets;

export function isAllowedWorldCupImageLicense(license: string): boolean {
  const normalized = license.toLowerCase();
  if (!normalized || normalized.includes("fair use") || normalized.includes("noncommercial") || normalized.includes("no derivatives")) return false;
  return (
    normalized === "public domain" ||
    normalized.startsWith("cc0") ||
    normalized.startsWith("cc by ") ||
    normalized.startsWith("cc by-") ||
    normalized.startsWith("cc-by") ||
    normalized.startsWith("creative commons attribution")
  );
}

export function isProductionWorldCupImage(asset: WorldCupImageAsset): boolean {
  if (asset.id === worldCupImageFallback.id) return true;
  return asset.approved && asset.sourceUrl.startsWith("https://commons.wikimedia.org/wiki/File:") && isAllowedWorldCupImageLicense(asset.license);
}

export function getApprovedWorldCupImages({
  assets = worldCupImageAssets,
  includeFallback = true,
}: {
  assets?: WorldCupImageAsset[];
  includeFallback?: boolean;
} = {}): WorldCupImageAsset[] {
  const approved = assets.filter(isProductionWorldCupImage);
  if (approved.length > 0) return approved;
  return includeFallback ? [worldCupImageFallback] : [];
}

export function getWorldCupImageById(id: string): WorldCupImageAsset | null {
  return getApprovedWorldCupImages({ includeFallback: false }).find((asset) => asset.id === id) ?? null;
}

export function getRelevantWorldCupImages(context: WorldCupImageContext = {}, limit?: number): WorldCupImageAsset[] {
  const approved = getApprovedWorldCupImages({ includeFallback: false });
  const scored = approved
    .map((asset) => ({ asset, score: scoreWorldCupImage(asset, context) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.asset.year.localeCompare(b.asset.year) || a.asset.id.localeCompare(b.asset.id));
  const pool = scored.length ? scored.map((entry) => entry.asset) : approved;
  return typeof limit === "number" ? pool.slice(0, limit) : pool;
}

export function pickWorldCupImage(context: WorldCupImageContext = {}): WorldCupImageAsset {
  const pool = getRelevantWorldCupImages(context);
  if (!pool.length) return worldCupImageFallback;
  const seed = context.seed ?? `${context.surface ?? "global"}-${context.matchId ?? ""}-${context.momentId ?? ""}-${context.year ?? ""}`;
  return pool[hashString(seed) % pool.length];
}

export function scoreWorldCupImage(asset: WorldCupImageAsset, context: WorldCupImageContext = {}): number {
  let score = 0;
  const contextTeams = new Set((context.teams ?? []).map(normalize));
  const contextTags = new Set((context.tags ?? []).map(normalize));
  const assetTeams = new Set(asset.teams.map(normalize));
  const assetTags = new Set(asset.tags.map(normalize));

  if (context.matchId && asset.matchIds.includes(context.matchId)) score += 80;
  if (context.momentId && asset.momentIds.includes(context.momentId)) score += 60;
  for (const team of contextTeams) {
    if (assetTeams.has(team)) score += 22;
  }
  if (context.year && asset.year === context.year) score += 14;
  for (const tag of contextTags) {
    if (assetTags.has(tag)) score += 8;
  }
  if (context.stage === "final" && assetTags.has("final")) score += 18;
  if (context.stage?.includes("semi") && assetTags.has("semifinal")) score += 14;
  if (asset.mediaType === "diagram" && contextTags.has("diagram")) score += 10;
  if (asset.mediaType === "photo") score += 1;
  return score;
}

export function chooseFreshWorldCupImage({
  pool,
  currentId,
  seen,
  surfaceKey,
  seed,
}: {
  pool: WorldCupImageAsset[];
  currentId?: string;
  seen: SeenImagesState;
  surfaceKey: string;
  seed: string;
}): WorldCupImageAsset {
  if (pool.length === 0) return worldCupImageFallback;
  const globalSeen = new Set(seen.global);
  const surfaceSeen = new Set(seen.surfaces[surfaceKey] ?? []);
  const fresh = pool.filter((asset) => asset.id !== currentId && !globalSeen.has(asset.id) && !surfaceSeen.has(asset.id));
  const fallback = pool.filter((asset) => asset.id !== currentId);
  const candidates = fresh.length ? fresh : fallback.length ? fallback : pool;
  return candidates[hashString(seed) % candidates.length];
}

export function rememberSeenWorldCupImage(seen: SeenImagesState, imageId: string, surfaceKey: string): SeenImagesState {
  return {
    global: prependLimited(seen.global, imageId, GLOBAL_SEEN_LIMIT),
    surfaces: {
      ...seen.surfaces,
      [surfaceKey]: prependLimited(seen.surfaces[surfaceKey] ?? [], imageId, SURFACE_SEEN_LIMIT),
    },
  };
}

export function parseSeenImages(value: string | null): SeenImagesState {
  if (!value) return { global: [], surfaces: {} };
  try {
    const parsed = JSON.parse(value) as SeenImagesState;
    return {
      global: Array.isArray(parsed.global) ? parsed.global.filter(Boolean) : [],
      surfaces: parsed.surfaces && typeof parsed.surfaces === "object" ? parsed.surfaces : {},
    };
  } catch {
    return { global: [], surfaces: {} };
  }
}

function prependLimited(values: string[], value: string, limit: number): string[] {
  return [value, ...values.filter((item) => item !== value)].slice(0, limit);
}

function normalize(value: string): string {
  const normalized = value.trim().toLowerCase();
  return teamAliases[normalized] ?? normalized;
}

const teamAliases: Record<string, string> = {
  brasil: "brazil",
  england: "england",
  frankrike: "france",
  italia: "italy",
  kroatia: "croatia",
  nederland: "netherlands",
  norge: "norway",
  spania: "spain",
  sverige: "sweden",
  "sør-afrika": "south africa",
  "sor-afrika": "south africa",
  tyskland: "germany",
  usa: "usa",
};

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

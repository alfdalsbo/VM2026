import type { WorldCupImageAsset } from "@/lib/world-cup-image-assets";

export type SeenImagesState = {
  global: string[];
  surfaces: Record<string, string[]>;
};

export const SEEN_IMAGES_STORAGE_KEY = "tippekjelleren.seenImages.v1";
const GLOBAL_SEEN_LIMIT = 20;
const SURFACE_SEEN_LIMIT = 8;

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

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

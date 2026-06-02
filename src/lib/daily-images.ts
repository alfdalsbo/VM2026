import {
  getApprovedWorldCupImages,
  pickWorldCupImage,
  worldCupImageAssets,
  worldCupImageFallback,
  type WorldCupImageAsset,
  type WorldCupImageContext,
} from "@/lib/world-cup-image-assets";

export type DailyImageAsset = WorldCupImageAsset;

const localUnapprovedImage: DailyImageAsset = {
  id: "local-baggio-1994-unapproved",
  src: "/daily-images/ross-kinnaird-getty-images.jpg.webp",
  title: "Baggio-bommen, lokalt arkiv",
  alt: "Lokalt arkivbilde fra VM 1994",
  caption: "Lokalt bilde knyttet til Baggio-minnet i 1994.",
  context: "Motivet er nostalgisk, men rettighetene er ikke dokumentert godt nok til produksjonsvisning.",
  facts: ["Uklart rettighetsgrunnlag.", "Holdes ute av produksjonsrotasjonen.", "Bruker typografisk fallback ved behov."],
  credit: "Lokalt arkiv / uklar ekstern rettighet",
  license: "Ikke klarert",
  sourceUrl: "",
  approved: false,
  mediaType: "photo",
  year: "1994",
  teams: ["Brazil", "Italy"],
  matchIds: [],
  momentIds: ["baggio-1994"],
  tags: ["1994", "baggio", "unapproved"],
  orientation: "landscape",
  focus: "center",
  displayMode: "contain",
  cropSafe: false,
  homeEligible: false,
};

export const dailyImageFallback = worldCupImageFallback;
export const dailyImageAssets: DailyImageAsset[] = [...worldCupImageAssets, localUnapprovedImage];

export function getDailyImages({
  includeUnapproved = false,
  assets = dailyImageAssets,
  context,
}: {
  includeUnapproved?: boolean;
  assets?: DailyImageAsset[];
  context?: WorldCupImageContext;
} = {}): DailyImageAsset[] {
  if (includeUnapproved) return assets;
  const approved = getApprovedWorldCupImages({ assets, includeFallback: true });
  if (!context) return approved;
  const contextPool = getApprovedWorldCupImages({ assets, includeFallback: false }).filter((asset) => {
    const teams = new Set(context.teams ?? []);
    return (
      (context.matchId && asset.matchIds.includes(context.matchId)) ||
      (context.momentId && asset.momentIds.includes(context.momentId)) ||
      (context.year && asset.year === context.year) ||
      asset.teams.some((team) => teams.has(team)) ||
      asset.tags.some((tag) => context.tags?.includes(tag))
    );
  });
  return contextPool.length ? contextPool : approved;
}

export function pickRandomDailyImage(context: WorldCupImageContext = {}): DailyImageAsset | null {
  return pickWorldCupImage(context);
}

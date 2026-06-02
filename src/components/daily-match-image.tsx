import { DailyImageViewer } from "@/components/daily-image-viewer";
import { getMatchNostalgia } from "@/lib/world-cup-nostalgia";
import { getHomeWorldCupImages, pickHomeWorldCupImage } from "@/lib/world-cup-image-assets";
import type { WorldCupMatch } from "@/lib/types";

export function DailyMatchImage({ dateKey, matches = [] }: { dateKey: string; matches?: WorldCupMatch[] }) {
  const moments = uniqueById(matches.map(getMatchNostalgia));
  const context = {
    surface: "home",
    seed: dateKey,
    matchId: matches[0]?.id,
    momentId: moments[0]?.id,
    teams: uniqueStrings(matches.flatMap((match) => [match.homeTeam, match.awayTeam])),
    tags: uniqueStrings(["archive", ...moments.flatMap((moment) => moment.tags)]),
    stage: matches[0]?.stage,
  };
  const images = getHomeWorldCupImages(context, 36);
  if (images.length === 0) return null;
  const picked = pickHomeWorldCupImage(context);
  const initialAsset = images.some((image) => image.id === picked.id) ? picked : images[0];

  return <DailyImageViewer images={images} initialAsset={initialAsset} seed={dateKey} surfaceKey="home-daily-image" />;
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

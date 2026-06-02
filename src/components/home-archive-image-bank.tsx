import { DailyImageViewer } from "@/components/daily-image-viewer";
import type { WorldCupMatch } from "@/lib/types";
import { getApprovedWorldCupImages, pickWorldCupImage } from "@/lib/world-cup-image-assets";
import { getMatchNostalgia } from "@/lib/world-cup-nostalgia";

export function HomeArchiveImageBank({ dateKey, matches = [] }: { dateKey: string; matches?: WorldCupMatch[] }) {
  const moments = uniqueById(matches.map(getMatchNostalgia));
  const context = {
    surface: "home-archive",
    seed: dateKey,
    matchId: matches[0]?.id,
    momentId: moments[0]?.id,
    teams: uniqueStrings(matches.flatMap((match) => [match.homeTeam, match.awayTeam])),
    tags: uniqueStrings(["archive", ...moments.flatMap((moment) => moment.tags)]),
    stage: matches[0]?.stage,
  };
  const images = getApprovedWorldCupImages({ includeFallback: false });
  if (images.length === 0) return null;
  const picked = pickWorldCupImage(context);
  const initialAsset = images.some((image) => image.id === picked.id) ? picked : images[0];

  return (
    <section className="home-archive-bank" aria-labelledby="home-archive-bank-title">
      <div className="home-archive-bank-header">
        <div>
          <p className="eyebrow">VM-bildebanken</p>
          <h2 id="home-archive-bank-title" className="section-title">Arkivfunn fra kjelleren</h2>
        </div>
        <span>{images.length} klarerte bilder</span>
      </div>
      <DailyImageViewer images={images} initialAsset={initialAsset} seed={`${dateKey}-archive`} surfaceKey="home-archive-bank" />
    </section>
  );
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

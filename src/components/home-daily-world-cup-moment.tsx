import { DailyImageViewer } from "@/components/daily-image-viewer";
import type { WorldCupMatch } from "@/lib/types";
import { getRelevantWorldCupImages, pickWorldCupImage } from "@/lib/world-cup-image-assets";
import { getMatchNostalgia, type NostalgiaMoment } from "@/lib/world-cup-nostalgia";

export function HomeDailyWorldCupMoment({
  dateKey,
  matches = [],
  moment,
}: {
  dateKey: string;
  matches?: WorldCupMatch[];
  moment: NostalgiaMoment;
}) {
  const matchMoments = uniqueById(matches.map(getMatchNostalgia));
  const context = {
    surface: "home-daily-vm-moment",
    seed: dateKey,
    matchId: matches[0]?.id,
    momentId: moment.id,
    year: moment.year,
    teams: uniqueStrings([...moment.teams, ...matches.flatMap((match) => [match.homeTeam, match.awayTeam])]),
    tags: uniqueStrings(["archive", ...moment.tags, ...matchMoments.flatMap((item) => item.tags)]),
    stage: matches[0]?.stage,
  };
  const images = getRelevantWorldCupImages(context, 36);
  if (!images.length) return null;
  const picked = pickWorldCupImage(context);
  const initialAsset = images.some((image) => image.id === picked.id) ? picked : images[0];
  const contextLabel = matches.length > 0 ? "Kampnært arkivspor" : "Fra VM-historien";

  return (
    <section className="home-daily-vm-moment" aria-labelledby="home-daily-vm-moment-title">
      <div className="home-daily-vm-moment-media">
        <DailyImageViewer
          images={images}
          initialAsset={initialAsset}
          seed={`${dateKey}-${moment.id}`}
          surfaceKey="home-daily-vm-moment"
          shuffleAriaLabel="Vis nytt bilde til VM-øyeblikket"
          shuffleLabel="Nytt bilde"
        />
      </div>
      <div className="home-daily-vm-moment-copy">
        <p className="eyebrow">Dagens VM-øyeblikk</p>
        <div className="home-daily-vm-moment-meta">
          <span>{moment.year}</span>
          <span>{contextLabel}</span>
        </div>
        <h2 id="home-daily-vm-moment-title">{moment.title}</h2>
        <p>{moment.body}</p>
        <strong>{moment.cellarVerdict}</strong>
        <a href={moment.source.url} target="_blank" rel="noreferrer">
          Kilde: {moment.source.name}
        </a>
      </div>
    </section>
  );
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { MatchupLinks } from "@/components/team-link";
import { Panel } from "@/components/ui";
import { displayMatchup } from "@/lib/display";
import { formatScore } from "@/lib/format";
import { parseShareToken } from "@/lib/share-card";
import { describePrediction, getPrediction, scorePrediction } from "@/lib/scoring";
import { getAppState } from "@/lib/state";
import { getMatchNostalgia } from "@/lib/world-cup-nostalgia";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const data = await getShareData((await params).token);
  if (!data) return { title: "Tippekort" };
  return {
    title: `${data.player.shortName}s tippekort`,
    description: `${data.player.shortName} tippet ${describePrediction(data.prediction)} på ${displayMatchup(data.match)}. Fasit ${formatScore(data.match.result?.homeGoals, data.match.result?.awayGoals)}.`,
  };
}

export default async function ShareCardPage({ params }: { params: Promise<{ token: string }> }) {
  const data = await getShareData((await params).token);
  if (!data) notFound();
  const score = scorePrediction(data.match, data.prediction, data.state);
  const nostalgia = getMatchNostalgia(data.match);

  return (
    <main className="share-page">
      <Panel className="share-card share-card-retro">
        <p className="eyebrow">Tippekjelleren · VM 2026</p>
        <h1>{data.player.shortName}s tippekort</h1>
        <p><MatchupLinks match={data.match} /></p>
        <div className="share-archive-strip">
          <span>{nostalgia.year}</span>
          <strong>{nostalgia.title}</strong>
          <em>{nostalgia.cellarVerdict}</em>
        </div>
        <div className="share-score">
          <span>Tips: {describePrediction(data.prediction)}</span>
          <strong>Fasit: {formatScore(data.match.result?.homeGoals, data.match.result?.awayGoals)}</strong>
          <em>{score.total} resultattips{score.bonus ? ` · ${score.bonus} bonustips` : ""}</em>
        </div>
        <Link href="/login" className="btn-primary">Åpne Tippekjelleren</Link>
      </Panel>
    </main>
  );
}

async function getShareData(token: string) {
  const card = parseShareToken(token);
  if (!card) return null;
  const state = await getAppState();
  const player = state.players.find((item) => item.id === card.playerId);
  const match = state.matches.find((item) => item.id === card.matchId);
  if (!player || !match || !match.result) return null;
  const prediction = getPrediction(state, player.id, match.id);
  if (!prediction) return null;
  return { player, match, prediction, state };
}

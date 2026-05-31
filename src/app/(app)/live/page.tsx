import { LiveAutoRefresh } from "@/components/live-auto-refresh";
import { LivePotCard } from "@/components/live-pot-card";
import { ScoringRulesPanel } from "@/components/scoring-rules-panel";
import { Panel, Stat } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { isLivePotOpen, isLivePotVisible } from "@/lib/live-pot";
import { BONUS_TIPS_WINNER_AWARD, computeBonusTipStandings } from "@/lib/scoring";
import { getAppState } from "@/lib/state";

export const metadata = {
  title: "Bonustips",
};

export default async function LivePage() {
  const [player, state] = await Promise.all([requireSession(), getAppState()]);
  const liveMatches = state.matches.filter(isLivePotOpen);
  const potMatches = state.matches
    .filter((match) => isLivePotVisible(match, state))
    .sort((a, b) => {
      const aLive = isLivePotOpen(a) ? 0 : 1;
      const bLive = isLivePotOpen(b) ? 0 : 1;
      return aLive - bLive || b.kickoffAt.localeCompare(a.kickoffAt);
    })
    .slice(0, 8);
  const standings = computeBonusTipStandings(state);
  const leader = standings.find((row) => row.tips > 0);

  return (
    <div className="space-y-6">
      {liveMatches.length ? <LiveAutoRefresh /> : null}

      <Panel>
        <p className="eyebrow">Bonustips</p>
        <h1 className="section-title mt-2">Bonustips</h1>
        <p className="lead mt-3 max-w-3xl">
          Egen score for alt som ikke er rent resultattips: målscorere, assister og live-bonustips på gule og røde kort. Ingen odds, ingen penger, bare privat VM-jury med litt for høy selvtillit.
        </p>
      </Panel>

      <ScoringRulesPanel />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Kamper live" value={liveMatches.length} />
        <Stat label="Live-bonustips" value={state.livePotTips.length} />
        <Stat
          label="Leder bonustips"
          value={leader ? leader.player.shortName : "-"}
          detail={leader ? `${leader.points} p · +${BONUS_TIPS_WINNER_AWARD} ved VM-slutt` : "Ingen bonustips ennå"}
        />
      </div>

      <div className="live-pot-list">
        {potMatches.map((match) => (
          <LivePotCard key={match.id} match={match} player={player} state={state} />
        ))}
        {!potMatches.length ? (
          <Panel>
            <p className="eyebrow">Avspark mangler</p>
            <h2 className="section-title mt-2">Ingen live-bonustips å dømme ennå</h2>
            <p className="lead mt-3">Når en VM-kamp går live, åpner gule kort og rødt kort-spørsmålet her.</p>
          </Panel>
        ) : null}
      </div>

      <Panel>
        <p className="eyebrow">Egen score</p>
        <h2 className="section-title mt-2">Bonustips-tabell</h2>
        <div className="table-wrap mt-4">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Spiller</th>
                <th>Bonustips</th>
                <th>Kampbonus</th>
                <th>Live</th>
                <th>Tips</th>
                <th>Premie</th>
                <th>Eksakte gule</th>
                <th>Rødt-treff</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing) => (
                <tr key={standing.player.id}>
                  <td className="font-black">{standing.rank}</td>
                  <td className="font-black">{standing.player.shortName}</td>
                  <td className="font-black">{standing.points}</td>
                  <td>{standing.matchBonusPoints}</td>
                  <td>{standing.liveBonusPoints}</td>
                  <td>{standing.tips}</td>
                  <td>{standing.resultAward}</td>
                  <td>{standing.exactYellows}</td>
                  <td>{standing.redCardHits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

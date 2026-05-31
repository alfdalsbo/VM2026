import { Panel } from "@/components/ui";
import { ScoringRulesPanel } from "@/components/scoring-rules-panel";
import { BONUS_TIPS_WINNER_AWARD, computeStandings } from "@/lib/scoring";
import { getAppState } from "@/lib/state";

export const metadata = {
  title: "Resultattips",
};

export default async function TablePage() {
  const state = await getAppState();
  const standings = computeStandings(state);

  return (
    <div className="space-y-6">
      <Panel>
        <p className="eyebrow">Resultattips</p>
        <h1 className="section-title mt-2">Resultattips-tabellen</h1>
        <p className="lead mt-3 max-w-3xl">
          Sortert etter resultatpoeng, deretter eksakte resultater og riktig utfall. Bonustips har egen tabell og egen score; vinneren får foreløpig {BONUS_TIPS_WINNER_AWARD} poeng ved VM-slutt.
        </p>
      </Panel>

      <ScoringRulesPanel />

      <Panel>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Spiller</th>
                <th>Resultattips</th>
                <th>Bonuspremie</th>
                <th>Sum</th>
                <th>Tips</th>
                <th>Eksakte</th>
                <th>Utfall</th>
                <th>Rundeseire</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing) => (
                <tr key={standing.player.id}>
                  <td className="font-black">{standing.rank}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded text-sm font-black text-white" style={{ backgroundColor: standing.player.color }}>
                        {standing.player.avatar}
                      </span>
                      <span className="font-bold">{standing.player.shortName}</span>
                    </div>
                  </td>
                  <td className="font-black">{standing.resultTipPoints}</td>
                  <td>{standing.bonusWinnerAward}</td>
                  <td className="font-black">{standing.totalPoints}</td>
                  <td>{standing.predictions}</td>
                  <td>{standing.exactResults}</td>
                  <td>{standing.outcomeHits}</td>
                  <td>{standing.roundsWon}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

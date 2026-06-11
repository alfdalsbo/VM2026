import { Avatar } from "@/components/avatar";
import { ScoringRulesPanel } from "@/components/scoring-rules-panel";
import { Panel } from "@/components/ui";
import { getAvatarMap } from "@/lib/avatars";
import { BONUS_TIPS_RESULT_AWARDS, computeStandings } from "@/lib/scoring";
import { getAppState } from "@/lib/state";

export const metadata = {
  title: "Tabell",
};

export default async function TablePage() {
  const state = await getAppState();
  const standings = computeStandings(state);
  const avatars = getAvatarMap(state);
  const resultAwardLabel = BONUS_TIPS_RESULT_AWARDS.map((award) => `${award}+`).join("/");

  return (
    <div className="space-y-6">
      <Panel>
        <p className="eyebrow">Resultattips</p>
        <h1 className="section-title mt-2">Resultattips-tabellen</h1>
        <p className="lead mt-3 max-w-3xl">
          Sortert etter resultatpoeng, deretter eksakte resultater og riktig utfall. Små grønne tall viser aktuell bonustips-premie ved VM-slutt: {resultAwardLabel}.
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
                      <Avatar player={standing.player} display={avatars[standing.player.id]} size={36} />
                      <span className="font-bold">{standing.player.shortName}</span>
                    </div>
                  </td>
                  <td className="font-black">
                    <span className="result-points-cell">
                      <span>{standing.resultTipPoints}</span>
                      {standing.bonusAwardPreview ? (
                        <span className="result-bonus-preview" title="Foreløpig bonuspremie hvis VM sluttet nå">
                          {standing.bonusAwardPreview}+
                        </span>
                      ) : null}
                    </span>
                  </td>
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

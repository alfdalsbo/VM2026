import { Avatar } from "@/components/avatar";
import { LiveAutoRefresh } from "@/components/live-auto-refresh";
import { ScoringRulesPanel } from "@/components/scoring-rules-panel";
import { Panel } from "@/components/ui";
import { getAvatarMap } from "@/lib/avatars";
import { computeStandings } from "@/lib/scoring";
import { getAppState } from "@/lib/state";
import type { WorldCupMatch } from "@/lib/types";

export const metadata = {
  title: "Tabell",
};

const tableRefreshBeforeKickoffMs = 30 * 60 * 1000;
const tableRefreshAfterKickoffMs = 4 * 60 * 60 * 1000;

function shouldAutoRefreshStandings(matches: WorldCupMatch[], now = new Date()) {
  const time = now.getTime();
  return matches.some((match) => {
    if (match.status === "live" || match.status === "halftime") return true;
    if (match.status !== "scheduled" && match.status !== "unknown") return false;
    const kickoff = Date.parse(match.kickoffAt);
    return (
      Number.isFinite(kickoff) &&
      kickoff - tableRefreshBeforeKickoffMs <= time &&
      time <= kickoff + tableRefreshAfterKickoffMs
    );
  });
}

export default async function TablePage() {
  const state = await getAppState();
  const standings = computeStandings(state);
  const avatars = getAvatarMap(state);
  const shouldAutoRefresh = shouldAutoRefreshStandings(state.matches);

  return (
    <div className="space-y-6">
      {shouldAutoRefresh ? <LiveAutoRefresh intervalMs={60000} /> : null}

      <Panel>
        <p className="eyebrow">Resultattips</p>
        <h1 className="section-title mt-2">Resultattips-tabellen</h1>
        <p className="lead mt-3 max-w-3xl">
          Sortert etter resultatpoeng, deretter eksakte resultater og riktig utfall. Bonustips føres i sin egen tabell.
        </p>
      </Panel>

      <ScoringRulesPanel variant="result" />

      <Panel>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Spiller</th>
                <th>Resultattips</th>
                <th>Sum</th>
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
                    </span>
                  </td>
                  <td className="font-black">{standing.totalPoints}</td>
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

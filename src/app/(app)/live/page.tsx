import Link from "next/link";

import { Avatar } from "@/components/avatar";
import { LiveAutoRefresh } from "@/components/live-auto-refresh";
import { ScoringRulesPanel } from "@/components/scoring-rules-panel";
import { TournamentBonusPanel } from "@/components/tournament-bonus-panel";
import { Panel, Stat } from "@/components/ui";
import { getAvatarMap } from "@/lib/avatars";
import { requireSession } from "@/lib/auth";
import { displayMatchup } from "@/lib/display";
import { formatOsloDateTime } from "@/lib/format";
import { isLivePotOpen } from "@/lib/live-pot";
import { computeBonusTipStandings } from "@/lib/scoring";
import { getAppState } from "@/lib/state";

export const metadata = {
  title: "Bonustabell",
};

export default async function LivePage() {
  const [player, state] = await Promise.all([requireSession(), getAppState()]);
  const openMatches = state.matches.filter((match) => isLivePotOpen(match));
  const liveMatches = state.matches.filter((match) => match.status === "live" || match.status === "halftime");
  const standings = computeBonusTipStandings(state);
  const avatars = getAvatarMap(state);
  const leader = standings.find((row) => row.tips > 0);

  return (
    <div className="space-y-6">
      {liveMatches.length ? <LiveAutoRefresh /> : null}

      <Panel>
        <div className="bonus-page-heading">
          <div>
            <p className="eyebrow">Bonustabell</p>
            <h1 className="section-title mt-2">Bonustabell</h1>
            <p className="lead mt-3 max-w-3xl">
              Egen score for målscorere, assister og kort. Selve tippinga skjer nå inne på kampkortet, slik en privat VM-jury med orden i papirene ville ønsket.
            </p>
          </div>
        </div>
      </Panel>

      <ScoringRulesPanel variant="bonus" />

      <TournamentBonusPanel state={state} player={player} />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Åpne kamper" value={openMatches.length} />
        <Stat label="Kort-bonustips" value={state.livePotTips.length} />
        <Stat label="Turneringstips" value={state.tournamentBonusPredictions.length} />
        <Stat
          label="Leder bonustips"
          value={leader ? leader.player.shortName : "-"}
          detail={leader ? `${leader.points} p i egen bonuskamp` : "Ingen bonustips ennå"}
        />
      </div>

      <Panel>
        <p className="eyebrow">Rediger på kampen</p>
        <h2 className="section-title mt-2">Åpne bonuskamper</h2>
        {openMatches.length ? (
          <div className="bonus-match-links mt-4">
            {openMatches.slice(0, 8).map((match) => (
              <Link key={match.id} href={`/kamp/${match.id}`} className="bonus-match-link">
                <strong>{displayMatchup(match)}</strong>
                <span>{formatOsloDateTime(match.kickoffAt)}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="lead mt-3">Ingen åpne bonuskamper akkurat nå. Dommerboka holder linjene rette til neste avspark.</p>
        )}
      </Panel>

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
                <th>Kort</th>
                <th>Turnering</th>
                <th>Gule kort</th>
                <th>Røde kort</th>
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
                  <td className="font-black">{standing.points}</td>
                  <td>{standing.matchBonusPoints}</td>
                  <td>{standing.liveBonusPoints}</td>
                  <td>{standing.tournamentBonusPoints}</td>
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

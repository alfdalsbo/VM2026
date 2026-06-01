import { TeamLink } from "@/components/team-link";
import { displayMatchup } from "@/lib/display";
import { formatOsloDateTime } from "@/lib/format";
import { resultSummary, type KnockoutFlowRound } from "@/lib/tournament";

export function KnockoutFlow({ rounds }: { rounds: KnockoutFlowRound[] }) {
  return (
    <div className="knockout-flow">
      {rounds.map((round) => (
        <section key={round.stage} className="knockout-round">
          <h3>{round.stageLabel}</h3>
          <div className="knockout-round-matches">
            {round.matches.map(({ match, winner, nextLabels }) => (
              <article key={match.id} className="knockout-card">
                <p>Kamp {match.matchNumber} · {formatOsloDateTime(match.kickoffAt)}</p>
                <div className="knockout-teams" aria-label={displayMatchup(match)}>
                  <TeamLink teamName={match.homeTeam} />
                  <strong>{resultSummary(match)}</strong>
                  <TeamLink teamName={match.awayTeam} />
                </div>
                {winner ? (
                  <em>Videre: <TeamLink teamName={winner} /></em>
                ) : nextLabels.length ? (
                  <em>{nextLabels.join(" · ")}</em>
                ) : (
                  <em>Venter på fasit</em>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

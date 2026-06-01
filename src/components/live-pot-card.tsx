import Link from "next/link";

import { BonusAutofillButton } from "@/components/bonus-autofill-button";
import { LivePotForm } from "@/components/live-pot-form";
import { TeamLink } from "@/components/team-link";
import { displayStageOrGroup, formatCompactMatchStatus } from "@/lib/display";
import { formatOsloDateTime, formatScore } from "@/lib/format";
import {
  countRedCards,
  countYellowCards,
  formatLiveRedCardsPrediction,
  getLivePotTip,
  isLivePotOpen,
  scoreLivePotTip,
} from "@/lib/live-pot";
import { SCORE_RULES } from "@/lib/scoring-rules";
import type { AppState, LivePotTip, Player, WorldCupMatch } from "@/lib/types";

type LivePotRow = {
  tip: LivePotTip;
  player: Player;
  score: ReturnType<typeof scoreLivePotTip>;
};

export function LivePotCard({
  match,
  player,
  state,
}: {
  match: WorldCupMatch;
  player: Player;
  state: AppState;
}) {
  const compactStatus = formatCompactMatchStatus(match);
  const open = isLivePotOpen(match);
  const tip = getLivePotTip(state, player.id, match.id);
  const ownScore = scoreLivePotTip(match, tip, state);
  const currentYellowCards = countYellowCards(state.matchEvents, match.id);
  const currentRedCards = countRedCards(state.matchEvents, match.id);
  const rows = state.livePotTips
    .filter((item) => item.matchId === match.id)
    .map((item): LivePotRow | null => {
      const rowPlayer = state.players.find((candidate) => candidate.id === item.playerId);
      if (!rowPlayer) return null;
      return {
        tip: item,
        player: rowPlayer,
        score: scoreLivePotTip(match, item, state),
      };
    })
    .filter((row): row is LivePotRow => Boolean(row))
    .sort((a, b) => b.score.total - a.score.total || a.player.shortName.localeCompare(b.player.shortName, "nb"));

  return (
    <article className="live-pot-card">
      <header className="live-pot-header">
        <div>
          <p className="eyebrow">Kort-bonustips</p>
          <h2 className="live-pot-title">
            <TeamLink teamName={match.homeTeam} /> <span>{formatScore(match.result?.homeGoals, match.result?.awayGoals)}</span>{" "}
            <TeamLink teamName={match.awayTeam} />
          </h2>
          <p className="lead mt-2">
            {formatOsloDateTime(match.kickoffAt)} · {displayStageOrGroup(match)} · {compactStatus.label}
          </p>
        </div>
        <div className="live-pot-actions">
          {open ? <BonusAutofillButton matchId={match.id} next="/live" compact /> : null}
          <Link className="btn-secondary" href={`/kamp/${match.id}`}>Kampkort</Link>
        </div>
      </header>

      <div className="live-pot-facts">
        <div>
          <span>Gule nå</span>
          <strong>{currentYellowCards}</strong>
        </div>
        <div>
          <span>Røde nå</span>
          <strong>{currentRedCards}</strong>
        </div>
        <div>
          <span>Din score</span>
          <strong>{ownScore.total > 0 ? `+${ownScore.total}` : ownScore.total}</strong>
        </div>
      </div>

      <div className="live-pot-body">
        <section className="live-pot-entry">
          <h3>Ditt kort-bonustips</h3>
          {open ? (
            <LivePotForm match={match} tip={tip} currentYellowCards={currentYellowCards} />
          ) : tip ? (
            <p className="lead">
              {tip.yellowCardsTotal} gule · {formatLiveRedCardsPrediction(tip.redCardsTotal)} · {formatSigned(ownScore.total)} poeng.
            </p>
          ) : (
            <p className="lead">Dette bonustipset er låst uten din håndskrift.</p>
          )}
          <p className="live-pot-rules">
            Eksakt antall gule +{SCORE_RULES.bonusTips.yellowExact}. Eksakt antall røde +{SCORE_RULES.bonusTips.redExact}. Bom gir 0.
          </p>
        </section>

        <section className="live-pot-board">
          <h3>Åpent bonusbord</h3>
          {rows.length ? (
            <div className="table-wrap">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Spiller</th>
                    <th>Gule</th>
                    <th>Røde</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.player.id} className={row.player.id === player.id ? "live-pot-me" : undefined}>
                      <td className="font-black">{row.player.shortName}</td>
                      <td>{row.tip.yellowCardsTotal}</td>
                      <td>{row.tip.redCardsTotal}</td>
                      <td className="font-black">{formatSigned(row.score.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="lead">Ingen kort-bonustips på bordet ennå.</p>
          )}
        </section>
      </div>
    </article>
  );
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

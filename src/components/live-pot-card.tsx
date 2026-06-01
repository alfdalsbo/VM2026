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
    <article className="tip-card">
      <div className="tip-card-header">
        <div className="tip-card-header-start">
          <span className="tip-card-time">{formatOsloDateTime(match.kickoffAt)}</span>
          {compactStatus.tone !== "scheduled" ? (
            <span className={`tip-card-status status-${compactStatus.tone}`}>{compactStatus.label}</span>
          ) : null}
        </div>
        <Link className="tip-card-link" href={`/kamp/${match.id}`}>Kampkort</Link>
      </div>

      <div className="tip-card-body">
        <span className="tip-card-stage">{displayStageOrGroup(match)}</span>

        <p className="bonus-card-matchup">
          <TeamLink teamName={match.homeTeam} /> <strong>{formatScore(match.result?.homeGoals, match.result?.awayGoals)}</strong>{" "}
          <TeamLink teamName={match.awayTeam} />
        </p>

        <div className="bonus-card-facts">
          <div><span>Gule nå</span><strong>{currentYellowCards}</strong></div>
          <div><span>Røde nå</span><strong>{currentRedCards}</strong></div>
          <div><span>Din score</span><strong>{formatSigned(ownScore.total)}</strong></div>
        </div>

        {open ? (
          <>
            <LivePotForm match={match} tip={tip} currentYellowCards={currentYellowCards} />
            <div className="bonus-card-autofill">
              <BonusAutofillButton matchId={match.id} next="/live" compact />
            </div>
          </>
        ) : tip ? (
          <p className="tip-result-line">
            Ditt bonustips: <strong>{tip.yellowCardsTotal} gule · {formatLiveRedCardsPrediction(tip.redCardsTotal)}</strong> · {formatSigned(ownScore.total)} poeng
          </p>
        ) : (
          <p className="tip-result-line tip-result-line-muted">Dette bonustipset er låst uten din håndskrift.</p>
        )}

        {rows.length ? (
          <div className="bonus-card-board">
            <span className="tip-card-stage">Åpent bonusbord</span>
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
          </div>
        ) : null}

        <p className="tip-card-footer-note">
          Eksakt antall gule +{SCORE_RULES.bonusTips.yellowExact} · eksakt antall røde +{SCORE_RULES.bonusTips.redExact} · bom gir 0.
        </p>
      </div>
    </article>
  );
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

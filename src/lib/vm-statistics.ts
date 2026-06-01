import { countRedCards, countYellowCards } from "@/lib/live-pot";
import { displayTeamName } from "@/lib/display";
import {
  compareStandings,
  computeBonusTipStandings,
  computeProjectedStandings,
  computeStandings,
  getPrediction,
  getPredictionOrDefault,
  hasFinalResult,
  inferPredictionOutcome,
  scorePrediction,
} from "@/lib/scoring";
import { teamSlug } from "@/lib/teams";
import type { AppState, Prediction, PredictionOutcome, TournamentStats, WorldCupMatch } from "@/lib/types";

export type VmStatisticCard = {
  label: string;
  value: string;
  detail: string;
  meter?: number;
  href?: string;
};

export type VmStatisticRow = {
  title: string;
  value: string;
  detail: string;
  meter?: number;
  href?: string;
};

export type WorldCupStatistics = {
  overview: {
    cards: VmStatisticCard[];
  };
  playerRecords: {
    cards: VmStatisticCard[];
    rows: VmStatisticRow[];
  };
  teamBias: {
    cards: VmStatisticCard[];
    rows: VmStatisticRow[];
  };
  matchDrama: {
    cards: VmStatisticCard[];
    rows: VmStatisticRow[];
  };
  hallOfFame: {
    rows: VmStatisticRow[];
  };
  officialStats: {
    topScorers: VmStatisticRow[];
    assists: VmStatisticRow[];
    discipline: VmStatisticRow[];
    sourceDetail: string;
  };
};

type MatchSide = "home" | "away";

type PlayerPredictionProfile = {
  playerId: string;
  playerName: string;
  deliveredTips: number;
  effectiveTips: number;
  draws: number;
  lowScores: number;
  bigMargins: number;
  highScores: number;
  averageGoals: number;
  cautionScore: number;
  grandiosityScore: number;
};

const numberFormatter = new Intl.NumberFormat("nb-NO");
const decimalFormatter = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 });

export function buildWorldCupStatistics(state: AppState, now = new Date()): WorldCupStatistics {
  const eligibleMatches = state.matches.filter((match) => match.status !== "cancelled" && match.status !== "postponed");
  const finishedMatches = eligibleMatches.filter(hasFinalResult);
  const standings = computeStandings(state);
  const bonusStandings = computeBonusTipStandings(state);
  const deliveredTips = countDeliveredPredictions(state);
  const predictionProfiles = buildPredictionProfiles(state, eligibleMatches, deliveredTips);

  return {
    overview: buildOverview(state, eligibleMatches, finishedMatches),
    playerRecords: buildPlayerRecords(state, finishedMatches, standings, bonusStandings, deliveredTips),
    teamBias: buildTeamBias(state, finishedMatches, predictionProfiles),
    matchDrama: buildMatchDrama(state, eligibleMatches, now),
    hallOfFame: buildHallOfFame(state, finishedMatches, bonusStandings),
    officialStats: buildOfficialStats(state.tournamentStats),
  };
}

function buildOverview(state: AppState, eligibleMatches: WorldCupMatch[], finishedMatches: WorldCupMatch[]) {
  const totalGoals = finishedMatches.reduce((sum, match) => sum + (match.result?.homeGoals ?? 0) + (match.result?.awayGoals ?? 0), 0);
  const yellowCards = state.matches.reduce((sum, match) => sum + countYellowCards(state.matchEvents, match.id), 0);
  const redCards = state.matches.reduce((sum, match) => sum + countRedCards(state.matchEvents, match.id), 0);
  const biggestWin = maxBy(
    finishedMatches
      .filter((match) => match.result)
      .map((match) => ({
        match,
        margin: Math.abs((match.result?.homeGoals ?? 0) - (match.result?.awayGoals ?? 0)),
      })),
    (row) => row.margin,
  );
  const chaosMatch = findChaosMatch(state);

  return {
    cards: [
      {
        label: "Kamper dømt",
        value: `${finishedMatches.length}/${eligibleMatches.length}`,
        detail: finishedMatches.length
          ? "Fasiten har begynt å gjøre seg ubehagelig gjeldende."
          : "Dommerbordet venter. Alle teorier lever foreløpig.",
        meter: eligibleMatches.length ? percentageNumber(finishedMatches.length, eligibleMatches.length) : 0,
      },
      {
        label: "Målprotokoll",
        value: numberFormatter.format(totalGoals),
        detail: finishedMatches.length
          ? `${decimalFormatter.format(totalGoals / finishedMatches.length)} mål per kamp. Passe vitenskapelig.`
          : "Null mål registrert. Null ydmykhet i tipsene.",
      },
      {
        label: "Kortregnskap",
        value: numberFormatter.format(yellowCards + redCards),
        detail: `${yellowCards} gule · ${redCards} røde. Kortjuristene følger med.`,
      },
      {
        label: "Største rundjuling",
        value: biggestWin && biggestWin.margin > 0 ? `${biggestWin.margin} mål` : "Ingen",
        detail:
          biggestWin && biggestWin.margin > 0
            ? `Kamp ${biggestWin.match.matchNumber}: ${matchLabel(biggestWin.match)}.`
            : "Ingen har fått dommen skrevet i blokkbokstaver ennå.",
        href: biggestWin ? matchHref(biggestWin.match) : undefined,
      },
      {
        label: "Kaoskampen",
        value: chaosMatch ? `${chaosMatch.score}` : "Avventer",
        detail: chaosMatch ? `Kamp ${chaosMatch.match.matchNumber}: ${matchLabel(chaosMatch.match)}.` : "Mål, kort og rot samles her når kampene starter.",
        href: chaosMatch ? matchHref(chaosMatch.match) : undefined,
        meter: chaosMatch ? Math.min(100, chaosMatch.score * 8) : 0,
      },
    ],
  };
}

function buildPlayerRecords(
  state: AppState,
  finishedMatches: WorldCupMatch[],
  standings: ReturnType<typeof computeStandings>,
  bonusStandings: ReturnType<typeof computeBonusTipStandings>,
  deliveredTips: Map<string, number>,
) {
  const playedCount = finishedMatches.length;
  const exactLeader = maxBy(standings, (row) => (playedCount ? row.exactResults / playedCount : row.exactResults));
  const outcomeLeader = maxBy(standings, (row) => row.outcomeHits);
  const efficiencyLeader = maxBy(standings, (row) => (playedCount ? row.resultTipPoints / playedCount : row.resultTipPoints));
  const roundLeader = maxBy(standings, (row) => row.roundsWon);
  const bonusLeader = bonusStandings.find((row) => row.points > 0) ?? bonusStandings[0] ?? null;

  const cards: VmStatisticCard[] = [
    {
      label: "Eksakt-orakelet",
      value: exactLeader ? exactLeader.player.shortName : "-",
      detail: exactLeader
        ? `${exactLeader.exactResults}/${playedCount || 0} fasiter. ${deliveredDetail(deliveredTips.get(exactLeader.player.id) ?? 0, exactLeader.predictions)}`
        : "Ingen på vitnebenken ennå.",
      meter: playedCount && exactLeader ? percentageNumber(exactLeader.exactResults, playedCount) : 0,
    },
    {
      label: "Utfallstreff",
      value: outcomeLeader ? outcomeLeader.player.shortName : "-",
      detail: outcomeLeader ? `${outcomeLeader.outcomeHits} riktige vinnere/uavgjort. Kjedelig når det virker.` : "Ingen utfall er avgjort.",
      meter: playedCount && outcomeLeader ? percentageNumber(outcomeLeader.outcomeHits, playedCount) : 0,
    },
    {
      label: "Poeng per dom",
      value: efficiencyLeader && playedCount ? decimalFormatter.format(efficiencyLeader.resultTipPoints / playedCount) : "0",
      detail: efficiencyLeader ? `${efficiencyLeader.player.shortName} presser mest saft ut av fasiten.` : "Foreløpig bare selvtillit.",
    },
    {
      label: "Rundeseire",
      value: roundLeader ? roundLeader.player.shortName : "-",
      detail: roundLeader && roundLeader.roundsWon ? `${roundLeader.roundsWon} rundeseire. Liten pokal, stor mine.` : "Ingen runde har fått eier ennå.",
    },
  ];

  const rows: VmStatisticRow[] = standings.slice(0, 5).map((row) => ({
    title: row.player.shortName,
    value: `${row.totalPoints} p`,
    detail: `${row.exactResults} eksakte · ${row.outcomeHits} utfall · ${deliveredDetail(deliveredTips.get(row.player.id) ?? 0, row.predictions)}`,
    meter: standings[0]?.totalPoints ? percentageNumber(row.totalPoints, standings[0].totalPoints) : 0,
  }));

  if (bonusLeader) {
    rows.push({
      title: "Bonusjegeren",
      value: bonusLeader.points ? `${bonusLeader.player.shortName}: ${bonusLeader.points} p` : "Ingen fangst",
      detail: bonusLeader.points
        ? `${bonusLeader.matchBonusPoints} kampbonus · ${bonusLeader.liveBonusPoints} livebonus. Ekstraregnskapet har fått fører.`
        : "Ingen har klart å smugle bonuspoeng inn bakveien ennå.",
      meter: bonusStandings[0]?.points ? percentageNumber(bonusLeader.points, bonusStandings[0].points) : 0,
    });
  }

  return { cards, rows };
}

function buildTeamBias(state: AppState, finishedMatches: WorldCupMatch[], predictionProfiles: PlayerPredictionProfile[]) {
  const teamRows = buildTeamBiasRows(state, finishedMatches);
  const overvalued = maxBy(teamRows, (row) => row.diff);
  const undervalued = minBy(teamRows, (row) => row.diff);
  const cautious = maxBy(predictionProfiles, (profile) => profile.cautionScore);
  const grandiose = maxBy(predictionProfiles, (profile) => profile.grandiosityScore);

  const cards: VmStatisticCard[] = [
    {
      label: "Mest overvurdert",
      value: overvalued && overvalued.diff > 0 ? displayTeamName(overvalued.teamName) : "Ingen tiltale",
      detail:
        overvalued && overvalued.diff > 0
          ? `Kjelleren ga ${overvalued.predictedPoints} p, fasit ga ${overvalued.actualPoints} p. Det er raus dommerføring.`
          : "Fasiten har ikke avslørt noen kollektiv forelskelse ennå.",
      href: overvalued && overvalued.diff > 0 ? teamHref(overvalued.teamName) : undefined,
      meter: overvalued ? biasMeter(overvalued.diff) : 0,
    },
    {
      label: "Mest undervurdert",
      value: undervalued && undervalued.diff < 0 ? displayTeamName(undervalued.teamName) : "Ingen skam",
      detail:
        undervalued && undervalued.diff < 0
          ? `Fasit ga ${undervalued.actualPoints} p, kjelleren bare ${undervalued.predictedPoints} p. Notert i protokollen.`
          : "Ingen lag har fått kjelleren til å se smålig ut ennå.",
      href: undervalued && undervalued.diff < 0 ? teamHref(undervalued.teamName) : undefined,
      meter: undervalued ? biasMeter(Math.abs(undervalued.diff)) : 0,
    },
    {
      label: "Feighetsindeks",
      value: cautious ? cautious.playerName : "-",
      detail: cautious
        ? `${cautious.draws} uavgjort-tips · ${cautious.lowScores} lavmål. ${deliveredDetail(cautious.deliveredTips, cautious.effectiveTips)}`
        : "Ingen tips å riste på hodet av.",
      meter: cautious ? profileMeter(cautious.cautionScore, predictionProfiles) : 0,
    },
    {
      label: "Stormannsgalskap",
      value: grandiose ? grandiose.playerName : "-",
      detail: grandiose
        ? `${grandiose.bigMargins} store seire · ${decimalFormatter.format(grandiose.averageGoals)} mål i snitt. Luftslott med målnett.`
        : "Ingen har bestilt paradebuss ennå.",
      meter: grandiose ? profileMeter(grandiose.grandiosityScore, predictionProfiles) : 0,
    },
  ];

  const rows = teamRows.length
    ? teamRows
        .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || a.teamName.localeCompare(b.teamName, "nb"))
        .slice(0, 6)
        .map((row) => ({
          title: displayTeamName(row.teamName),
          value: formatSigned(row.diff),
          detail: `${row.predictedPoints} tippepoeng mot ${row.actualPoints} faktiske. ${row.deliveredTips}/${row.effectiveTips} leverte tips bak dommen.`,
          href: teamHref(row.teamName),
          meter: biasMeter(Math.abs(row.diff)),
        }))
    : [
        {
          title: "Lagdommen venter",
          value: "0",
          detail: "Overvurdert og undervurdert krever ferdigspilte kamper. Før det er alt bare høylytt geografi.",
        },
      ];

  return { cards, rows };
}

function buildMatchDrama(state: AppState, eligibleMatches: WorldCupMatch[], now: Date) {
  const disagreement = findMostDisagreedMatch(state, eligibleMatches);
  const lonelyTip = findLonelyTip(state, eligibleMatches);
  const liveSwing = findLiveSwing(state);
  const nextJudgement = eligibleMatches
    .filter((match) => new Date(match.kickoffAt).getTime() > now.getTime())
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))[0];

  const cards: VmStatisticCard[] = [
    {
      label: "Folkets kamp",
      value: disagreement ? `Kamp ${disagreement.match.matchNumber}` : "Ingen splid",
      detail: disagreement ? `${matchLabel(disagreement.match)}. ${disagreement.detail}` : "For få leverte tips til å starte krisemøte.",
      href: disagreement ? matchHref(disagreement.match) : undefined,
      meter: disagreement ? Math.min(100, disagreement.score) : 0,
    },
    {
      label: "Alene på tribunen",
      value: lonelyTip ? lonelyTip.playerName : "Ingen",
      detail: lonelyTip ? lonelyTip.detail : "Ingen har levert en ensom profeti ennå.",
      href: lonelyTip ? matchHref(lonelyTip.match) : undefined,
    },
    {
      label: "Neste dom",
      value: nextJudgement ? `Kamp ${nextJudgement.matchNumber}` : "Ingen",
      detail: nextJudgement ? matchLabel(nextJudgement) : "Terminlisten har gått tom for nye anklager.",
      href: nextJudgement ? matchHref(nextJudgement) : undefined,
    },
  ];

  const rows: VmStatisticRow[] = [];
  if (liveSwing) rows.push(liveSwing);
  if (disagreement) {
    rows.push({
      title: "Mest uenig akkurat nå",
      value: `Score ${disagreement.score}`,
      detail: disagreement.detail,
      href: matchHref(disagreement.match),
      meter: Math.min(100, disagreement.score),
    });
  }
  if (lonelyTip) {
    rows.push({
      title: "Ensom domsavsigelse",
      value: lonelyTip.playerName,
      detail: lonelyTip.detail,
      href: matchHref(lonelyTip.match),
    });
  }
  if (!rows.length) {
    rows.push({
      title: "Dramaavdelingen",
      value: "Stengt",
      detail: "Lever flere tips, så finner kjelleren konfliktstoffet.",
    });
  }

  return { cards, rows };
}

function buildHallOfFame(
  state: AppState,
  finishedMatches: WorldCupMatch[],
  bonusStandings: ReturnType<typeof computeBonusTipStandings>,
) {
  const firstExact = findFirstExact(state, finishedMatches);
  const drought = findLongestExactDrought(state, finishedMatches);
  const biggestMiss = findBiggestMiss(state, finishedMatches);
  const annoyingCorrect = findMostAnnoyingCorrect(state, finishedMatches);
  const bonusHunter = bonusStandings.find((row) => row.points > 0) ?? null;

  return {
    rows: [
      firstExact ?? {
        title: "Første eksakte",
        value: "Ikke utdelt",
        detail: "Ingen fasit, ingen selvgratulasjon.",
      },
      drought ?? {
        title: "Lengste tørke",
        value: "0 kamper",
        detail: "Tørke krever at noen faktisk bommer over tid. Gi det noen kamper.",
      },
      biggestMiss ?? {
        title: "Største bom",
        value: "Ingen",
        detail: "Skammekroken er nyvasket og foreløpig tom.",
      },
      annoyingCorrect ?? {
        title: "Mest irriterende korrekt",
        value: "Ingen",
        detail: "Ingen ensom besserwisser har fått rett ennå.",
      },
      bonusHunter
        ? {
            title: "Beste bonusjeger",
            value: `${bonusHunter.player.shortName}: ${bonusHunter.points} p`,
            detail: `${bonusHunter.tips} bonustips. Dette lukter kalkulator med selvtillit.`,
            meter: bonusStandings[0]?.points ? percentageNumber(bonusHunter.points, bonusStandings[0].points) : 0,
          }
        : {
            title: "Beste bonusjeger",
            value: "Ingen",
            detail: "Bonusbordet venter på første slu manøver.",
          },
    ],
  };
}

function buildOfficialStats(stats: TournamentStats) {
  return {
    topScorers: stats.topScorers.map((row) => ({
      title: row.playerName,
      value: `${row.value}`,
      detail: `${displayTeamName(row.teamName)} · mål`,
      meter: stats.topScorers[0]?.value ? percentageNumber(row.value, stats.topScorers[0].value) : 0,
    })),
    assists: stats.assistMakers.map((row) => ({
      title: row.playerName,
      value: `${row.value}`,
      detail: `${displayTeamName(row.teamName)} · assist`,
      meter: stats.assistMakers[0]?.value ? percentageNumber(row.value, stats.assistMakers[0].value) : 0,
    })),
    discipline: stats.discipline.map((row) => ({
      title: displayTeamName(row.teamName),
      value: `${row.yellowCards + row.redCards}`,
      detail: `${row.yellowCards} gule · ${row.redCards} røde`,
      href: teamHref(row.teamName),
      meter: stats.discipline[0] ? percentageNumber(row.yellowCards + row.redCards, stats.discipline[0].yellowCards + stats.discipline[0].redCards) : 0,
    })),
    sourceDetail: stats.source
      ? `Kilde: ${stats.source}${stats.updatedAt ? ` · oppdatert ${stats.updatedAt.slice(0, 10)}` : ""}`
      : stats.unavailableReason ?? "Offisiell VM-statistikk er ikke tilgjengelig ennå.",
  };
}

function countDeliveredPredictions(state: AppState) {
  const counts = new Map<string, number>();
  const eligibleIds = new Set(state.matches.filter((match) => match.status !== "cancelled" && match.status !== "postponed").map((match) => match.id));
  for (const prediction of state.predictions) {
    if (!eligibleIds.has(prediction.matchId)) continue;
    counts.set(prediction.playerId, (counts.get(prediction.playerId) ?? 0) + 1);
  }
  return counts;
}

function buildPredictionProfiles(state: AppState, eligibleMatches: WorldCupMatch[], deliveredTips: Map<string, number>) {
  return state.players.map((player): PlayerPredictionProfile => {
    const predictions = eligibleMatches.map((match) => getPredictionOrDefault(state, player.id, match.id));
    const draws = predictions.filter((prediction) => predictionOutcome(prediction) === "draw").length;
    const lowScores = predictions.filter((prediction) => prediction.homeGoals + prediction.awayGoals <= 1).length;
    const bigMargins = predictions.filter((prediction) => Math.abs(prediction.homeGoals - prediction.awayGoals) >= 3).length;
    const highScores = predictions.filter((prediction) => prediction.homeGoals + prediction.awayGoals >= 4).length;
    const totalGoals = predictions.reduce((sum, prediction) => sum + prediction.homeGoals + prediction.awayGoals, 0);

    return {
      playerId: player.id,
      playerName: player.shortName,
      deliveredTips: deliveredTips.get(player.id) ?? 0,
      effectiveTips: predictions.length,
      draws,
      lowScores,
      bigMargins,
      highScores,
      averageGoals: predictions.length ? totalGoals / predictions.length : 0,
      cautionScore: draws * 2 + lowScores,
      grandiosityScore: bigMargins * 3 + highScores,
    };
  });
}

function buildTeamBiasRows(state: AppState, finishedMatches: WorldCupMatch[]) {
  const rows = new Map<
    string,
    {
      teamName: string;
      predictedPoints: number;
      actualPoints: number;
      deliveredTips: number;
      effectiveTips: number;
      diff: number;
    }
  >();

  function ensure(teamName: string) {
    const current = rows.get(teamName);
    if (current) return current;
    const next = { teamName, predictedPoints: 0, actualPoints: 0, deliveredTips: 0, effectiveTips: 0, diff: 0 };
    rows.set(teamName, next);
    return next;
  }

  for (const match of finishedMatches) {
    if (!match.result) continue;
    for (const side of ["home", "away"] as const) {
      const teamName = side === "home" ? match.homeTeam : match.awayTeam;
      ensure(teamName).actualPoints += actualPointsForSide(match, side) * state.players.length;
    }

    for (const player of state.players) {
      const prediction = getPredictionOrDefault(state, player.id, match.id);
      const delivered = Boolean(getPrediction(state, player.id, match.id));
      for (const side of ["home", "away"] as const) {
        const teamName = side === "home" ? match.homeTeam : match.awayTeam;
        const row = ensure(teamName);
        row.predictedPoints += predictedPointsForSide(prediction, side);
        row.effectiveTips += 1;
        if (delivered) row.deliveredTips += 1;
      }
    }
  }

  return [...rows.values()].map((row) => ({ ...row, diff: row.predictedPoints - row.actualPoints }));
}

function findChaosMatch(state: AppState) {
  const rows = state.matches
    .map((match) => {
      const goals = (match.result?.homeGoals ?? 0) + (match.result?.awayGoals ?? 0);
      const yellowCards = countYellowCards(state.matchEvents, match.id);
      const redCards = countRedCards(state.matchEvents, match.id);
      const stats = state.matchStats.find((item) => item.matchId === match.id);
      const shotNoise = Math.floor(((stats?.homeShots ?? 0) + (stats?.awayShots ?? 0)) / 10);
      return {
        match,
        score: goals + yellowCards + redCards * 3 + shotNoise,
      };
    })
    .filter((row) => row.score > 0);

  return maxBy(rows, (row) => row.score);
}

function findMostDisagreedMatch(state: AppState, eligibleMatches: WorldCupMatch[]) {
  const rows = eligibleMatches
    .map((match) => {
      const predictions = state.predictions.filter((prediction) => prediction.matchId === match.id);
      if (predictions.length < 2) return null;
      const outcomeCounts = countBy(predictions, (prediction) => predictionOutcome(prediction));
      const scoreCounts = countBy(predictions, (prediction) => predictionScoreLabel(prediction));
      const homeSpread = spread(predictions.map((prediction) => prediction.homeGoals));
      const awaySpread = spread(predictions.map((prediction) => prediction.awayGoals));
      const score = outcomeCounts.size * 18 + scoreCounts.size * 8 + homeSpread + awaySpread;
      return {
        match,
        score,
        detail: `${predictions.length} leverte tips: ${formatOutcomeDistribution(outcomeCounts, match)}. ${scoreCounts.size} ulike resultater.`,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return maxBy(rows, (row) => row.score);
}

function findLonelyTip(state: AppState, eligibleMatches: WorldCupMatch[]) {
  for (const match of eligibleMatches) {
    const predictions = state.predictions.filter((prediction) => prediction.matchId === match.id);
    if (predictions.length < 2) continue;

    const outcomeCounts = countBy(predictions, (prediction) => predictionOutcome(prediction));
    const lonelyOutcome = [...outcomeCounts.entries()].find(([, count]) => count === 1);
    if (lonelyOutcome) {
      const prediction = predictions.find((item) => predictionOutcome(item) === lonelyOutcome[0]);
      const player = prediction ? state.players.find((candidate) => candidate.id === prediction.playerId) : null;
      if (prediction && player) {
        return {
          match,
          playerName: player.shortName,
          detail: `${player.shortName} står alene på ${outcomeLabel(lonelyOutcome[0], match)} i kamp ${match.matchNumber}. Enten genialt, eller bevismateriale.`,
        };
      }
    }

    const scoreCounts = countBy(predictions, (prediction) => predictionScoreLabel(prediction));
    const lonelyScore = [...scoreCounts.entries()].find(([, count]) => count === 1);
    if (lonelyScore) {
      const prediction = predictions.find((item) => predictionScoreLabel(item) === lonelyScore[0]);
      const player = prediction ? state.players.find((candidate) => candidate.id === prediction.playerId) : null;
      if (prediction && player) {
        return {
          match,
          playerName: player.shortName,
          detail: `${player.shortName} er alene om ${lonelyScore[0]} i kamp ${match.matchNumber}. Arkiveres under modig eller mistenkelig.`,
        };
      }
    }
  }

  return null;
}

function findLiveSwing(state: AppState): VmStatisticRow | null {
  const liveMatch = state.matches.find((match) => (match.status === "live" || match.status === "halftime") && match.result);
  if (!liveMatch) return null;

  const comparison = compareStandings(computeStandings(state), computeProjectedStandings(state, [liveMatch.id]));
  const winner = maxBy(comparison, (row) => row.pointsDelta * 10 + row.rankDelta);
  const loser = minBy(comparison, (row) => row.pointsDelta * 10 + row.rankDelta);

  return {
    title: "Hvis dette står seg",
    value: winner && winner.pointsDelta > 0 ? `${winner.player.shortName} +${winner.pointsDelta}` : "Ingen vinner",
    detail:
      winner && loser
        ? `${matchLabel(liveMatch)} flytter ${winner.player.shortName} opp og sender ${loser.player.shortName} til ny forklaring.`
        : `${matchLabel(liveMatch)} påvirker tabellen idet dommeren blåser.`,
    href: matchHref(liveMatch),
    meter: winner ? Math.min(100, winner.pointsDelta * 25) : 0,
  };
}

function findFirstExact(state: AppState, finishedMatches: WorldCupMatch[]): VmStatisticRow | null {
  for (const match of [...finishedMatches].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))) {
    const hits = state.players
      .map((player) => ({
        player,
        prediction: getPredictionOrDefault(state, player.id, match.id),
        delivered: Boolean(getPrediction(state, player.id, match.id)),
      }))
      .filter((row) => scorePrediction(match, row.prediction, state).exactResult > 0);
    if (!hits.length) continue;

    const first = hits[0];
    return {
      title: "Første eksakte",
      value: hits.length === 1 ? first.player.shortName : `${first.player.shortName} +${hits.length - 1}`,
      detail: `Kamp ${match.matchNumber}: ${predictionScoreLabel(first.prediction)} på ${matchLabel(match)}. ${first.delivered ? "Levert med håndskrift." : "0-0-standarden tok æren."}`,
      href: matchHref(match),
      meter: percentageNumber(hits.length, state.players.length),
    };
  }

  return null;
}

function findLongestExactDrought(state: AppState, finishedMatches: WorldCupMatch[]): VmStatisticRow | null {
  if (!finishedMatches.length) return null;
  const sortedMatches = [...finishedMatches].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
  const rows = state.players.map((player) => {
    let current = 0;
    let longest = 0;
    for (const match of sortedMatches) {
      const prediction = getPredictionOrDefault(state, player.id, match.id);
      if (scorePrediction(match, prediction, state).exactResult > 0) {
        current = 0;
      } else {
        current += 1;
        longest = Math.max(longest, current);
      }
    }
    return { player, longest };
  });
  const drought = maxBy(rows, (row) => row.longest);
  if (!drought) return null;

  return {
    title: "Lengste tørke",
    value: `${drought.player.shortName}: ${drought.longest}`,
    detail: drought.longest
      ? `${drought.longest} kamper uten eksakt. Det er ikke uflaks lenger, det er stilretning.`
      : "Alle har truffet eksakt hver gang. Dette virker mistenkelig.",
    meter: percentageNumber(drought.longest, sortedMatches.length),
  };
}

function findBiggestMiss(state: AppState, finishedMatches: WorldCupMatch[]): VmStatisticRow | null {
  const rows = finishedMatches.flatMap((match) =>
    state.players.map((player) => {
      const prediction = getPredictionOrDefault(state, player.id, match.id);
      return {
        match,
        player,
        prediction,
        error: goalError(match, prediction),
        delivered: Boolean(getPrediction(state, player.id, match.id)),
      };
    }),
  );
  const miss = maxBy(rows, (row) => row.error);
  if (!miss) return null;

  return {
    title: "Største bom",
    value: `${miss.player.shortName}: ${miss.error}`,
    detail: `${predictionScoreLabel(miss.prediction)} mot fasit ${matchScoreLabel(miss.match)} i kamp ${miss.match.matchNumber}. ${miss.delivered ? "Signert og arkivert." : "0-0-standarden får ta smellen."}`,
    href: matchHref(miss.match),
    meter: Math.min(100, miss.error * 12),
  };
}

function findMostAnnoyingCorrect(state: AppState, finishedMatches: WorldCupMatch[]): VmStatisticRow | null {
  const rows = finishedMatches
    .map((match) => {
      const hits = state.players
        .map((player) => ({
          player,
          prediction: getPredictionOrDefault(state, player.id, match.id),
        }))
        .filter((row) => scorePrediction(match, row.prediction, state).exactResult > 0);
      return { match, hits };
    })
    .filter((row) => row.hits.length > 0)
    .sort((a, b) => a.hits.length - b.hits.length || b.match.kickoffAt.localeCompare(a.match.kickoffAt));
  const row = rows[0];
  if (!row) return null;

  return {
    title: "Mest irriterende korrekt",
    value: row.hits.length === 1 ? row.hits[0].player.shortName : `${row.hits.length} traff`,
    detail:
      row.hits.length === 1
        ? `${row.hits[0].player.shortName} var alene om ${matchScoreLabel(row.match)} i kamp ${row.match.matchNumber}. Uutholdelig, men korrekt.`
        : `${row.hits.length} traff ${matchScoreLabel(row.match)} i kamp ${row.match.matchNumber}. Irriterende kollektivt.`,
    href: matchHref(row.match),
    meter: percentageNumber(row.hits.length, state.players.length),
  };
}

function actualPointsForSide(match: WorldCupMatch, side: MatchSide) {
  if (!match.result) return 0;
  const homeGoals = match.result.homeGoals;
  const awayGoals = match.result.awayGoals;
  if (homeGoals === awayGoals) return 1;
  if (homeGoals > awayGoals) return side === "home" ? 3 : 0;
  return side === "away" ? 3 : 0;
}

function predictedPointsForSide(prediction: Prediction, side: MatchSide) {
  const outcome = predictionOutcome(prediction);
  if (outcome === "draw") return 1;
  return outcome === side ? 3 : 0;
}

function predictionOutcome(prediction: Prediction): PredictionOutcome | MatchSide {
  const baseOutcome = inferPredictionOutcome(prediction.homeGoals, prediction.awayGoals);
  if (baseOutcome !== "draw") return baseOutcome;
  return prediction.knockoutResolution?.winner ?? "draw";
}

function predictionScoreLabel(prediction: Prediction) {
  const goals = predictionGoals(prediction);
  return `${goals.homeGoals}-${goals.awayGoals}`;
}

function predictionGoals(prediction: Prediction) {
  if (prediction.homeGoals === prediction.awayGoals && prediction.knockoutResolution?.method === "extra_time") {
    return {
      homeGoals: prediction.knockoutResolution.homeGoals,
      awayGoals: prediction.knockoutResolution.awayGoals,
    };
  }

  return {
    homeGoals: prediction.homeGoals,
    awayGoals: prediction.awayGoals,
  };
}

function goalError(match: WorldCupMatch, prediction: Prediction) {
  if (!match.result) return 0;
  const goals = predictionGoals(prediction);
  return Math.abs(goals.homeGoals - match.result.homeGoals) + Math.abs(goals.awayGoals - match.result.awayGoals);
}

function matchLabel(match: WorldCupMatch) {
  return `${match.homeTeam} - ${match.awayTeam}`;
}

function matchScoreLabel(match: WorldCupMatch) {
  return match.result ? `${match.result.homeGoals}-${match.result.awayGoals}` : "uten fasit";
}

function matchHref(match: WorldCupMatch) {
  return `/kamp/${match.id}`;
}

function teamHref(teamName: string) {
  return `/lag/${teamSlug(teamName)}`;
}

function deliveredDetail(delivered: number, effective: number) {
  return `${delivered} levert · ${effective} effektiv${effective === 1 ? "t" : "e"} med 0-0-standard`;
}

function outcomeLabel(outcome: PredictionOutcome | MatchSide, match: WorldCupMatch) {
  if (outcome === "home") return match.homeTeam;
  if (outcome === "away") return match.awayTeam;
  return "uavgjort";
}

function formatOutcomeDistribution(counts: Map<PredictionOutcome | MatchSide, number>, match: WorldCupMatch) {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || outcomeLabel(a[0], match).localeCompare(outcomeLabel(b[0], match), "nb"))
    .map(([outcome, count]) => `${count} ${outcomeLabel(outcome, match)}`)
    .join(" · ");
}

function countBy<T, K>(items: T[], selector: (item: T) => K) {
  const counts = new Map<K, number>();
  for (const item of items) {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function spread(values: number[]) {
  if (!values.length) return 0;
  return Math.max(...values) - Math.min(...values);
}

function percentageNumber(value: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
}

function biasMeter(value: number) {
  return Math.min(100, Math.abs(value) * 8);
}

function profileMeter(value: number, profiles: PlayerPredictionProfile[]) {
  const max = Math.max(...profiles.map((profile) => profile.cautionScore), ...profiles.map((profile) => profile.grandiosityScore), 1);
  return percentageNumber(value, max);
}

function formatSigned(value: number) {
  if (value > 0) return `+${numberFormatter.format(value)}`;
  return numberFormatter.format(value);
}

function maxBy<T>(items: T[], score: (item: T) => number): T | null {
  let best: T | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    const itemScore = score(item);
    if (itemScore > bestScore) {
      best = item;
      bestScore = itemScore;
    }
  }
  return best;
}

function minBy<T>(items: T[], score: (item: T) => number): T | null {
  let best: T | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const item of items) {
    const itemScore = score(item);
    if (itemScore < bestScore) {
      best = item;
      bestScore = itemScore;
    }
  }
  return best;
}

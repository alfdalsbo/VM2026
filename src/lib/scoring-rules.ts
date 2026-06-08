export const SCORE_RULES = {
  resultTips: {
    outcome: 1,
    goalDifference: 0,
    exactResult: 2,
  },
  bonusTips: {
    scorer: 2,
    assist: 2,
    yellowExact: 1,
    redExact: 1,
    tournamentWinner: 15,
    tournamentTopScorer: 10,
    tournamentAssistKing: 10,
    winnerAward: 10,
  },
} as const;

export const BONUS_TIPS_WINNER_AWARD = SCORE_RULES.bonusTips.winnerAward;

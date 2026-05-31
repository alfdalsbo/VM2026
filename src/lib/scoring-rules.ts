export const SCORE_RULES = {
  resultTips: {
    outcome: 4,
    goalDifference: 2,
    exactResult: 4,
  },
  bonusTips: {
    scorer: 2,
    assist: 1,
    yellowExact: 3,
    yellowClose: 1,
    yellowMiss: -1,
    redCardYesHit: 2,
    redCardNoHit: 1,
    redCardMiss: -1,
    winnerAward: 10,
  },
} as const;

export const BONUS_TIPS_WINNER_AWARD = SCORE_RULES.bonusTips.winnerAward;

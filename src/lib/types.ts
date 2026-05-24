export type PlayerRole = "admin" | "player";

export type Player = {
  id: string;
  name: string;
  shortName: string;
  avatar: string;
  color: string;
  role: PlayerRole;
};

export type TournamentStage =
  | "group"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export type Round = {
  id: string;
  name: string;
  stage: TournamentStage;
  startsAt: string;
  endsAt: string;
};

export type MatchResult = {
  homeGoals: number;
  awayGoals: number;
  decidedByPenalties: boolean;
  advancingTeam: "home" | "away" | null;
  updatedAt: string;
  updatedBy: string;
};

export type WorldCupMatch = {
  id: string;
  matchNumber: number;
  roundId: string;
  stage: TournamentStage;
  stageLabel: string;
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  localKickoffAt: string;
  venue: string;
  city: string;
  result: MatchResult | null;
};

export type Prediction = {
  playerId: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  advancingTeam: "home" | "away" | null;
  joker: boolean;
  updatedAt: string;
};

export type AppState = {
  players: Player[];
  rounds: Round[];
  matches: WorldCupMatch[];
  predictions: Prediction[];
  version: number;
};

export type Session = {
  playerId: string;
  issuedAt: number;
};

export type ScoreBreakdown = {
  outcome: number;
  goalDifference: number;
  exactResult: number;
  base: number;
  total: number;
  jokerApplied: boolean;
};

export type Standing = {
  rank: number;
  player: Player;
  totalPoints: number;
  predictions: number;
  exactResults: number;
  outcomeHits: number;
  jokerHits: number;
  jokerPoints: number;
  roundsWon: number;
  lastRoundPoints: number;
};

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

export type MatchStatus = "scheduled" | "live" | "halftime" | "finished" | "postponed" | "cancelled" | "unknown";

export type PredictionOutcome = "home" | "draw" | "away";

export type ResultSource = "manual" | "fifa";

export type MatchResult = {
  homeGoals: number;
  awayGoals: number;
  decidedByPenalties: boolean;
  advancingTeam: "home" | "away" | null;
  updatedAt: string;
  updatedBy: string;
  source?: ResultSource;
};

export type BroadcastInfo = {
  channel: string;
  service: string;
  sourceName: string;
  sourceUrl: string;
  verifiedAt: string;
  note?: string;
};

export type WorldCupMatch = {
  id: string;
  matchNumber: number;
  fifaMatchId: string | null;
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
  status: MatchStatus;
  minute: number | null;
  period: string | null;
  lastSyncedAt: string | null;
  syncSource: string | null;
  syncStatus: string | null;
  broadcasts: BroadcastInfo[];
};

export type Prediction = {
  playerId: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  outcome?: PredictionOutcome;
  advancingTeam: "home" | "away" | null;
  joker: boolean;
  updatedAt: string;
};

export type SyncState = {
  status: "idle" | "success" | "error" | "skipped";
  source: string | null;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  updatedMatches: number;
  message: string | null;
};

export type PlayerTournamentStat = {
  playerName: string;
  teamName: string;
  value: number;
};

export type TeamDisciplineStat = {
  teamName: string;
  yellowCards: number;
  redCards: number;
};

export type TournamentStats = {
  topScorers: PlayerTournamentStat[];
  assistMakers: PlayerTournamentStat[];
  discipline: TeamDisciplineStat[];
  updatedAt: string | null;
  source: string | null;
  unavailableReason: string | null;
};

export type AppState = {
  players: Player[];
  rounds: Round[];
  matches: WorldCupMatch[];
  predictions: Prediction[];
  sync: SyncState;
  tournamentStats: TournamentStats;
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

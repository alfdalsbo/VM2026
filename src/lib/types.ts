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

export type TeamSide = "home" | "away";

export type KnockoutPredictionResolution =
  | {
      method: "extra_time";
      homeGoals: number;
      awayGoals: number;
      winner: "home" | "away";
    }
  | {
      method: "penalties";
      winner: "home" | "away";
    };

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

export type CoachInfo = {
  name: string | null;
  countryCode?: string | null;
  pictureUrl?: string | null;
  source: string | null;
  updatedAt: string | null;
};

export type TeamSquadPlayer = {
  id: string;
  name: string;
  position: "goalkeeper" | "defender" | "midfielder" | "forward" | "unknown";
  shirtNumber: number | null;
  playerProfileId?: string | null;
  shortName?: string | null;
  countryCode?: string | null;
  birthDate?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  matchesPlayed?: number | null;
  minutesPlayed?: number | null;
  starts?: number | null;
  goals?: number | null;
  assists?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
  pictureUrl?: string | null;
  positionDetail?: string | null;
  source: string | null;
};

export type TeamProfile = {
  teamName: string;
  slug: string;
  fifaTeamId: string | null;
  abbreviation: string | null;
  countryCode: string | null;
  confederation: string | null;
  flagUrl: string | null;
  city: string | null;
  foundationYear: number | null;
  officialSite: string | null;
  coach: CoachInfo;
  squad: TeamSquadPlayer[];
  fifaUrl: string;
  fotmobUrl: string;
  source: string | null;
  updatedAt: string | null;
};

export type LineupPlayer = {
  id: string;
  name: string;
  teamName: string;
  teamSide: TeamSide;
  playerProfileId: string | null;
  position: string;
  role: TeamSquadPlayer["position"];
  shirtNumber: number | null;
  isStarter: boolean;
  isCaptain: boolean;
  isConfirmed: boolean;
  x: number | null;
  y: number | null;
};

export type Formation = {
  home: string | null;
  away: string | null;
};

export type LineupStatus = "not_published" | "expected" | "confirmed";

export type MatchLineup = {
  matchId: string;
  formation: Formation;
  status: LineupStatus;
  confirmedAt: string | null;
  players: LineupPlayer[];
  homeBench: LineupPlayer[];
  awayBench: LineupPlayer[];
  source: string | null;
  updatedAt: string | null;
};

export type MatchEventType =
  | "goal"
  | "own_goal"
  | "penalty_goal"
  | "penalty_missed"
  | "yellow_card"
  | "red_card"
  | "second_yellow"
  | "substitution"
  | "var"
  | "period"
  | "unknown";

export type MatchEvent = {
  id: string;
  matchId: string;
  minute: number | null;
  period: string | null;
  type: MatchEventType;
  teamSide: TeamSide | null;
  playerId: string | null;
  playerProfileId: string | null;
  playerName: string | null;
  assistPlayerName: string | null;
  relatedPlayerName: string | null;
  scoreAfter: {
    homeGoals: number;
    awayGoals: number;
  } | null;
  source: ResultSource | "manual";
  updatedAt: string;
};

export type FollowedMatch = {
  playerId: string;
  matchId: string;
  createdAt: string;
};

export type PlayerProfile = {
  id: string;
  fifaPlayerId: string | null;
  name: string;
  shortName: string | null;
  teamName: string;
  teamSlug: string;
  position: TeamSquadPlayer["position"];
  positionDetail: string | null;
  shirtNumber: number | null;
  pictureUrl: string | null;
  birthDate: string | null;
  heightCm: number | null;
  weightKg: number | null;
  matchesPlayed: number | null;
  minutesPlayed: number | null;
  starts: number | null;
  goals: number | null;
  assists: number | null;
  yellowCards: number | null;
  redCards: number | null;
  rosterStatus: "squad" | "lineup" | "event_only";
  source: string | null;
  updatedAt: string | null;
};

export type MatchStats = {
  matchId: string;
  homePossession: number | null;
  awayPossession: number | null;
  homeShots: number | null;
  awayShots: number | null;
  homeShotsOnTarget: number | null;
  awayShotsOnTarget: number | null;
  homeCorners: number | null;
  awayCorners: number | null;
  attendance: number | null;
  weather: string | null;
  temperatureCelsius: number | null;
  windSpeed: number | null;
  officials: Array<{
    id: string;
    name: string;
    role: string;
    countryCode: string | null;
  }>;
  homeFormation: string | null;
  awayFormation: string | null;
  firstHalfStartedAt: string | null;
  secondHalfStartedAt: string | null;
  firstHalfExtraTimeStartedAt: string | null;
  secondHalfExtraTimeStartedAt: string | null;
  source: string | null;
  updatedAt: string | null;
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
  knockoutResolution?: KnockoutPredictionResolution | null;
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
  teamProfiles: TeamProfile[];
  lineups: MatchLineup[];
  matchStats: MatchStats[];
  matchEvents: MatchEvent[];
  followedMatches: FollowedMatch[];
  playerProfiles: PlayerProfile[];
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
};

export type Standing = {
  rank: number;
  player: Player;
  totalPoints: number;
  predictions: number;
  exactResults: number;
  outcomeHits: number;
  roundsWon: number;
  lastRoundPoints: number;
};

export type ShareCard = {
  playerId: string;
  matchId: string;
  issuedAt: number;
};

import { emptyTournamentStats, getAppState, mutateAppState } from "@/lib/state";
import { isKnockoutPlaceholder } from "@/lib/knockout-placeholders";
import { createTeamProfile, teamSlug } from "@/lib/teams";
import { applyKnockoutResolversToState } from "@/lib/tournament";
import { applyManualWorldCupOverrides } from "@/lib/manual-world-cup-overrides";
import { derivePlayerProfilesFromState, playerProfileIdFor } from "@/lib/player-profiles";
import { syncFifaTechnicalReportsForState } from "@/lib/fifa-technical-reports";
import { normalizeApiFootballSyncState, syncApiFootballForState } from "@/lib/api-football-sync";
import { deriveTournamentBonusResult } from "@/lib/tournament-bonus";
import type {
  AppState,
  CoachInfo,
  LineupPlayer,
  MatchEvent,
  MatchEventType,
  MatchLineup,
  MatchResult,
  MatchStats,
  MatchStatus,
  TeamSide,
  SyncState,
  TeamProfile,
  TeamSquadPlayer,
  TournamentStats,
  WorldCupMatch,
} from "@/lib/types";

const fifaCalendarUrl = "https://api.fifa.com/api/v3/calendar/matches?language=en&count=200&idCompetition=17&idSeason=285023";
const fifaTeamUrl = (teamId: string) => `https://api.fifa.com/api/v3/teams/${teamId}?language=en`;
const fifaSquadUrl = (teamId: string) =>
  `https://api.fifa.com/api/v3/teams/${teamId}/squad?language=en&idCompetition=17&idSeason=285023`;
const teamProfileRefreshMs = 60 * 60 * 1000;
const syncWindowStart = Date.parse("2026-06-10T00:00:00Z");
const syncWindowEnd = Date.parse("2026-07-21T06:00:00Z");

type FifaTeam = {
  IdTeam?: string | null;
  IdCountry?: string | null;
  IdAssociation?: string | null;
  Abbreviation?: string | null;
  PictureUrl?: string | null;
  Tactics?: string | null;
  TeamName?: Array<{ Locale?: string; Description?: string }>;
  ShortClubName?: string | null;
  Lineup?: FifaLineupEntry[] | null;
  Players?: FifaLineupEntry[] | null;
  Substitutes?: FifaLineupEntry[] | null;
  Bench?: FifaLineupEntry[] | null;
};

export type FifaMatch = {
  IdMatch?: string;
  MatchNumber?: number;
  MatchStatus?: number | string | null;
  MatchTime?: number | string | null;
  HomeTeamScore?: number | null;
  AwayTeamScore?: number | null;
  HomeTeamPenaltyScore?: number | null;
  AwayTeamPenaltyScore?: number | null;
  Winner?: string | number | null;
  LastPeriodUpdate?: string | null;
  Home?: FifaTeam | null;
  Away?: FifaTeam | null;
  MatchStatistics?: FifaStat[] | null;
  Statistics?: FifaStat[] | null;
  Weather?: FifaWeather | null;
  Attendance?: number | string | null;
  BallPossession?: {
    OverallHome?: number | null;
    OverallAway?: number | null;
  } | null;
  Officials?: FifaMatchOfficial[] | null;
  FirstHalfTime?: string | null;
  SecondHalfTime?: string | null;
  FirstHalfExtraTime?: string | null;
  SecondHalfExtraTime?: string | null;
  Events?: FifaMatchEvent[] | null;
  MatchEvents?: FifaMatchEvent[] | null;
  Timeline?: FifaMatchEvent[] | null;
  HomeLineup?: FifaLineupEntry[] | null;
  AwayLineup?: FifaLineupEntry[] | null;
  HomeSubstitutes?: FifaLineupEntry[] | null;
  AwaySubstitutes?: FifaLineupEntry[] | null;
};

type FifaStat = {
  Type?: string | null;
  Name?: string | null;
  Home?: number | string | null;
  Away?: number | string | null;
  HomeValue?: number | string | null;
  AwayValue?: number | string | null;
};

type FifaResponse = {
  Results?: FifaMatch[];
};

type FifaWeather = {
  Humidity?: number | string | null;
  Temperature?: number | string | null;
  WindSpeed?: number | string | null;
  TypeLocalized?: Array<{ Locale?: string; Description?: string }>;
};

type FifaMatchOfficial = {
  OfficialId?: string | null;
  IdCountry?: string | null;
  Name?: Array<{ Locale?: string; Description?: string }>;
  TypeLocalized?: Array<{ Locale?: string; Description?: string }>;
};

type FifaLineupEntry = {
  IdPlayer?: string | number | null;
  PlayerId?: string | number | null;
  PlayerName?: Array<{ Locale?: string; Description?: string }> | string | null;
  Name?: Array<{ Locale?: string; Description?: string }> | string | null;
  ShortName?: Array<{ Locale?: string; Description?: string }> | string | null;
  JerseyNum?: number | string | null;
  ShirtNumber?: number | string | null;
  Position?: number | string | null;
  RealPosition?: number | string | null;
  PositionLocalized?: Array<{ Locale?: string; Description?: string }> | null;
  RealPositionLocalized?: Array<{ Locale?: string; Description?: string }> | null;
  X?: number | string | null;
  Y?: number | string | null;
  Captain?: boolean | null;
  IsCaptain?: boolean | null;
  IsStarter?: boolean | null;
};

type FifaMatchEvent = {
  IdEvent?: string | number | null;
  EventId?: string | number | null;
  Type?: string | number | null;
  EventType?: string | number | null;
  EventTypeName?: string | null;
  EventTypeLocalized?: Array<{ Locale?: string; Description?: string }> | null;
  Minute?: number | string | null;
  MatchTime?: number | string | null;
  Period?: string | null;
  TeamId?: string | number | null;
  IdTeam?: string | number | null;
  HomeTeamScore?: number | null;
  AwayTeamScore?: number | null;
  PlayerId?: string | number | null;
  IdPlayer?: string | number | null;
  PlayerName?: Array<{ Locale?: string; Description?: string }> | string | null;
  Player?: FifaLineupEntry | null;
  AssistPlayerName?: Array<{ Locale?: string; Description?: string }> | string | null;
  RelatedPlayerName?: Array<{ Locale?: string; Description?: string }> | string | null;
  SubstitutionOffPlayerName?: Array<{ Locale?: string; Description?: string }> | string | null;
};

type FifaTeamDetail = {
  IdTeam?: string | null;
  IdConfederation?: string | null;
  Name?: Array<{ Locale?: string; Description?: string }>;
  DisplayName?: Array<{ Locale?: string; Description?: string }>;
  IdCountry?: string | null;
  OfficialSite?: string | null;
  City?: string | null;
  RegionName?: string | null;
  FoundationYear?: number | null;
  ShortClubName?: string | null;
  Abbreviation?: string | null;
  PictureUrl?: string | null;
};

type FifaSquadPlayer = {
  IdPlayer?: string | null;
  PlayerName?: Array<{ Locale?: string; Description?: string }>;
  ShortName?: Array<{ Locale?: string; Description?: string }>;
  JerseyNum?: number | null;
  Position?: number | null;
  RealPosition?: number | null;
  PositionLocalized?: Array<{ Locale?: string; Description?: string }>;
  RealPositionLocalized?: Array<{ Locale?: string; Description?: string }>;
  BirthDate?: string | null;
  IdCountry?: string | null;
  Height?: number | null;
  Weight?: number | null;
  MatchesPlayed?: number | null;
  MinutesPlayed?: number | null;
  Starts?: number | null;
  Goals?: number | null;
  Assists?: number | null;
  YellowCards?: number | null;
  RedCards?: number | null;
  PictureUrl?: string | null;
  ThumbnailUrl?: string | null;
  PlayerPicture?: { PictureUrl?: string | null } | null;
};

type FifaSquadOfficial = {
  IdCoach?: string | null;
  Name?: Array<{ Locale?: string; Description?: string }>;
  Role?: number | null;
  IdCountry?: string | null;
  PictureUrl?: string | null;
};

type FifaSquadResponse = {
  IdTeam?: string | null;
  IdCountry?: string | null;
  PictureUrl?: string | null;
  TeamName?: Array<{ Locale?: string; Description?: string }>;
  Players?: FifaSquadPlayer[];
  Officials?: FifaSquadOfficial[];
};

type SyncOptions = {
  force?: boolean;
  ignoreWindow?: boolean;
  now?: Date;
  fetcher?: typeof fetch;
};

function inSyncWindow(now: Date) {
  const time = now.getTime();
  return time >= syncWindowStart && time <= syncWindowEnd;
}

function teamName(team: FifaTeam | null | undefined) {
  return localizedText(team?.TeamName) ?? team?.ShortClubName ?? null;
}

function localizedText(values: Array<{ Locale?: string; Description?: string }> | null | undefined) {
  return values?.find((name) => name.Locale?.toLowerCase() === "en-gb")?.Description ?? values?.[0]?.Description ?? null;
}

function localizedMaybe(value: Array<{ Locale?: string; Description?: string }> | string | null | undefined) {
  if (typeof value === "string") return value;
  return localizedText(value);
}

function fifaImageUrl(url: string | null | undefined) {
  return url?.replace("{format}", "sq").replace("{size}", "2") ?? null;
}

function numberOrNull(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace("%", "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mapStatus(match: FifaMatch): MatchStatus {
  const rawStatus = Number(match.MatchStatus);
  const hasScore = typeof match.HomeTeamScore === "number" && typeof match.AwayTeamScore === "number";
  if (rawStatus === 1 && !hasScore) return "scheduled";
  if (rawStatus === 3 || rawStatus === 4 || rawStatus === 7 || rawStatus === 8) return "live";
  if (rawStatus === 5) return "halftime";
  if (rawStatus === 0 || rawStatus === 2 || rawStatus === 12 || match.Winner) return hasScore ? "finished" : "unknown";
  if (rawStatus === 9) return "postponed";
  if (rawStatus === 10) return "cancelled";
  if (match.MatchTime) return "live";
  return hasScore ? "live" : "unknown";
}

function minuteFrom(match: FifaMatch) {
  const minute = Number(match.MatchTime);
  return Number.isFinite(minute) && minute > 0 ? minute : null;
}

function winnerSide(match: FifaMatch) {
  const winner = match.Winner ? String(match.Winner) : null;
  if (!winner) return null;
  if (winner === String(match.Home?.IdTeam)) return "home";
  if (winner === String(match.Away?.IdTeam)) return "away";
  return null;
}

export function mapFifaResult(match: FifaMatch, syncedAt: string): MatchResult | null {
  if (typeof match.HomeTeamScore !== "number" || typeof match.AwayTeamScore !== "number") return null;
  const decidedByPenalties = typeof match.HomeTeamPenaltyScore === "number" && typeof match.AwayTeamPenaltyScore === "number";
  return {
    homeGoals: match.HomeTeamScore,
    awayGoals: match.AwayTeamScore,
    decidedByPenalties,
    advancingTeam: decidedByPenalties ? winnerSide(match) : null,
    updatedAt: syncedAt,
    updatedBy: "sync:fifa",
    source: "fifa",
  };
}

function parseStatValue(value: number | string | null | undefined) {
  return numberOrNull(value);
}

function findStat(match: FifaMatch, pattern: RegExp) {
  const stats = match.MatchStatistics ?? match.Statistics ?? [];
  const stat = stats.find((item) => pattern.test(`${item.Type ?? ""} ${item.Name ?? ""}`));
  if (!stat) return { home: null, away: null };
  return {
    home: parseStatValue(stat.Home ?? stat.HomeValue),
    away: parseStatValue(stat.Away ?? stat.AwayValue),
  };
}

function mapFifaStats(matchId: string, match: FifaMatch, syncedAt: string): MatchStats | null {
  const possession = findStat(match, /possession/i);
  const shots = findStat(match, /^.*shots?$/i);
  const shotsOnTarget = findStat(match, /shots?.*target/i);
  const corners = findStat(match, /corner/i);
  const overallHomePossession = parseStatValue(match.BallPossession?.OverallHome);
  const overallAwayPossession = parseStatValue(match.BallPossession?.OverallAway);
  const officials = mapMatchOfficials(match.Officials ?? []);
  const weather = localizedText(match.Weather?.TypeLocalized);
  const attendance = parseStatValue(match.Attendance);
  const homeFormation = match.Home?.Tactics ?? null;
  const awayFormation = match.Away?.Tactics ?? null;
  const hasAny =
    [possession, shots, shotsOnTarget, corners].some((item) => item.home !== null || item.away !== null) ||
    overallHomePossession !== null ||
    overallAwayPossession !== null ||
    officials.length > 0 ||
    Boolean(weather || attendance || homeFormation || awayFormation);
  if (!hasAny) return null;
  return {
    matchId,
    homePossession: possession.home ?? overallHomePossession,
    awayPossession: possession.away ?? overallAwayPossession,
    homeShots: shots.home,
    awayShots: shots.away,
    homeShotsOnTarget: shotsOnTarget.home,
    awayShotsOnTarget: shotsOnTarget.away,
    homeCorners: corners.home,
    awayCorners: corners.away,
    attendance,
    weather,
    temperatureCelsius: parseStatValue(match.Weather?.Temperature),
    windSpeed: parseStatValue(match.Weather?.WindSpeed),
    officials,
    homeFormation,
    awayFormation,
    firstHalfStartedAt: match.FirstHalfTime ?? null,
    secondHalfStartedAt: match.SecondHalfTime ?? null,
    firstHalfExtraTimeStartedAt: match.FirstHalfExtraTime ?? null,
    secondHalfExtraTimeStartedAt: match.SecondHalfExtraTime ?? null,
    source: "FIFA public calendar API",
    updatedAt: syncedAt,
  };
}

function mapMatchOfficials(officials: FifaMatchOfficial[]) {
  return officials
    .map((official, index) => {
      const name = localizedText(official.Name) ?? "Ukjent";
      const role = localizedText(official.TypeLocalized) ?? "Dommerteam";
      return {
        id: official.OfficialId ?? `${name}-${role}-${official.IdCountry ?? "xx"}-${index}`,
        name,
        role,
        countryCode: official.IdCountry ?? null,
      };
    })
    .filter((official) => official.name !== "Ukjent" || official.role !== "Dommerteam");
}

function lineupPosition(player: FifaLineupEntry): TeamSquadPlayer["position"] {
  const label = `${localizedText(player.RealPositionLocalized) ?? ""} ${localizedText(player.PositionLocalized) ?? ""}`.toLowerCase();
  const positionCode = Number(player.RealPosition ?? player.Position);
  if (label.includes("goalkeeper") || positionCode === 0) return "goalkeeper";
  if (label.includes("defender") || label.includes("back") || positionCode === 1) return "defender";
  if (label.includes("midfielder") || positionCode === 2) return "midfielder";
  if (label.includes("forward") || label.includes("striker") || label.includes("attacker") || positionCode === 3) return "forward";
  return "unknown";
}

function lineupPlayerName(player: FifaLineupEntry) {
  return localizedMaybe(player.PlayerName) ?? localizedMaybe(player.Name) ?? localizedMaybe(player.ShortName);
}

function formationRows(formation: string | null | undefined, playerCount: number) {
  const rows = (formation?.match(/\d+/g) ?? []).map(Number).filter((value) => value > 0);
  const planned = [1, ...rows];
  if (planned.length > 1 && planned.reduce((sum, value) => sum + value, 0) >= playerCount) return planned;
  return [1, 4, 3, 3];
}

function distributeX(index: number, count: number) {
  return Math.round(((index + 1) * 100) / (count + 1));
}

function rowY(teamSide: TeamSide, rowIndex: number, rowCount: number) {
  const min = teamSide === "home" ? 88 : 12;
  const max = teamSide === "home" ? 38 : 62;
  if (rowCount <= 1) return 50;
  return Math.round(min + ((max - min) * rowIndex) / (rowCount - 1));
}

function assignCoordinates(players: LineupPlayer[], formation: string | null, teamSide: TeamSide) {
  const rows = formationRows(formation, players.length);
  let cursor = 0;
  return rows.flatMap((count, rowIndex) => {
    const rowPlayers = players.slice(cursor, cursor + count);
    cursor += count;
    return rowPlayers.map((player, index) => ({
      ...player,
      x: player.x ?? distributeX(index, rowPlayers.length),
      y: player.y ?? rowY(teamSide, rowIndex, rows.length),
    }));
  }).concat(
    players.slice(cursor).map((player, index, rest) => ({
      ...player,
      x: player.x ?? distributeX(index, rest.length),
      y: player.y ?? (teamSide === "home" ? 28 : 72),
    })),
  );
}

function mapLineupPlayer(
  player: FifaLineupEntry,
  options: { teamName: string; teamSide: TeamSide; isStarter: boolean; confirmed: boolean },
): LineupPlayer | null {
  const name = lineupPlayerName(player);
  if (!name) return null;
  const id = String(player.IdPlayer ?? player.PlayerId ?? `${name}-${player.JerseyNum ?? player.ShirtNumber ?? "uten-nummer"}`);
  const role = lineupPosition(player);
  const position = localizedText(player.RealPositionLocalized) ?? localizedText(player.PositionLocalized) ?? role;
  return {
    id,
    name,
    teamName: options.teamName,
    teamSide: options.teamSide,
    playerProfileId: playerProfileIdFor(options.teamName, id, name),
    position,
    role,
    shirtNumber: numberOrNull(player.JerseyNum ?? player.ShirtNumber),
    isStarter: options.isStarter,
    isCaptain: Boolean(player.IsCaptain ?? player.Captain),
    isConfirmed: options.confirmed,
    x: numberOrNull(player.X),
    y: numberOrNull(player.Y),
  };
}

function lineupEntries(match: FifaMatch, side: TeamSide, bench = false) {
  const team = side === "home" ? match.Home : match.Away;
  if (bench) {
    return (
      (side === "home" ? match.HomeSubstitutes : match.AwaySubstitutes) ??
      team?.Substitutes ??
      team?.Bench ??
      []
    );
  }
  return (side === "home" ? match.HomeLineup : match.AwayLineup) ?? team?.Lineup ?? team?.Players ?? [];
}

function mapFifaLineup(matchId: string, match: FifaMatch, syncedAt: string): MatchLineup | null {
  const homeFormation = match.Home?.Tactics ?? null;
  const awayFormation = match.Away?.Tactics ?? null;
  const homeTeam = teamName(match.Home) ?? "Hjemmelag";
  const awayTeam = teamName(match.Away) ?? "Bortelag";
  const homeEntries = lineupEntries(match, "home");
  const awayEntries = lineupEntries(match, "away");
  const confirmed = homeEntries.length > 0 || awayEntries.length > 0;
  const homePlayers = assignCoordinates(
    homeEntries
      .map((entry) => mapLineupPlayer(entry, { teamName: homeTeam, teamSide: "home", isStarter: true, confirmed }))
      .filter((player): player is LineupPlayer => Boolean(player)),
    homeFormation,
    "home",
  );
  const awayPlayers = assignCoordinates(
    awayEntries
      .map((entry) => mapLineupPlayer(entry, { teamName: awayTeam, teamSide: "away", isStarter: true, confirmed }))
      .filter((player): player is LineupPlayer => Boolean(player)),
    awayFormation,
    "away",
  );
  const homeBench = lineupEntries(match, "home", true)
    .map((entry) => mapLineupPlayer(entry, { teamName: homeTeam, teamSide: "home", isStarter: false, confirmed }))
    .filter((player): player is LineupPlayer => Boolean(player));
  const awayBench = lineupEntries(match, "away", true)
    .map((entry) => mapLineupPlayer(entry, { teamName: awayTeam, teamSide: "away", isStarter: false, confirmed }))
    .filter((player): player is LineupPlayer => Boolean(player));

  if (!homeFormation && !awayFormation && !homePlayers.length && !awayPlayers.length && !homeBench.length && !awayBench.length) return null;
  return {
    matchId,
    formation: { home: homeFormation, away: awayFormation },
    status: confirmed ? "confirmed" : "expected",
    confirmedAt: confirmed ? syncedAt : null,
    players: [...homePlayers, ...awayPlayers],
    homeBench,
    awayBench,
    source: "FIFA public calendar API",
    updatedAt: syncedAt,
  };
}

function eventSide(match: FifaMatch, event: FifaMatchEvent): TeamSide | null {
  const id = event.TeamId ?? event.IdTeam;
  if (!id) return null;
  if (String(id) === String(match.Home?.IdTeam)) return "home";
  if (String(id) === String(match.Away?.IdTeam)) return "away";
  const raw = String(id).toLowerCase();
  if (raw.includes("home")) return "home";
  if (raw.includes("away")) return "away";
  return null;
}

function eventType(event: FifaMatchEvent): MatchEventType {
  const raw = `${event.EventTypeName ?? ""} ${localizedText(event.EventTypeLocalized) ?? ""} ${event.EventType ?? ""} ${event.Type ?? ""}`.toLowerCase();
  if (/own.*goal/.test(raw)) return "own_goal";
  if (/penalty.*miss|miss.*penalty/.test(raw)) return "penalty_missed";
  if (/penalty/.test(raw) && /goal|scored/.test(raw)) return "penalty_goal";
  if (/goal/.test(raw)) return "goal";
  if (/second.*yellow/.test(raw)) return "second_yellow";
  if (/yellow/.test(raw)) return "yellow_card";
  if (/red/.test(raw)) return "red_card";
  if (/substitution|substitute|change/.test(raw)) return "substitution";
  if (/var/.test(raw)) return "var";
  if (/period|half|kick.?off|full.?time/.test(raw)) return "period";
  return "unknown";
}

function eventPlayerName(event: FifaMatchEvent) {
  return localizedMaybe(event.PlayerName) ?? localizedMaybe(event.Player?.PlayerName) ?? localizedMaybe(event.Player?.Name);
}

function mapFifaEvents(matchId: string, match: FifaMatch, syncedAt: string): MatchEvent[] {
  const events = match.Events ?? match.MatchEvents ?? match.Timeline ?? [];
  return events.map((event, index) => {
    const type = eventType(event);
    const teamSide = eventSide(match, event);
    const playerId = event.PlayerId ?? event.IdPlayer ?? event.Player?.PlayerId ?? event.Player?.IdPlayer;
    const playerName = eventPlayerName(event);
    const eventTeamName = teamSide === "home" ? teamName(match.Home) : teamSide === "away" ? teamName(match.Away) : null;
    const playerProfileId = playerName && eventTeamName ? playerProfileIdFor(eventTeamName, playerId ? String(playerId) : null, playerName) : null;
    const minute = numberOrNull(event.Minute ?? event.MatchTime);
    const scoreAfter =
      typeof event.HomeTeamScore === "number" && typeof event.AwayTeamScore === "number"
        ? { homeGoals: event.HomeTeamScore, awayGoals: event.AwayTeamScore }
        : null;
    const id = String(event.IdEvent ?? event.EventId ?? `${matchId}-${minute ?? "na"}-${type}-${playerId ?? playerName ?? index}`);
    return {
      id,
      matchId,
      minute,
      period: event.Period ?? null,
      type,
      teamSide,
      playerId: playerId ? String(playerId) : null,
      playerProfileId,
      playerName: playerName ?? null,
      assistPlayerName: localizedMaybe(event.AssistPlayerName),
      relatedPlayerName: localizedMaybe(event.RelatedPlayerName) ?? localizedMaybe(event.SubstitutionOffPlayerName),
      scoreAfter,
      source: "fifa" as const,
      updatedAt: syncedAt,
    };
  });
}

type FifaTeamEntry = {
  id: string;
  name: string;
  calendarTeam: FifaTeam;
};

function collectFifaTeams(matches: FifaMatch[]) {
  const byId = new Map<string, FifaTeamEntry>();
  for (const match of matches) {
    for (const calendarTeam of [match.Home, match.Away]) {
      if (!calendarTeam) continue;
      const id = calendarTeam?.IdTeam ? String(calendarTeam.IdTeam) : null;
      const name = teamName(calendarTeam);
      if (!id || !name || byId.has(id)) continue;
      byId.set(id, { id, name, calendarTeam });
    }
  }
  return [...byId.values()];
}

function squadPosition(player: FifaSquadPlayer): TeamSquadPlayer["position"] {
  const label = `${localizedText(player.RealPositionLocalized) ?? ""} ${localizedText(player.PositionLocalized) ?? ""}`.toLowerCase();
  const positionCode = player.RealPosition ?? player.Position;
  if (label.includes("goalkeeper") || positionCode === 0) return "goalkeeper";
  if (label.includes("defender") || label.includes("back") || positionCode === 1) return "defender";
  if (label.includes("midfielder") || positionCode === 2) return "midfielder";
  if (label.includes("forward") || label.includes("striker") || label.includes("attacker") || positionCode === 3) return "forward";
  return "unknown";
}

function mapSquadPlayer(player: FifaSquadPlayer): TeamSquadPlayer | null {
  const name = localizedText(player.PlayerName) ?? localizedText(player.ShortName);
  if (!name) return null;
  const id = player.IdPlayer ?? `${name}-${player.JerseyNum ?? "uten-nummer"}`;
  return {
    id,
    name,
    shortName: localizedText(player.ShortName),
    position: squadPosition(player),
    positionDetail: localizedText(player.RealPositionLocalized) ?? localizedText(player.PositionLocalized),
    shirtNumber: player.JerseyNum ?? null,
    countryCode: player.IdCountry ?? null,
    birthDate: player.BirthDate ?? null,
    heightCm: numberOrNull(player.Height),
    weightKg: numberOrNull(player.Weight),
    matchesPlayed: numberOrNull(player.MatchesPlayed),
    minutesPlayed: numberOrNull(player.MinutesPlayed),
    starts: numberOrNull(player.Starts),
    goals: numberOrNull(player.Goals),
    assists: numberOrNull(player.Assists),
    yellowCards: numberOrNull(player.YellowCards),
    redCards: numberOrNull(player.RedCards),
    pictureUrl: fifaImageUrl(player.PlayerPicture?.PictureUrl ?? player.PictureUrl ?? player.ThumbnailUrl),
    source: "FIFA public squad API",
  };
}

function mapCoach(officials: FifaSquadOfficial[] | null | undefined, syncedAt: string): CoachInfo | null {
  const coach = officials?.find((official) => official.Role === 0) ?? officials?.find((official) => localizedText(official.Name));
  const name = localizedText(coach?.Name);
  if (!coach || !name) return null;
  return {
    name,
    countryCode: coach.IdCountry ?? null,
    pictureUrl: fifaImageUrl(coach.PictureUrl),
    source: "FIFA public squad API",
    updatedAt: syncedAt,
  };
}

export function mergeFifaTeamProfile(
  existing: TeamProfile | null | undefined,
  entry: FifaTeamEntry,
  detail: FifaTeamDetail | null,
  squad: FifaSquadResponse | null,
  syncedAt: string,
): TeamProfile {
  const base = existing ?? createTeamProfile(entry.name);
  const squadPlayers = (squad?.Players ?? []).map(mapSquadPlayer).filter((player): player is TeamSquadPlayer => Boolean(player));
  const coach = mapCoach(squad?.Officials, syncedAt);
  const query = encodeURIComponent(entry.name);
  const fifaTeamId = detail?.IdTeam ?? squad?.IdTeam ?? entry.id ?? base.fifaTeamId;

  return {
    ...base,
    teamName: entry.name,
    slug: teamSlug(entry.name),
    fifaTeamId: fifaTeamId ? String(fifaTeamId) : null,
    abbreviation: detail?.Abbreviation ?? entry.calendarTeam.Abbreviation ?? base.abbreviation,
    countryCode: detail?.IdCountry ?? squad?.IdCountry ?? entry.calendarTeam.IdCountry ?? base.countryCode,
    confederation: detail?.IdConfederation ?? base.confederation,
    flagUrl: fifaImageUrl(detail?.PictureUrl ?? squad?.PictureUrl ?? entry.calendarTeam.PictureUrl ?? base.flagUrl),
    city: detail?.City ?? base.city,
    foundationYear: numberOrNull(detail?.FoundationYear) ?? base.foundationYear,
    officialSite: detail?.OfficialSite ?? base.officialSite,
    coach: coach ?? base.coach,
    squad: squadPlayers.length ? squadPlayers : base.squad,
    fifaUrl: `https://www.fifa.com/en/search?query=${query}`,
    fotmobUrl: `https://www.fotmob.com/search?q=${query}`,
    source: detail || squad ? "FIFA public team/squad API" : "FIFA public calendar API",
    updatedAt: syncedAt,
  };
}

function shouldRefreshTeamProfile(profile: TeamProfile | null | undefined, now: Date, force?: boolean) {
  if (force || !profile?.updatedAt || !profile.fifaTeamId) return true;
  const updatedAt = Date.parse(profile.updatedAt);
  if (!Number.isFinite(updatedAt)) return true;
  return now.getTime() - updatedAt >= teamProfileRefreshMs;
}

async function fetchJson<T>(fetcher: typeof fetch, url: string) {
  try {
    const response = await fetcher(url, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchTeamProfiles(
  currentProfiles: TeamProfile[],
  fifaMatches: FifaMatch[],
  options: { fetcher: typeof fetch; force?: boolean; now: Date; syncedAt: string },
) {
  const bySlug = new Map(currentProfiles.map((profile) => [profile.slug, profile]));
  let updatedTeams = 0;
  let checkedTeams = 0;
  const teams = collectFifaTeams(fifaMatches);

  for (let index = 0; index < teams.length; index += 6) {
    const chunk = teams.slice(index, index + 6);
    const updates = await Promise.all(
      chunk.map(async (entry) => {
        const slug = teamSlug(entry.name);
        const existing = bySlug.get(slug);
        if (!shouldRefreshTeamProfile(existing, options.now, options.force)) return null;
        checkedTeams += 1;
        const [detail, squad] = await Promise.all([
          fetchJson<FifaTeamDetail>(options.fetcher, fifaTeamUrl(entry.id)),
          fetchJson<FifaSquadResponse>(options.fetcher, fifaSquadUrl(entry.id)),
        ]);
        return mergeFifaTeamProfile(existing, entry, detail, squad, options.syncedAt);
      }),
    );

    for (const profile of updates) {
      if (!profile) continue;
      const existing = bySlug.get(profile.slug);
      if (JSON.stringify(existing) !== JSON.stringify(profile)) updatedTeams += 1;
      bySlug.set(profile.slug, profile);
    }
  }

  return {
    teamProfiles: [...bySlug.values()].sort((a, b) => a.teamName.localeCompare(b.teamName, "nb")),
    updatedTeams,
    checkedTeams,
  };
}

function buildTournamentStatsFromTeamProfiles(current: TournamentStats, teamProfiles: TeamProfile[], syncedAt: string): TournamentStats {
  const fallback = mergeTournamentStats(current, syncedAt);
  const playerRows = teamProfiles.flatMap((profile) =>
    profile.squad.map((player) => ({
      player,
      teamName: profile.teamName,
    })),
  );
  const topScorers = playerRows
    .filter(({ player }) => (player.goals ?? 0) > 0)
    .map(({ player, teamName }) => ({
      playerProfileId: player.playerProfileId ?? playerProfileIdFor(teamName, player.id, player.name),
      playerName: player.name,
      teamName,
      value: player.goals ?? 0,
    }))
    .sort((a, b) => b.value - a.value || a.playerName.localeCompare(b.playerName, "nb"))
    .slice(0, 20);
  const assistMakers = playerRows
    .filter(({ player }) => (player.assists ?? 0) > 0)
    .map(({ player, teamName }) => ({
      playerProfileId: player.playerProfileId ?? playerProfileIdFor(teamName, player.id, player.name),
      playerName: player.name,
      teamName,
      value: player.assists ?? 0,
    }))
    .sort((a, b) => b.value - a.value || a.playerName.localeCompare(b.playerName, "nb"))
    .slice(0, 20);
  const discipline = teamProfiles
    .map((profile) => ({
      teamName: profile.teamName,
      yellowCards: profile.squad.reduce((sum, player) => sum + (player.yellowCards ?? 0), 0),
      redCards: profile.squad.reduce((sum, player) => sum + (player.redCards ?? 0), 0),
    }))
    .filter((row) => row.yellowCards > 0 || row.redCards > 0)
    .sort((a, b) => b.redCards - a.redCards || b.yellowCards - a.yellowCards || a.teamName.localeCompare(b.teamName, "nb"));

  const hasSquadStats = playerRows.some(
    ({ player }) =>
      player.matchesPlayed != null ||
      player.goals != null ||
      player.assists != null ||
      player.yellowCards != null ||
      player.redCards != null,
  );

  return {
    ...fallback,
    topScorers: topScorers.length || hasSquadStats ? topScorers : fallback.topScorers,
    assistMakers: assistMakers.length || hasSquadStats ? assistMakers : fallback.assistMakers,
    discipline: discipline.length || hasSquadStats ? discipline : fallback.discipline,
    updatedAt: hasSquadStats ? syncedAt : fallback.updatedAt,
    source: hasSquadStats ? "FIFA public squad API" : fallback.source,
    unavailableReason: hasSquadStats && !assistMakers.length ? "FIFA har ikke levert assistdata i gratisendepunktet ennå." : fallback.unavailableReason,
  };
}

function shouldUpdateTeamName(current: string, next: string | null, stage: WorldCupMatch["stage"]) {
  if (!next || next === current) return false;
  if (stage === "group") return false;
  return isKnockoutPlaceholder(current);
}

export function applyFifaMatchesToState(
  state: AppState,
  fifaMatches: FifaMatch[],
  options: { force?: boolean; syncedAt: string },
) {
  const byId = new Map(fifaMatches.filter((match) => match.IdMatch).map((match) => [String(match.IdMatch), match]));
  const byNumber = new Map(fifaMatches.filter((match) => match.MatchNumber).map((match) => [Number(match.MatchNumber), match]));
  const statsByMatchId = new Map(state.matchStats.map((stats) => [stats.matchId, stats]));
  const lineupsByMatchId = new Map(state.lineups.map((lineup) => [lineup.matchId, lineup]));
  const eventsById = new Map(state.matchEvents.map((event) => [event.id, event]));
  let updatedMatches = 0;

  const matches = state.matches.map((match) => {
    const fifaMatch = (match.fifaMatchId ? byId.get(match.fifaMatchId) : null) ?? byNumber.get(match.matchNumber);
    if (!fifaMatch) return match;

    const status = mapStatus(fifaMatch);
    const fifaResult = mapFifaResult(fifaMatch, options.syncedAt);
    const fifaStats = mapFifaStats(match.id, fifaMatch, options.syncedAt);
    if (fifaStats) statsByMatchId.set(match.id, fifaStats);
    const fifaEvents = mapFifaEvents(match.id, fifaMatch, options.syncedAt);
    if (fifaEvents.length) {
      for (const [eventId, event] of eventsById) {
        if (event.matchId === match.id && event.source === "api_football") eventsById.delete(eventId);
      }
    }
    for (const event of fifaEvents) {
      eventsById.set(event.id, event);
    }
    const fifaLineup = mapFifaLineup(match.id, fifaMatch, options.syncedAt);
    if (fifaLineup) {
      const existingLineup = lineupsByMatchId.get(match.id);
      const preserveExistingPlayers = existingLineup?.players.length && !isApiFootballSyncSource(existingLineup.source);
      lineupsByMatchId.set(match.id, {
        ...fifaLineup,
        players: preserveExistingPlayers ? existingLineup.players : fifaLineup.players,
      });
    }
    const hasManualResult = match.result?.source === "manual" || (match.result && !match.result.source);
    const result = hasManualResult && !options.force ? match.result : fifaResult;
    const homeTeam = shouldUpdateTeamName(match.homeTeam, teamName(fifaMatch.Home), match.stage) ? teamName(fifaMatch.Home)! : match.homeTeam;
    const awayTeam = shouldUpdateTeamName(match.awayTeam, teamName(fifaMatch.Away), match.stage) ? teamName(fifaMatch.Away)! : match.awayTeam;
    const next = {
      ...match,
      fifaMatchId: match.fifaMatchId ?? fifaMatch.IdMatch ?? null,
      homeTeam,
      awayTeam,
      result,
      status,
      minute: minuteFrom(fifaMatch),
      period: fifaMatch.LastPeriodUpdate ?? null,
      lastSyncedAt: options.syncedAt,
      syncSource: "FIFA public calendar API",
      syncStatus: `MatchStatus ${fifaMatch.MatchStatus ?? "ukjent"}`,
    };

    if (
      next.result !== match.result ||
      next.status !== match.status ||
      next.minute !== match.minute ||
      next.homeTeam !== match.homeTeam ||
      next.awayTeam !== match.awayTeam
    ) {
      updatedMatches += 1;
    }
    return next;
  });

  return {
    state: {
      ...state,
      matches,
      matchStats: [...statsByMatchId.values()],
      lineups: [...lineupsByMatchId.values()],
      matchEvents: [...eventsById.values()],
      tournamentStats: mergeTournamentStats(state.tournamentStats, options.syncedAt),
    },
    updatedMatches,
  };
}

function mergeTournamentStats(current: TournamentStats, syncedAt: string): TournamentStats {
  const empty = emptyTournamentStats();
  return {
    ...empty,
    ...current,
    updatedAt: current.updatedAt ?? syncedAt,
    source: current.source ?? "FIFA public calendar API",
    unavailableReason:
      current.unavailableReason ??
      "Gratis FIFA-data har foreløpig ikke levert toppscorer, assist og kort i en stabil struktur.",
  };
}

function syncState(update: Partial<SyncState>): SyncState {
  return {
    status: "idle",
    source: "FIFA public calendar API",
    lastStartedAt: null,
    lastCompletedAt: null,
    updatedMatches: 0,
    message: null,
    ...update,
  };
}

export async function syncWorldCupData(options: SyncOptions = {}) {
  const now = options.now ?? new Date();
  const startedAt = now.toISOString();
  if (!options.ignoreWindow && !options.force && !inSyncWindow(now)) {
    return syncState({
      status: "skipped",
      lastStartedAt: startedAt,
      lastCompletedAt: startedAt,
      message: "Automatisk sync er aktiv kun rundt VM-perioden.",
    });
  }

  try {
    const response = await (options.fetcher ?? fetch)(fifaCalendarUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`FIFA svarte ${response.status}`);
    const data = (await response.json()) as FifaResponse;
    const state = await getAppState();
    const syncedAt = new Date().toISOString();
    const applied = applyFifaMatchesToState(state, data.Results ?? [], { force: options.force, syncedAt });
    const resolved = applyKnockoutResolversToState(applied.state, { force: options.force, syncedAt });
    const teamSync = await fetchTeamProfiles(resolved.state.teamProfiles, data.Results ?? [], {
      fetcher: options.fetcher ?? fetch,
      force: options.force,
      now,
      syncedAt,
    });
    const updatedMatches = applied.updatedMatches + resolved.updatedMatches;
    const tournamentStats = buildTournamentStatsFromTeamProfiles(resolved.state.tournamentStats, teamSync.teamProfiles, syncedAt);
    const withProfiles = {
      ...resolved.state,
      teamProfiles: teamSync.teamProfiles,
      tournamentStats,
    };
    const withManualData = applyManualWorldCupOverrides(withProfiles);
    const withPlayerProfiles = applyManualWorldCupOverrides({
      ...withManualData,
      playerProfiles: derivePlayerProfilesFromState(withManualData, syncedAt),
    });
    const withManualOverrides = {
      ...withPlayerProfiles,
      tournamentBonusResult: deriveTournamentBonusResult(withPlayerProfiles, syncedAt),
    };
    const apiFootballSync = await syncApiFootballForState(withManualOverrides, {
      fetcher: options.fetcher ?? fetch,
      force: options.force,
      now,
      syncedAt,
    });
    const technicalSync = await syncFifaTechnicalReportsForState(apiFootballSync.state, {
      fetcher: options.fetcher ?? fetch,
      force: options.force,
      syncedAt,
    });
    const reportPart = technicalSync.updatedReports
      ? `, ${technicalSync.updatedReports} kamprapport${technicalSync.updatedReports === 1 ? "" : "er"}`
      : "";
    const next = {
      ...technicalSync.state,
      sync: syncState({
        status: "success",
        source: "FIFA public calendar API + FIFA Training Centre + API-Football fallback",
        lastStartedAt: startedAt,
        lastCompletedAt: syncedAt,
        updatedMatches: updatedMatches + apiFootballSync.updatedMatches,
        message: `Oppdatert ${updatedMatches + apiFootballSync.updatedMatches} kamp${updatedMatches + apiFootballSync.updatedMatches === 1 ? "" : "er"}, ${teamSync.updatedTeams} lagprofil${teamSync.updatedTeams === 1 ? "" : "er"}${reportPart}${apiFootballMessagePart(apiFootballSync.requestsUsed)}.`,
      }),
    };
    // Keep the latest user-owned data: a tip/bonus/follow/avatar saved while
    // this sync ran must not be clobbered by our pre-read snapshot.
    await mutateAppState((current) => keepUserDataOnSync(next, current));
    return next.sync;
  } catch (error) {
    const completedAt = new Date().toISOString();
    const sync = syncState({
      status: "error",
      lastStartedAt: startedAt,
      lastCompletedAt: completedAt,
      message: error instanceof Error ? error.message : "Ukjent sync-feil.",
    });
    await mutateAppState((current) => ({ ...current, sync }));
    return sync;
  }
}

// User-owned fields the FIFA sync must never overwrite (it owns matches, stats,
// profiles and sync status). Applied on top of the latest committed state so a
// tip/bonus/follow/avatar saved during the sync window survives.
export function keepUserDataOnSync(synced: AppState, current: AppState): AppState {
  return {
    ...synced,
    predictions: current.predictions,
    tournamentBonusPredictions: current.tournamentBonusPredictions,
    livePotTips: current.livePotTips,
    avatarSelections: current.avatarSelections,
    followedMatches: current.followedMatches,
    matchTechnicalReports: mergeTechnicalReports(synced, current),
    apiFootball: mergeApiFootballSync(synced, current),
  };
}

function mergeTechnicalReports(synced: AppState, current: AppState) {
  const byMatchId = new Map(current.matchTechnicalReports.map((report) => [report.matchId, report]));
  for (const report of synced.matchTechnicalReports) {
    byMatchId.set(report.matchId, report);
  }
  return [...byMatchId.values()].sort((a, b) => a.matchId.localeCompare(b.matchId));
}

function apiFootballMessagePart(requestsUsed: number) {
  if (requestsUsed <= 0) return " fra offisielle FIFA-kilder";
  return ` fra offisielle FIFA-kilder, med ${requestsUsed} gratis API-Football-kall som fallback`;
}

function isApiFootballSyncSource(source: string | null | undefined) {
  return (source ?? "").toLowerCase().includes("api-football");
}

function mergeApiFootballSync(synced: AppState, current: AppState) {
  const syncedSync = normalizeApiFootballSyncState(synced.apiFootball);
  const currentSync = normalizeApiFootballSyncState(current.apiFootball);
  const byMatchId = new Map(currentSync.fixtureLinks.map((link) => [link.matchId, link]));
  for (const link of syncedSync.fixtureLinks) byMatchId.set(link.matchId, link);
  return {
    ...syncedSync,
    enabled: syncedSync.enabled || currentSync.enabled,
    leagueId: syncedSync.leagueId ?? currentSync.leagueId,
    fixtureLinks: [...byMatchId.values()].sort((a, b) => a.matchId.localeCompare(b.matchId)),
    usage: mergeApiFootballUsage(syncedSync.usage, currentSync.usage),
    lastError: syncedSync.lastError ?? currentSync.lastError,
  };
}

function mergeApiFootballUsage(synced: ReturnType<typeof normalizeApiFootballSyncState>["usage"], current: ReturnType<typeof normalizeApiFootballSyncState>["usage"]) {
  if (synced.date !== current.date) return synced.date > current.date ? synced : current;
  return {
    date: synced.date,
    requests: Math.max(synced.requests, current.requests),
    livePregameRequests: Math.max(synced.livePregameRequests, current.livePregameRequests),
    postMatchRequests: Math.max(synced.postMatchRequests, current.postMatchRequests),
    reserveRequests: Math.max(synced.reserveRequests, current.reserveRequests),
    lastRequestAt: latestIso(synced.lastRequestAt, current.lastRequestAt),
    skippedReason: synced.skippedReason ?? current.skippedReason,
  };
}

function latestIso(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

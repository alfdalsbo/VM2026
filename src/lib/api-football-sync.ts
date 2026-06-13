import { playerProfileIdFor } from "@/lib/player-profiles";
import { isPlaceholderTeam, teamSlug } from "@/lib/teams";
import type {
  ApiFootballEndpointKind,
  ApiFootballFixtureLink,
  ApiFootballRequestBucket,
  ApiFootballSyncState,
  ApiFootballUsage,
  AppState,
  LineupPlayer,
  MatchEvent,
  MatchEventType,
  MatchLineup,
  MatchResult,
  MatchStats,
  MatchStatus,
  TeamSide,
  TeamSquadPlayer,
  WorldCupMatch,
} from "@/lib/types";

export const apiFootballSourceName = "API-Football foreløpig";
export const apiFootballDocsUrl = "https://www.api-football.com/documentation-v3";

const apiFootballBaseUrl = "https://v3.football.api-sports.io";
const defaultSeason = 2026;
const dailyRequestLimit = 100;
const postMatchReserve = 20;
const discoveryReserve = 10;
const maxRequestsPerRun = 8;
const maxForcedRequestsPerRun = 10;
const fixtureIndexRefreshMs = 12 * 60 * 60 * 1000;
const oneHourMs = 60 * 60 * 1000;
const fifteenMinutesMs = 15 * 60 * 1000;
const thirtyMinutesMs = 30 * 60 * 1000;

type Fetcher = typeof fetch;

type ApiFootballEnvelope<T> = {
  errors?: unknown;
  response?: T;
};

type ApiFootballLeagueResponse = Array<{
  league?: {
    id?: number | null;
    name?: string | null;
  };
  seasons?: Array<{ year?: number | null }>;
}>;

type ApiFootballFixture = {
  fixture?: {
    id?: number | null;
    date?: string | null;
    status?: {
      short?: string | null;
      long?: string | null;
      elapsed?: number | null;
    } | null;
  } | null;
  league?: {
    id?: number | null;
    season?: number | null;
  } | null;
  teams?: {
    home?: { id?: number | null; name?: string | null } | null;
    away?: { id?: number | null; name?: string | null } | null;
  } | null;
  goals?: { home?: number | null; away?: number | null } | null;
  score?: {
    fulltime?: { home?: number | null; away?: number | null } | null;
    penalty?: { home?: number | null; away?: number | null } | null;
  } | null;
};

type ApiFootballFixtureResponse = ApiFootballFixture[];

type ApiFootballEvent = {
  time?: { elapsed?: number | null; extra?: number | null } | null;
  team?: { id?: number | null; name?: string | null } | null;
  player?: { id?: number | null; name?: string | null } | null;
  assist?: { id?: number | null; name?: string | null } | null;
  type?: string | null;
  detail?: string | null;
  comments?: string | null;
};

type ApiFootballLineupPlayer = {
  player?: {
    id?: number | null;
    name?: string | null;
    number?: number | null;
    pos?: string | null;
    grid?: string | null;
  } | null;
};

type ApiFootballLineup = {
  team?: { id?: number | null; name?: string | null } | null;
  formation?: string | null;
  startXI?: ApiFootballLineupPlayer[];
  substitutes?: ApiFootballLineupPlayer[];
};

type ApiFootballStatistics = Array<{
  team?: { id?: number | null; name?: string | null } | null;
  statistics?: Array<{ type?: string | null; value?: number | string | null }> | null;
}>;

export type ApiFootballPlannedRequest = {
  matchId: string;
  fixtureId: number;
  kind: ApiFootballEndpointKind;
  bucket: ApiFootballRequestBucket;
  priority: number;
  reason: string;
};

type ApiFootballPayloads = {
  fixtures: Map<number, ApiFootballFixture>;
  events: Map<number, ApiFootballEvent[]>;
  lineups: Map<number, ApiFootballLineup[]>;
  statistics: Map<number, ApiFootballStatistics>;
  fetchedKinds: Array<{ fixtureId: number; kind: ApiFootballEndpointKind }>;
};

type SyncApiFootballOptions = {
  now?: Date;
  syncedAt?: string;
  force?: boolean;
  fetcher?: Fetcher;
  key?: string | null;
};

export type ApiFootballSyncResult = {
  state: AppState;
  updatedMatches: number;
  requestsUsed: number;
  linkedFixtures: number;
  skippedReason: string | null;
};

export function emptyApiFootballUsage(date = todayKey(new Date())): ApiFootballUsage {
  return {
    date,
    requests: 0,
    livePregameRequests: 0,
    postMatchRequests: 0,
    reserveRequests: 0,
    lastRequestAt: null,
    skippedReason: null,
  };
}

export function emptyApiFootballSyncState(): ApiFootballSyncState {
  return {
    enabled: false,
    leagueId: null,
    season: configuredSeason(),
    lastDiscoveryAt: null,
    lastSyncedAt: null,
    lastError: null,
    fixtureLinks: [],
    usage: emptyApiFootballUsage(),
  };
}

export function normalizeApiFootballSyncState(raw: Partial<ApiFootballSyncState> | null | undefined): ApiFootballSyncState {
  const empty = emptyApiFootballSyncState();
  const usage = raw?.usage ?? empty.usage;
  return {
    enabled: Boolean(raw?.enabled),
    leagueId: typeof raw?.leagueId === "number" && Number.isFinite(raw.leagueId) ? raw.leagueId : null,
    season: typeof raw?.season === "number" && Number.isFinite(raw.season) ? raw.season : configuredSeason(),
    lastDiscoveryAt: raw?.lastDiscoveryAt ?? null,
    lastSyncedAt: raw?.lastSyncedAt ?? null,
    lastError: raw?.lastError ?? null,
    fixtureLinks: (raw?.fixtureLinks ?? [])
      .map((link) => ({
        matchId: String(link.matchId ?? ""),
        fixtureId: Number(link.fixtureId),
        leagueId: Number(link.leagueId),
        season: Number(link.season),
        homeTeam: String(link.homeTeam ?? ""),
        awayTeam: String(link.awayTeam ?? ""),
        kickoffAt: link.kickoffAt ?? null,
        matchedAt: link.matchedAt ?? new Date(0).toISOString(),
        updatedAt: link.updatedAt ?? new Date(0).toISOString(),
        lastFetchedAt: link.lastFetchedAt ?? {},
      }))
      .filter((link) => link.matchId && Number.isFinite(link.fixtureId) && Number.isFinite(link.leagueId)),
    usage: {
      date: usage.date ?? empty.usage.date,
      requests: Number.isFinite(usage.requests) ? usage.requests : 0,
      livePregameRequests: Number.isFinite(usage.livePregameRequests) ? usage.livePregameRequests : 0,
      postMatchRequests: Number.isFinite(usage.postMatchRequests) ? usage.postMatchRequests : 0,
      reserveRequests: Number.isFinite(usage.reserveRequests) ? usage.reserveRequests : 0,
      lastRequestAt: usage.lastRequestAt ?? null,
      skippedReason: usage.skippedReason ?? null,
    },
  };
}

export function planApiFootballRequests(state: AppState, now = new Date(), force = false): ApiFootballPlannedRequest[] {
  const sync = normalizeApiFootballSyncState(state.apiFootball);
  const byMatchId = new Map(state.matches.map((match) => [match.id, match]));
  const statsByMatchId = new Map(state.matchStats.map((stats) => [stats.matchId, stats]));
  const lineupsByMatchId = new Map(state.lineups.map((lineup) => [lineup.matchId, lineup]));
  const requests: ApiFootballPlannedRequest[] = [];

  for (const link of sync.fixtureLinks) {
    const match = byMatchId.get(link.matchId);
    if (!match) continue;
    const kickoff = Date.parse(match.kickoffAt);
    if (!Number.isFinite(kickoff)) continue;
    const untilKickoff = kickoff - now.getTime();
    const sinceKickoff = now.getTime() - kickoff;
    const isLiveWindow =
      match.status === "live" ||
      match.status === "halftime" ||
      (sinceKickoff >= 0 && sinceKickoff <= 2 * oneHourMs && match.status !== "finished");
    const isEarlyPregame = untilKickoff <= 6 * oneHourMs && untilKickoff > 90 * 60 * 1000;
    const isLatePregame = untilKickoff <= 90 * 60 * 1000 && untilKickoff > 0;
    const isFreshPostMatch = match.status === "finished" && sinceKickoff > 2 * oneHourMs && sinceKickoff <= 24 * oneHourMs;
    const hasApiStats = isApiFootballSource(statsByMatchId.get(match.id)?.source);
    const lineup = lineupsByMatchId.get(match.id);
    const hasLineup = Boolean(lineup?.players.length || lineup?.formation.home || lineup?.formation.away);
    const add = (
      kind: ApiFootballEndpointKind,
      bucket: ApiFootballRequestBucket,
      priority: number,
      intervalMs: number,
      reason: string,
    ) => {
      if (!force && !isDue(link.lastFetchedAt[kind], now, intervalMs)) return;
      requests.push({ matchId: match.id, fixtureId: link.fixtureId, kind, bucket, priority, reason });
    };

    if (force) {
      add("fixture", "live_pregame", 5, 0, "manuell full oppdatering");
      add("lineups", "live_pregame", 15, 0, "manuell full oppdatering");
      add("events", "post_match", 25, 0, "manuell full oppdatering");
      add("statistics", "post_match", 30, 0, "manuell full oppdatering");
      continue;
    }

    if (isEarlyPregame) {
      add("fixture", "live_pregame", 30, oneHourMs, "førkamp innen seks timer");
    }
    if (isLatePregame) {
      add("fixture", "live_pregame", 10, fifteenMinutesMs, "lagoppstilling/status før kamp");
      add("lineups", "live_pregame", 12, fifteenMinutesMs, "lagoppstilling/status før kamp");
    }
    if (isLiveWindow) {
      add("fixture", "live_pregame", 1, fifteenMinutesMs, "live status/resultat");
      add("events", "live_pregame", 2, fifteenMinutesMs, "live hendelser");
      add("statistics", "live_pregame", 6, thirtyMinutesMs, "live statistikk");
      if (!hasLineup) add("lineups", "live_pregame", 4, thirtyMinutesMs, "manglende lagoppstilling");
    }
    if (isFreshPostMatch) {
      add("fixture", "post_match", 40, oneHourMs, "etterkamp fasitkontroll");
      add("events", "post_match", 45, oneHourMs, "etterkamp hendelser");
      if (!hasApiStats || match.syncSource !== "FIFA public calendar API") {
        add("statistics", "post_match", 42, oneHourMs, "etterkamp sluttstatistikk");
      }
    }
  }

  return requests.sort((a, b) => a.priority - b.priority || a.matchId.localeCompare(b.matchId) || a.kind.localeCompare(b.kind));
}

export function budgetApiFootballRequests(
  requests: ApiFootballPlannedRequest[],
  usage: ApiFootballUsage,
  maxPerRun = maxRequestsPerRun,
): ApiFootballPlannedRequest[] {
  let cursor = { ...usage };
  const selected: ApiFootballPlannedRequest[] = [];
  for (const request of requests) {
    if (selected.length >= maxPerRun) break;
    if (!canSpend(cursor, request.bucket)) continue;
    selected.push(request);
    cursor = spend(cursor, request.bucket, new Date());
  }
  return selected;
}

export async function syncApiFootballForState(state: AppState, options: SyncApiFootballOptions = {}): Promise<ApiFootballSyncResult> {
  const now = options.now ?? new Date();
  const syncedAt = options.syncedAt ?? now.toISOString();
  const key = options.key ?? configuredKey();
  const fetcher = options.fetcher ?? fetch;
  const sync = normalizeApiFootballSyncState(state.apiFootball);
  const usage: ApiFootballUsage = { ...usageForToday(sync.usage, now), skippedReason: null };
  const requestsBefore = usage.requests;
  let nextState: AppState = {
    ...state,
    apiFootball: {
      ...sync,
      enabled: Boolean(key),
      season: configuredSeason(sync.season),
      usage,
    },
  };

  if (!key) {
    return {
      state: setApiFootballSkipped(nextState, "API_FOOTBALL_KEY mangler. FIFA brukes alene."),
      updatedMatches: 0,
      requestsUsed: 0,
      linkedFixtures: nextState.apiFootball.fixtureLinks.length,
      skippedReason: "API_FOOTBALL_KEY mangler. FIFA brukes alene.",
    };
  }

  let localUsage = usage;
  let lastError: string | null = null;
  const getJson = async <T>(path: string, params: Record<string, string | number | null | undefined>, bucket: ApiFootballRequestBucket) => {
    if (!canSpend(localUsage, bucket)) {
      localUsage = { ...localUsage, skippedReason: "API-Football gratisgrense nådd for i dag." };
      return null;
    }
    const url = new URL(path, apiFootballBaseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
    }
    localUsage = spend(localUsage, bucket, now);
    try {
      const response = await fetcher(url, {
        cache: "no-store",
        headers: { "x-apisports-key": key },
      });
      const envelope = await readApiFootballEnvelope<T>(response);
      if (hasApiErrors(envelope.errors)) {
        lastError = `API-Football meldte feil for ${path}: ${describeApiFootballErrors(envelope.errors)}`;
        return null;
      }
      if (!response.ok) {
        lastError = `API-Football svarte ${response.status} for ${path}`;
        return null;
      }
      return envelope.response ?? null;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Ukjent API-Football-feil.";
      return null;
    }
  };

  const discovered = await ensureApiFootballLeague(nextState, {
    now,
    syncedAt,
    force: options.force,
    getJson,
  });
  nextState = discovered.state;
  if (!nextState.apiFootball.leagueId) {
    nextState = {
      ...nextState,
      apiFootball: {
        ...nextState.apiFootball,
        usage: localUsage,
        lastError: lastError ?? "Fant ikke API-Football-liga for World Cup 2026.",
      },
    };
    return {
      state: nextState,
      updatedMatches: 0,
      requestsUsed: localUsage.requests - requestsBefore,
      linkedFixtures: 0,
      skippedReason: nextState.apiFootball.lastError,
    };
  }

  const linked = await ensureApiFootballFixtureLinks(nextState, {
    now,
    syncedAt,
    force: options.force,
    getJson,
  });
  nextState = linked.state;

  const plan = planApiFootballRequests(nextState, now, Boolean(options.force));
  const maxRun = options.force ? maxForcedRequestsPerRun : maxRequestsPerRun;
  const selected = budgetApiFootballRequests(plan, localUsage, Math.max(0, maxRun - (localUsage.requests - requestsBefore)));
  const payloads: ApiFootballPayloads = {
    fixtures: new Map(),
    events: new Map(),
    lineups: new Map(),
    statistics: new Map(),
    fetchedKinds: [],
  };

  for (const request of selected) {
    if (request.kind === "fixture") {
      const response = await getJson<ApiFootballFixtureResponse>("/fixtures", { id: request.fixtureId }, request.bucket);
      const fixture = response?.[0];
      if (fixture) payloads.fixtures.set(request.fixtureId, fixture);
    } else if (request.kind === "events") {
      const response = await getJson<ApiFootballEvent[]>("/fixtures/events", { fixture: request.fixtureId }, request.bucket);
      if (response) payloads.events.set(request.fixtureId, response);
    } else if (request.kind === "lineups") {
      const response = await getJson<ApiFootballLineup[]>("/fixtures/lineups", { fixture: request.fixtureId }, request.bucket);
      if (response) payloads.lineups.set(request.fixtureId, response);
    } else if (request.kind === "statistics") {
      const response = await getJson<ApiFootballStatistics>("/fixtures/statistics", { fixture: request.fixtureId }, request.bucket);
      if (response) payloads.statistics.set(request.fixtureId, response);
    }
    payloads.fetchedKinds.push({ fixtureId: request.fixtureId, kind: request.kind });
  }

  const applied = applyApiFootballPayloadsToState(
    {
      ...nextState,
      apiFootball: {
        ...nextState.apiFootball,
        usage: localUsage,
        lastError,
      },
    },
    payloads,
    { syncedAt },
  );

  return {
    state: {
      ...applied.state,
      apiFootball: {
        ...applied.state.apiFootball,
        enabled: true,
        lastSyncedAt: syncedAt,
        usage: {
          ...localUsage,
          skippedReason: selected.length < plan.length ? localUsage.skippedReason ?? "Noen API-Football-kall ble utsatt for å spare gratisquota." : null,
        },
        lastError,
      },
    },
    updatedMatches: applied.updatedMatches,
    requestsUsed: localUsage.requests - requestsBefore,
    linkedFixtures: applied.state.apiFootball.fixtureLinks.length,
    skippedReason: selected.length < plan.length ? localUsage.skippedReason ?? "Noen API-Football-kall ble utsatt for å spare gratisquota." : null,
  };
}

export function applyApiFootballPayloadsToState(
  state: AppState,
  payloads: ApiFootballPayloads,
  options: { syncedAt: string },
): { state: AppState; updatedMatches: number } {
  const sync = normalizeApiFootballSyncState(state.apiFootball);
  const linkByFixtureId = new Map(sync.fixtureLinks.map((link) => [link.fixtureId, link]));
  const fixtureByMatchId = new Map<number, ApiFootballFixture>();
  for (const [fixtureId, fixture] of payloads.fixtures) fixtureByMatchId.set(fixtureId, fixture);

  const statsByMatchId = new Map(state.matchStats.map((stats) => [stats.matchId, stats]));
  const lineupsByMatchId = new Map(state.lineups.map((lineup) => [lineup.matchId, lineup]));
  const eventsById = new Map(state.matchEvents.map((event) => [event.id, event]));
  const fixtureTeams = new Map<number, { home: string; away: string }>();
  let updatedMatches = 0;

  for (const link of sync.fixtureLinks) {
    fixtureTeams.set(link.fixtureId, { home: link.homeTeam, away: link.awayTeam });
  }

  const matches = state.matches.map((match) => {
    const link = sync.fixtureLinks.find((item) => item.matchId === match.id);
    const fixture = link ? payloads.fixtures.get(link.fixtureId) : undefined;
    if (!link || !fixture) return match;
    const next = mergeApiFootballFixtureIntoMatch(match, fixture, options.syncedAt);
    fixtureTeams.set(link.fixtureId, {
      home: fixture.teams?.home?.name ?? link.homeTeam,
      away: fixture.teams?.away?.name ?? link.awayTeam,
    });
    if (
      next.result !== match.result ||
      next.status !== match.status ||
      next.minute !== match.minute ||
      next.syncSource !== match.syncSource
    ) {
      updatedMatches += 1;
    }
    return next;
  });

  for (const [fixtureId, stats] of payloads.statistics) {
    const link = linkByFixtureId.get(fixtureId);
    if (!link) continue;
    const teams = fixtureTeams.get(fixtureId) ?? { home: link.homeTeam, away: link.awayTeam };
    const mapped = mapApiFootballStats(link.matchId, stats, teams, options.syncedAt);
    if (!mapped) continue;
    statsByMatchId.set(link.matchId, mergeMatchStats(statsByMatchId.get(link.matchId) ?? null, mapped));
  }

  for (const [fixtureId, lineups] of payloads.lineups) {
    const link = linkByFixtureId.get(fixtureId);
    if (!link) continue;
    const teams = fixtureTeams.get(fixtureId) ?? { home: link.homeTeam, away: link.awayTeam };
    const mapped = mapApiFootballLineups(link.matchId, lineups, teams, options.syncedAt);
    if (!mapped) continue;
    lineupsByMatchId.set(link.matchId, mergeLineup(lineupsByMatchId.get(link.matchId) ?? null, mapped));
  }

  for (const [fixtureId, events] of payloads.events) {
    const link = linkByFixtureId.get(fixtureId);
    if (!link) continue;
    const teams = fixtureTeams.get(fixtureId) ?? { home: link.homeTeam, away: link.awayTeam };
    const hasAuthoritativeEvents = [...eventsById.values()].some(
      (event) => event.matchId === link.matchId && event.source !== "api_football",
    );
    if (hasAuthoritativeEvents) continue;
    for (const [id, event] of eventsById) {
      if (event.matchId === link.matchId && event.source === "api_football") eventsById.delete(id);
    }
    for (const event of mapApiFootballEvents(link.matchId, fixtureId, events, teams, options.syncedAt)) {
      eventsById.set(event.id, event);
    }
  }

  const fetchedByFixture = new Map<number, Set<ApiFootballEndpointKind>>();
  for (const fetched of payloads.fetchedKinds) {
    const current = fetchedByFixture.get(fetched.fixtureId) ?? new Set<ApiFootballEndpointKind>();
    current.add(fetched.kind);
    fetchedByFixture.set(fetched.fixtureId, current);
  }
  const fixtureLinks = sync.fixtureLinks.map((link) => {
    const fetchedKinds = fetchedByFixture.get(link.fixtureId);
    if (!fetchedKinds?.size) return link;
    const lastFetchedAt = { ...link.lastFetchedAt };
    for (const kind of fetchedKinds) lastFetchedAt[kind] = options.syncedAt;
    return { ...link, lastFetchedAt, updatedAt: options.syncedAt };
  });

  return {
    state: {
      ...state,
      matches,
      matchStats: [...statsByMatchId.values()],
      lineups: [...lineupsByMatchId.values()],
      matchEvents: [...eventsById.values()],
      apiFootball: {
        ...sync,
        fixtureLinks,
        lastSyncedAt: options.syncedAt,
      },
    },
    updatedMatches,
  };
}

async function ensureApiFootballLeague(
  state: AppState,
  options: {
    now: Date;
    syncedAt: string;
    force?: boolean;
    getJson: <T>(path: string, params: Record<string, string | number | null | undefined>, bucket: ApiFootballRequestBucket) => Promise<T | null>;
  },
) {
  const sync = normalizeApiFootballSyncState(state.apiFootball);
  const envLeagueId = configuredLeagueId();
  const season = configuredSeason(sync.season);
  if (envLeagueId) {
    return {
      state: {
        ...state,
        apiFootball: {
          ...sync,
          enabled: true,
          leagueId: envLeagueId,
          season,
          lastDiscoveryAt: sync.lastDiscoveryAt ?? options.syncedAt,
        },
      },
    };
  }
  if (sync.leagueId && !options.force && !isDue(sync.lastDiscoveryAt, options.now, fixtureIndexRefreshMs)) {
    return { state: { ...state, apiFootball: { ...sync, enabled: true, season } } };
  }

  const leagues = await options.getJson<ApiFootballLeagueResponse>("/leagues", { search: "World Cup" }, "reserve");
  const league = leagues?.find((item) => {
    const name = item.league?.name ?? "";
    const hasSeason = (item.seasons ?? []).some((entry) => entry.year === season);
    return /world cup/i.test(name) && hasSeason;
  });
  const leagueId = league?.league?.id ?? sync.leagueId ?? null;
  return {
    state: {
      ...state,
      apiFootball: {
        ...sync,
        enabled: true,
        leagueId,
        season,
        lastDiscoveryAt: leagueId ? options.syncedAt : sync.lastDiscoveryAt,
      },
    },
  };
}

async function ensureApiFootballFixtureLinks(
  state: AppState,
  options: {
    now: Date;
    syncedAt: string;
    force?: boolean;
    getJson: <T>(path: string, params: Record<string, string | number | null | undefined>, bucket: ApiFootballRequestBucket) => Promise<T | null>;
  },
) {
  const sync = normalizeApiFootballSyncState(state.apiFootball);
  if (!sync.leagueId) return { state };
  const newestLink = sync.fixtureLinks.reduce((newest, link) => Math.max(newest, Date.parse(link.updatedAt) || 0), 0);
  const shouldRefresh = options.force || sync.fixtureLinks.length === 0 || options.now.getTime() - newestLink >= fixtureIndexRefreshMs;
  if (!shouldRefresh) return { state };

  const fixtures = await options.getJson<ApiFootballFixtureResponse>(
    "/fixtures",
    { league: sync.leagueId, season: sync.season },
    "reserve",
  );
  if (!fixtures?.length) return { state };

  const existingByMatchId = new Map(sync.fixtureLinks.map((link) => [link.matchId, link]));
  const links = new Map<string, ApiFootballFixtureLink>();
  for (const fixture of fixtures) {
    const fixtureId = fixture.fixture?.id;
    if (!fixtureId) continue;
    const link = matchFixtureToInternalMatch(state.matches, fixture, sync.leagueId, sync.season, options.syncedAt);
    if (!link) continue;
    const existing = existingByMatchId.get(link.matchId);
    links.set(link.matchId, {
      ...link,
      lastFetchedAt: existing?.fixtureId === fixtureId ? existing.lastFetchedAt : {},
      matchedAt: existing?.matchedAt ?? link.matchedAt,
    });
  }

  return {
    state: {
      ...state,
      apiFootball: {
        ...sync,
        fixtureLinks: [...links.values()].sort((a, b) => a.matchId.localeCompare(b.matchId)),
      },
    },
  };
}

function matchFixtureToInternalMatch(
  matches: WorldCupMatch[],
  fixture: ApiFootballFixture,
  leagueId: number,
  season: number,
  syncedAt: string,
): ApiFootballFixtureLink | null {
  const fixtureId = fixture.fixture?.id;
  const fixtureDate = fixture.fixture?.date ?? null;
  const home = fixture.teams?.home?.name ?? null;
  const away = fixture.teams?.away?.name ?? null;
  if (!fixtureId || !home || !away) return null;
  const fixtureKickoff = fixtureDate ? Date.parse(fixtureDate) : NaN;
  const homeKey = normalizedTeamKey(home);
  const awayKey = normalizedTeamKey(away);
  const candidates = matches
    .filter((match) => !isPlaceholderTeam(match.homeTeam) && !isPlaceholderTeam(match.awayTeam))
    .map((match) => {
      const matchHome = normalizedTeamKey(match.homeTeam);
      const matchAway = normalizedTeamKey(match.awayTeam);
      const oriented = matchHome === homeKey && matchAway === awayKey;
      const reversed = matchHome === awayKey && matchAway === homeKey;
      if (!oriented && !reversed) return null;
      const matchKickoff = Date.parse(match.kickoffAt);
      const diff = Number.isFinite(fixtureKickoff) && Number.isFinite(matchKickoff) ? Math.abs(fixtureKickoff - matchKickoff) : 0;
      if (diff > 48 * oneHourMs) return null;
      return { match, diff, oriented };
    })
    .filter((candidate): candidate is { match: WorldCupMatch; diff: number; oriented: boolean } => Boolean(candidate))
    .sort((a, b) => Number(b.oriented) - Number(a.oriented) || a.diff - b.diff);
  const best = candidates[0]?.match;
  if (!best) return null;
  return {
    matchId: best.id,
    fixtureId,
    leagueId,
    season,
    homeTeam: home,
    awayTeam: away,
    kickoffAt: fixtureDate,
    matchedAt: syncedAt,
    updatedAt: syncedAt,
    lastFetchedAt: {},
  };
}

function mergeApiFootballFixtureIntoMatch(match: WorldCupMatch, fixture: ApiFootballFixture, syncedAt: string): WorldCupMatch {
  const status = apiFootballStatusToMatchStatus(fixture.fixture?.status?.short ?? null, fixture.goals);
  const result = mapApiFootballResult(fixture, syncedAt);
  const hasAuthoritativeResult = match.result && match.result.source !== "api_football";
  const nextResult = result && !hasAuthoritativeResult ? result : match.result;
  const canUpdateStatus =
    !hasAuthoritativeResult ||
    (match.status !== "finished" && status !== "scheduled" && status !== "unknown") ||
    match.result?.source === "api_football";
  return {
    ...match,
    result: nextResult,
    status: canUpdateStatus ? status : match.status,
    minute: canUpdateStatus ? fixture.fixture?.status?.elapsed ?? null : match.minute,
    period: canUpdateStatus ? fixture.fixture?.status?.long ?? fixture.fixture?.status?.short ?? null : match.period,
    lastSyncedAt: syncedAt,
    syncSource: hasAuthoritativeResult ? match.syncSource : apiFootballSourceName,
    syncStatus: hasAuthoritativeResult
      ? match.syncStatus
      : `API-Football ${fixture.fixture?.status?.short ?? fixture.fixture?.status?.long ?? "ukjent"}`,
  };
}

function mapApiFootballResult(fixture: ApiFootballFixture, syncedAt: string): MatchResult | null {
  const homeGoals = numericValue(fixture.goals?.home ?? fixture.score?.fulltime?.home);
  const awayGoals = numericValue(fixture.goals?.away ?? fixture.score?.fulltime?.away);
  if (homeGoals == null || awayGoals == null) return null;
  const short = fixture.fixture?.status?.short ?? "";
  const isFinished = ["FT", "AET", "PEN"].includes(short);
  const homePenalties = numericValue(fixture.score?.penalty?.home);
  const awayPenalties = numericValue(fixture.score?.penalty?.away);
  const decidedByPenalties = short === "PEN" && homePenalties != null && awayPenalties != null;
  return {
    homeGoals,
    awayGoals,
    decidedByPenalties,
    advancingTeam: decidedByPenalties ? (homePenalties > awayPenalties ? "home" : awayPenalties > homePenalties ? "away" : null) : null,
    updatedAt: syncedAt,
    updatedBy: "sync:api-football",
    source: isFinished ? "api_football" : "api_football",
  };
}

function apiFootballStatusToMatchStatus(status: string | null, goals?: ApiFootballFixture["goals"]): MatchStatus {
  const short = status ?? "";
  if (["NS", "TBD"].includes(short)) return "scheduled";
  if (["1H", "2H", "ET", "P", "BT", "LIVE"].includes(short)) return "live";
  if (short === "HT") return "halftime";
  if (["FT", "AET", "PEN"].includes(short)) return "finished";
  if (["PST", "SUSP", "INT"].includes(short)) return "postponed";
  if (["CANC", "ABD", "AWD", "WO"].includes(short)) return "cancelled";
  if (typeof goals?.home === "number" && typeof goals?.away === "number") return "live";
  return "unknown";
}

function mapApiFootballStats(
  matchId: string,
  rows: ApiFootballStatistics,
  teams: { home: string; away: string },
  syncedAt: string,
): MatchStats | null {
  const homeRow = findTeamRow(rows, teams.home);
  const awayRow = findTeamRow(rows, teams.away);
  if (!homeRow && !awayRow) return null;
  const home = homeRow?.statistics ?? [];
  const away = awayRow?.statistics ?? [];
  const stats: MatchStats = {
    matchId,
    homePossession: statValue(home, /ball possession/i),
    awayPossession: statValue(away, /ball possession/i),
    homeShots: statValue(home, /^total shots$/i),
    awayShots: statValue(away, /^total shots$/i),
    homeShotsOnTarget: statValue(home, /shots on goal/i),
    awayShotsOnTarget: statValue(away, /shots on goal/i),
    homeCorners: statValue(home, /corner kicks/i),
    awayCorners: statValue(away, /corner kicks/i),
    attendance: null,
    weather: null,
    temperatureCelsius: null,
    windSpeed: null,
    officials: [],
    homeFormation: null,
    awayFormation: null,
    firstHalfStartedAt: null,
    secondHalfStartedAt: null,
    firstHalfExtraTimeStartedAt: null,
    secondHalfExtraTimeStartedAt: null,
    source: apiFootballSourceName,
    updatedAt: syncedAt,
  };
  const hasAny = [
    stats.homePossession,
    stats.awayPossession,
    stats.homeShots,
    stats.awayShots,
    stats.homeShotsOnTarget,
    stats.awayShotsOnTarget,
    stats.homeCorners,
    stats.awayCorners,
  ].some((value) => value != null);
  return hasAny ? stats : null;
}

function mergeMatchStats(existing: MatchStats | null, incoming: MatchStats): MatchStats {
  if (!existing) return incoming;
  const authoritative = existing.source != null && !isApiFootballSource(existing.source);
  const mergeValue = <T>(current: T | null, next: T | null) => (authoritative ? current ?? next : next ?? current);
  return {
    ...existing,
    homePossession: mergeValue(existing.homePossession, incoming.homePossession),
    awayPossession: mergeValue(existing.awayPossession, incoming.awayPossession),
    homeShots: mergeValue(existing.homeShots, incoming.homeShots),
    awayShots: mergeValue(existing.awayShots, incoming.awayShots),
    homeShotsOnTarget: mergeValue(existing.homeShotsOnTarget, incoming.homeShotsOnTarget),
    awayShotsOnTarget: mergeValue(existing.awayShotsOnTarget, incoming.awayShotsOnTarget),
    homeCorners: mergeValue(existing.homeCorners, incoming.homeCorners),
    awayCorners: mergeValue(existing.awayCorners, incoming.awayCorners),
    source: authoritative ? `${existing.source} + API-Football fallback` : incoming.source,
    updatedAt: incoming.updatedAt,
  };
}

function mapApiFootballLineups(
  matchId: string,
  rows: ApiFootballLineup[],
  teams: { home: string; away: string },
  syncedAt: string,
): MatchLineup | null {
  const home = findLineupRow(rows, teams.home);
  const away = findLineupRow(rows, teams.away);
  if (!home && !away) return null;
  const homePlayers = mapLineupPlayers(home?.startXI ?? [], teams.home, "home", true);
  const awayPlayers = mapLineupPlayers(away?.startXI ?? [], teams.away, "away", true);
  const homeBench = mapLineupPlayers(home?.substitutes ?? [], teams.home, "home", false);
  const awayBench = mapLineupPlayers(away?.substitutes ?? [], teams.away, "away", false);
  const hasLineup = homePlayers.length || awayPlayers.length || homeBench.length || awayBench.length;
  if (!home?.formation && !away?.formation && !hasLineup) return null;
  return {
    matchId,
    formation: { home: home?.formation ?? null, away: away?.formation ?? null },
    status: hasLineup ? "confirmed" : "expected",
    confirmedAt: hasLineup ? syncedAt : null,
    players: [...homePlayers, ...awayPlayers],
    homeBench,
    awayBench,
    source: apiFootballSourceName,
    updatedAt: syncedAt,
  };
}

function mergeLineup(existing: MatchLineup | null, incoming: MatchLineup): MatchLineup {
  if (!existing) return incoming;
  const authoritative = existing.source != null && !isApiFootballSource(existing.source);
  if (!authoritative) return incoming;
  return {
    ...existing,
    formation: {
      home: existing.formation.home ?? incoming.formation.home,
      away: existing.formation.away ?? incoming.formation.away,
    },
    players: existing.players.length ? existing.players : incoming.players,
    homeBench: existing.homeBench.length ? existing.homeBench : incoming.homeBench,
    awayBench: existing.awayBench.length ? existing.awayBench : incoming.awayBench,
    source: `${existing.source} + API-Football fallback`,
    updatedAt: incoming.updatedAt,
  };
}

function mapLineupPlayers(rows: ApiFootballLineupPlayer[], teamName: string, teamSide: TeamSide, isStarter: boolean): LineupPlayer[] {
  return rows
    .map((entry, index): LineupPlayer | null => {
      const player = entry.player;
      if (!player?.name) return null;
      const id = player.id ? String(player.id) : `${teamSlug(teamName)}-${teamSlug(player.name)}-${index}`;
      const role = positionRole(player.pos);
      const coordinate = coordinateFromGrid(player.grid, teamSide);
      return {
        id,
        name: player.name,
        teamName,
        teamSide,
        playerProfileId: playerProfileIdFor(teamName, id, player.name),
        position: player.pos ?? role,
        role,
        shirtNumber: player.number ?? null,
        isStarter,
        isCaptain: false,
        isConfirmed: true,
        x: coordinate.x,
        y: coordinate.y,
      };
    })
    .filter((player): player is LineupPlayer => Boolean(player));
}

function positionRole(position: string | null | undefined): TeamSquadPlayer["position"] {
  const raw = (position ?? "").toUpperCase();
  if (raw === "G") return "goalkeeper";
  if (raw === "D") return "defender";
  if (raw === "M") return "midfielder";
  if (raw === "F") return "forward";
  return "unknown";
}

function coordinateFromGrid(grid: string | null | undefined, teamSide: TeamSide) {
  const [row, column] = (grid ?? "")
    .split(":")
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (!row || !column) return { x: null, y: null };
  const rowStep = 16;
  const x = teamSide === "home" ? 8 + row * rowStep : 92 - row * rowStep;
  const y = 8 + column * 8;
  return { x: clamp(Math.round(x), 5, 95), y: clamp(Math.round(y), 5, 50) };
}

function mapApiFootballEvents(
  matchId: string,
  fixtureId: number,
  rows: ApiFootballEvent[],
  teams: { home: string; away: string },
  syncedAt: string,
): MatchEvent[] {
  const sorted = [...rows].sort((a, b) => (a.time?.elapsed ?? 0) - (b.time?.elapsed ?? 0));
  let homeGoals = 0;
  let awayGoals = 0;
  return sorted
    .map((event, index) => {
      const type = apiEventType(event);
      const teamSide = event.team?.name ? sideForTeamName(event.team.name, teams) : null;
      const scoringSide = type === "own_goal" ? oppositeSide(teamSide) : teamSide;
      if (type === "goal" || type === "penalty_goal" || type === "own_goal") {
        if (scoringSide === "home") homeGoals += 1;
        if (scoringSide === "away") awayGoals += 1;
      }
      const playerId = event.player?.id ? String(event.player.id) : null;
      const playerName = event.player?.name ?? null;
      const playerTeam = teamSide === "home" ? teams.home : teamSide === "away" ? teams.away : null;
      return {
        id: `api-football-${fixtureId}-${event.time?.elapsed ?? "na"}-${type}-${event.team?.id ?? "team"}-${playerId ?? playerName ?? index}`,
        matchId,
        minute: event.time?.elapsed ?? null,
        period: event.time?.extra ? `+${event.time.extra}` : null,
        type,
        teamSide,
        playerId,
        playerProfileId: playerName && playerTeam ? playerProfileIdFor(playerTeam, playerId, playerName) : null,
        playerName,
        assistPlayerName: event.assist?.name ?? null,
        relatedPlayerName: event.comments ?? null,
        scoreAfter:
          type === "goal" || type === "penalty_goal" || type === "own_goal"
            ? { homeGoals, awayGoals }
            : null,
        source: "api_football" as const,
        updatedAt: syncedAt,
      };
    })
    .filter((event) => event.type !== "unknown" || event.playerName);
}

function apiEventType(event: ApiFootballEvent): MatchEventType {
  const raw = `${event.type ?? ""} ${event.detail ?? ""} ${event.comments ?? ""}`.toLowerCase();
  if (/own goal/.test(raw)) return "own_goal";
  if (/missed penalty/.test(raw)) return "penalty_missed";
  if (/penalty/.test(raw) && /goal/.test(raw)) return "penalty_goal";
  if (/goal/.test(raw)) return "goal";
  if (/second yellow/.test(raw)) return "second_yellow";
  if (/red card/.test(raw)) return "red_card";
  if (/yellow card/.test(raw)) return "yellow_card";
  if (/subst/.test(raw)) return "substitution";
  if (/var/.test(raw)) return "var";
  return "unknown";
}

function findTeamRow(rows: ApiFootballStatistics, teamName: string) {
  const key = normalizedTeamKey(teamName);
  return rows.find((row) => normalizedTeamKey(row.team?.name ?? "") === key) ?? null;
}

function findLineupRow(rows: ApiFootballLineup[], teamName: string) {
  const key = normalizedTeamKey(teamName);
  return rows.find((row) => normalizedTeamKey(row.team?.name ?? "") === key) ?? null;
}

function statValue(stats: NonNullable<ApiFootballStatistics[number]["statistics"]>, pattern: RegExp) {
  const row = stats.find((item) => pattern.test(item.type ?? ""));
  return numericValue(row?.value);
}

function numericValue(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace("%", "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function sideForTeamName(teamName: string, teams: { home: string; away: string }): TeamSide | null {
  const key = normalizedTeamKey(teamName);
  if (key === normalizedTeamKey(teams.home)) return "home";
  if (key === normalizedTeamKey(teams.away)) return "away";
  return null;
}

function oppositeSide(side: TeamSide | null): TeamSide | null {
  if (side === "home") return "away";
  if (side === "away") return "home";
  return null;
}

function normalizedTeamKey(name: string) {
  const slug = teamSlug(name);
  const aliases: Record<string, string> = {
    usa: "united-states",
    "u-s-a": "united-states",
    "united-states-of-america": "united-states",
    "korea-republic": "south-korea",
    "republic-of-korea": "south-korea",
    "south-korea": "south-korea",
    "czech-republic": "czechia",
    czechia: "czechia",
    "bosnia-herzegovina": "bosnia-and-herzegovina",
    "bosnia-and-herzegovina": "bosnia-and-herzegovina",
    "cote-d-ivoire": "ivory-coast",
    "ivory-coast": "ivory-coast",
    "ir-iran": "iran",
    iran: "iran",
  };
  return aliases[slug] ?? slug;
}

function isDue(lastFetchedAt: string | null | undefined, now: Date, intervalMs: number) {
  if (!lastFetchedAt) return true;
  if (intervalMs <= 0) return true;
  const parsed = Date.parse(lastFetchedAt);
  if (!Number.isFinite(parsed)) return true;
  return now.getTime() - parsed >= intervalMs;
}

function usageForToday(usage: ApiFootballUsage, now: Date) {
  const date = todayKey(now);
  return usage.date === date ? usage : emptyApiFootballUsage(date);
}

function canSpend(usage: ApiFootballUsage, bucket: ApiFootballRequestBucket) {
  if (usage.requests >= dailyRequestLimit) return false;
  if (bucket === "reserve" && usage.reserveRequests >= discoveryReserve) return false;
  if (bucket === "post_match" && usage.postMatchRequests >= postMatchReserve) return false;
  return true;
}

function spend(usage: ApiFootballUsage, bucket: ApiFootballRequestBucket, now: Date): ApiFootballUsage {
  return {
    ...usage,
    requests: usage.requests + 1,
    livePregameRequests: usage.livePregameRequests + (bucket === "live_pregame" ? 1 : 0),
    postMatchRequests: usage.postMatchRequests + (bucket === "post_match" ? 1 : 0),
    reserveRequests: usage.reserveRequests + (bucket === "reserve" ? 1 : 0),
    lastRequestAt: now.toISOString(),
  };
}

function todayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function configuredKey() {
  return process.env.API_FOOTBALL_KEY || process.env.API_SPORTS_KEY || null;
}

function configuredLeagueId() {
  const value = Number(process.env.API_FOOTBALL_LEAGUE_ID);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function configuredSeason(fallback = defaultSeason) {
  const value = Number(process.env.API_FOOTBALL_SEASON);
  return Number.isFinite(value) && value > 0 ? value : fallback || defaultSeason;
}

function hasApiErrors(errors: unknown) {
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  if (typeof errors === "object") return Object.keys(errors).length > 0;
  return Boolean(errors);
}

async function readApiFootballEnvelope<T>(response: Response): Promise<ApiFootballEnvelope<T>> {
  try {
    return (await response.json()) as ApiFootballEnvelope<T>;
  } catch {
    return {};
  }
}

function describeApiFootballErrors(errors: unknown) {
  if (!errors) return "ukjent feil";
  if (typeof errors === "string") return errors;
  if (Array.isArray(errors)) return errors.map(String).filter(Boolean).join("; ") || "ukjent feil";
  if (typeof errors === "object") {
    const entries = Object.entries(errors as Record<string, unknown>)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .filter(Boolean);
    return entries.join("; ") || "ukjent feil";
  }
  return String(errors);
}

function setApiFootballSkipped(state: AppState, reason: string): AppState {
  return {
    ...state,
    apiFootball: {
      ...normalizeApiFootballSyncState(state.apiFootball),
      enabled: false,
      usage: {
        ...usageForToday(normalizeApiFootballSyncState(state.apiFootball).usage, new Date()),
        skippedReason: reason,
      },
      lastError: null,
    },
  };
}

function isApiFootballSource(source: string | null | undefined) {
  return (source ?? "").toLowerCase().includes("api-football");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

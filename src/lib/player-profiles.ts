import { teamSlug } from "@/lib/teams";
import type { AppState, MatchEvent, PlayerProfile, TeamProfile, TeamSquadPlayer } from "@/lib/types";

export function playerProfileIdFor(teamName: string, sourceId: string | null | undefined, name: string) {
  if (sourceId && /^\d+$/.test(sourceId)) return `fifa-${sourceId}`;
  return `player-${teamSlug(teamName)}-${teamSlug(name)}`;
}

function mergeValue<T>(next: T | null | undefined, current: T | null | undefined): T | null {
  return next ?? current ?? null;
}

export function mergePlayerProfiles(...groups: PlayerProfile[][]) {
  const byId = new Map<string, PlayerProfile>();

  for (const group of groups) {
    for (const profile of group) {
      const current = byId.get(profile.id);
      byId.set(
        profile.id,
        current
          ? {
              ...current,
              ...profile,
              fifaPlayerId: mergeValue(profile.fifaPlayerId, current.fifaPlayerId),
              shortName: mergeValue(profile.shortName, current.shortName),
              positionDetail: mergeValue(profile.positionDetail, current.positionDetail),
              pictureUrl: mergeValue(profile.pictureUrl, current.pictureUrl),
              birthDate: mergeValue(profile.birthDate, current.birthDate),
              heightCm: mergeValue(profile.heightCm, current.heightCm),
              weightKg: mergeValue(profile.weightKg, current.weightKg),
              matchesPlayed: mergeValue(profile.matchesPlayed, current.matchesPlayed),
              minutesPlayed: mergeValue(profile.minutesPlayed, current.minutesPlayed),
              starts: mergeValue(profile.starts, current.starts),
              goals: mergeValue(profile.goals, current.goals),
              assists: mergeValue(profile.assists, current.assists),
              yellowCards: mergeValue(profile.yellowCards, current.yellowCards),
              redCards: mergeValue(profile.redCards, current.redCards),
              source: mergeValue(profile.source, current.source),
              updatedAt: mergeValue(profile.updatedAt, current.updatedAt),
            }
          : profile,
      );
    }
  }

  return [...byId.values()].sort((a, b) => a.teamName.localeCompare(b.teamName, "nb") || a.name.localeCompare(b.name, "nb"));
}

export function profileFromSquadPlayer(team: TeamProfile, player: TeamSquadPlayer, updatedAt: string | null): PlayerProfile {
  const id = player.playerProfileId ?? playerProfileIdFor(team.teamName, player.id, player.name);
  return {
    id,
    fifaPlayerId: /^\d+$/.test(player.id) ? player.id : null,
    name: player.name,
    shortName: player.shortName ?? null,
    teamName: team.teamName,
    teamSlug: team.slug,
    position: player.position,
    positionDetail: player.positionDetail ?? null,
    shirtNumber: player.shirtNumber,
    pictureUrl: player.pictureUrl ?? null,
    birthDate: player.birthDate ?? null,
    heightCm: player.heightCm ?? null,
    weightKg: player.weightKg ?? null,
    matchesPlayed: player.matchesPlayed ?? null,
    minutesPlayed: player.minutesPlayed ?? null,
    starts: player.starts ?? null,
    goals: player.goals ?? null,
    assists: player.assists ?? null,
    yellowCards: player.yellowCards ?? null,
    redCards: player.redCards ?? null,
    rosterStatus: "squad",
    source: player.source,
    updatedAt,
  };
}

function profileFromEvent(event: MatchEvent, state: AppState): PlayerProfile | null {
  if (!event.playerName || !event.playerProfileId) return null;
  const match = state.matches.find((item) => item.id === event.matchId);
  const teamName = event.teamSide === "home" ? match?.homeTeam : event.teamSide === "away" ? match?.awayTeam : null;
  if (!teamName) return null;

  return {
    id: event.playerProfileId,
    fifaPlayerId: event.playerId && /^\d+$/.test(event.playerId) ? event.playerId : null,
    name: event.playerName,
    shortName: null,
    teamName,
    teamSlug: teamSlug(teamName),
    position: "unknown",
    positionDetail: null,
    shirtNumber: null,
    pictureUrl: null,
    birthDate: null,
    heightCm: null,
    weightKg: null,
    matchesPlayed: null,
    minutesPlayed: null,
    starts: null,
    goals: event.type === "goal" || event.type === "penalty_goal" || event.type === "own_goal" ? 1 : null,
    assists: null,
    yellowCards: event.type === "yellow_card" || event.type === "second_yellow" ? 1 : null,
    redCards: event.type === "red_card" ? 1 : null,
    rosterStatus: "event_only",
    source: event.source,
    updatedAt: event.updatedAt,
  };
}

export function derivePlayerProfilesFromState(state: AppState, updatedAt: string | null = null) {
  const fromSquads = state.teamProfiles.flatMap((team) => team.squad.map((player) => profileFromSquadPlayer(team, player, updatedAt ?? team.updatedAt)));
  const fromLineups = state.lineups.flatMap((lineup) =>
    [...lineup.players, ...lineup.homeBench, ...lineup.awayBench].map((player) => {
      const id = player.playerProfileId ?? playerProfileIdFor(player.teamName, player.id, player.name);
      return {
        id,
        fifaPlayerId: /^\d+$/.test(player.id) ? player.id : null,
        name: player.name,
        shortName: null,
        teamName: player.teamName,
        teamSlug: teamSlug(player.teamName),
        position: player.role,
        positionDetail: player.position || null,
        shirtNumber: player.shirtNumber,
        pictureUrl: null,
        birthDate: null,
        heightCm: null,
        weightKg: null,
        matchesPlayed: null,
        minutesPlayed: null,
        starts: player.isStarter ? 1 : null,
        goals: null,
        assists: null,
        yellowCards: null,
        redCards: null,
        rosterStatus: "lineup" as const,
        source: lineup.source,
        updatedAt: lineup.updatedAt,
      };
    }),
  );
  const fromEvents = state.matchEvents.map((event) => profileFromEvent(event, state)).filter((profile): profile is PlayerProfile => Boolean(profile));

  return mergePlayerProfiles(fromEvents, fromLineups, fromSquads, state.playerProfiles ?? []);
}

export function getPlayerProfile(state: AppState, playerId: string) {
  return state.playerProfiles.find((profile) => profile.id === playerId) ?? null;
}

import type { AppState, TeamSquadPlayer } from "@/lib/types";

export function isRealSquadPlayer(player: TeamSquadPlayer) {
  return player.source !== "placeholder";
}

export function realSquadPlayers(squad: TeamSquadPlayer[]) {
  return squad.filter(isRealSquadPlayer);
}

export function getRealSquadPlayers(state: AppState, teamName: string) {
  const squad = state.teamProfiles.find((profile) => profile.teamName === teamName)?.squad ?? [];
  return realSquadPlayers(squad);
}

export function getRealSquadPlayerIds(state: AppState, teamName: string) {
  return new Set(getRealSquadPlayers(state, teamName).map((player) => player.id));
}

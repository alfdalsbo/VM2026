import type { AppState } from "@/lib/types";

export function isFollowingMatch(state: AppState, playerId: string, matchId: string) {
  return state.followedMatches.some((item) => item.playerId === playerId && item.matchId === matchId);
}

export function toggleFollowedMatchInState(state: AppState, playerId: string, matchId: string, now = new Date()): AppState {
  const matchExists = state.matches.some((match) => match.id === matchId);
  if (!matchExists) throw new Error("Kampen finnes ikke.");

  if (isFollowingMatch(state, playerId, matchId)) {
    return {
      ...state,
      followedMatches: state.followedMatches.filter((item) => !(item.playerId === playerId && item.matchId === matchId)),
    };
  }

  return {
    ...state,
    followedMatches: [
      ...state.followedMatches,
      {
        playerId,
        matchId,
        createdAt: now.toISOString(),
      },
    ],
  };
}

export function followedMatchIdsForPlayer(state: AppState, playerId: string) {
  return new Set(state.followedMatches.filter((item) => item.playerId === playerId).map((item) => item.matchId));
}

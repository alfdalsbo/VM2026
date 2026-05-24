import type { Player } from "@/lib/types";

export const players: Player[] = [
  {
    id: "alf",
    name: "Alf Kåre Dalsbø",
    shortName: "Alf Kåre",
    avatar: "AK",
    color: "#b4232f",
    role: "admin",
  },
  {
    id: "vegard",
    name: "Vegard Lofnes",
    shortName: "Vegard",
    avatar: "VL",
    color: "#1d4ed8",
    role: "player",
  },
  {
    id: "jorgen",
    name: "Jørgen Deem",
    shortName: "Jørgen",
    avatar: "JD",
    color: "#15803d",
    role: "player",
  },
  {
    id: "steinar",
    name: "Steinar Lofnes",
    shortName: "Steinar",
    avatar: "SL",
    color: "#9f1239",
    role: "player",
  },
  {
    id: "sverre",
    name: "Sverre Skilbreid",
    shortName: "Sverre",
    avatar: "SS",
    color: "#a16207",
    role: "player",
  },
  {
    id: "fredrik",
    name: "Fredrik Skoglund",
    shortName: "Fredrik",
    avatar: "FS",
    color: "#374151",
    role: "player",
  },
  {
    id: "ruben",
    name: "Glenn Ruben Furu-Borgen",
    shortName: "Glenn Ruben",
    avatar: "GR",
    color: "#7c3aed",
    role: "player",
  },
  {
    id: "danny",
    name: "Danny",
    shortName: "Danny",
    avatar: "DY",
    color: "#0f766e",
    role: "player",
  },
];

export function getAdminPlayerIds() {
  const configured = process.env.ADMIN_PLAYER_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return configured?.length ? configured : ["alf"];
}

export function isAdminPlayer(playerId: string) {
  return getAdminPlayerIds().includes(playerId) || players.find((player) => player.id === playerId)?.role === "admin";
}

export function getPlayer(playerId: string) {
  return players.find((player) => player.id === playerId) ?? null;
}

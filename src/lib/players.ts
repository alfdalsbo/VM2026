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
    id: "anders",
    name: "Anders",
    shortName: "Anders",
    avatar: "AN",
    color: "#ea580c",
    role: "player",
  },
  {
    id: "danny",
    name: "Danny",
    shortName: "Danny",
    avatar: "DN",
    color: "#0f766e",
    role: "player",
  },
  {
    id: "fredrik",
    name: "Fredrik",
    shortName: "Fredrik",
    avatar: "FR",
    color: "#374151",
    role: "player",
  },
  {
    id: "geir-inge",
    name: "Geir Inge",
    shortName: "Geir Inge",
    avatar: "GI",
    color: "#db2777",
    role: "player",
  },
  {
    id: "ruben",
    name: "Glenn Ruben",
    shortName: "Glenn Ruben",
    avatar: "GR",
    color: "#7c3aed",
    role: "player",
  },
  {
    id: "jorgen",
    name: "Jørgen",
    shortName: "Jørgen",
    avatar: "JØ",
    color: "#15803d",
    role: "player",
  },
  {
    id: "ruben-2",
    name: "Ruben",
    shortName: "Ruben",
    avatar: "RU",
    color: "#0891b2",
    role: "player",
  },
  {
    id: "steinar",
    name: "Steinar",
    shortName: "Steinar",
    avatar: "ST",
    color: "#9f1239",
    role: "player",
  },
  {
    id: "sverre",
    name: "Sverre",
    shortName: "Sverre",
    avatar: "SV",
    color: "#a16207",
    role: "player",
  },
  {
    id: "vegard",
    name: "Vegard",
    shortName: "Vegard",
    avatar: "VE",
    color: "#1d4ed8",
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

import type { AppState, TeamProfile, TeamSquadPlayer, WorldCupMatch } from "@/lib/types";

const placeholderPattern = /^([12][A-L]|3[A-L]+|W\d+|RU\d+)$/;

export function teamSlug(teamName: string) {
  return teamName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isPlaceholderTeam(teamName: string) {
  return placeholderPattern.test(teamName);
}

export function createTeamProfile(teamName: string): TeamProfile {
  const slug = teamSlug(teamName);
  const query = encodeURIComponent(teamName);
  return {
    teamName,
    slug,
    coach: {
      name: null,
      countryCode: null,
      pictureUrl: null,
      source: null,
      updatedAt: null,
    },
    fifaTeamId: null,
    abbreviation: null,
    countryCode: null,
    confederation: null,
    flagUrl: null,
    city: null,
    foundationYear: null,
    officialSite: null,
    squad: [],
    fifaUrl: `https://www.fifa.com/en/search?query=${query}`,
    fotmobUrl: `https://www.fotmob.com/search?q=${query}`,
    source: null,
    updatedAt: null,
  };
}

export function createSeedTeamProfiles(matches: WorldCupMatch[]) {
  const names = new Set<string>();
  for (const match of matches) {
    for (const teamName of [match.homeTeam, match.awayTeam]) {
      if (!isPlaceholderTeam(teamName)) names.add(teamName);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, "nb")).map(createTeamProfile);
}

export function mergeTeamProfiles(seedProfiles: TeamProfile[], storedProfiles: TeamProfile[] = []) {
  const storedBySlug = new Map(storedProfiles.map((profile) => [profile.slug, profile]));
  const seedBySlug = new Map(seedProfiles.map((profile) => [profile.slug, profile]));
  const merged = seedProfiles.map((seed) => {
    const stored = storedBySlug.get(seed.slug);
    return stored
      ? {
          ...seed,
          ...stored,
          coach: {
            ...seed.coach,
            ...stored.coach,
          },
          squad: stored.squad ?? seed.squad,
        }
      : seed;
  });

  for (const profile of storedProfiles) {
    if (!seedBySlug.has(profile.slug)) merged.push(profile);
  }

  return merged.sort((a, b) => a.teamName.localeCompare(b.teamName, "nb"));
}

export function getTeamProfile(state: AppState, slug: string) {
  return state.teamProfiles.find((profile) => profile.slug === slug) ?? null;
}

export function matchesForTeam(state: AppState, teamName: string) {
  return state.matches.filter((match) => match.homeTeam === teamName || match.awayTeam === teamName);
}

export function groupSquadByPosition(squad: TeamSquadPlayer[]) {
  const labels = {
    goalkeeper: "Keepere",
    defender: "Forsvar",
    midfielder: "Midtbane",
    forward: "Angrep",
    unknown: "Uten posisjon",
  };

  return (Object.keys(labels) as Array<TeamSquadPlayer["position"]>).map((position) => ({
    position,
    label: labels[position],
    players: squad
      .filter((player) => player.position === position)
      .sort((a, b) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99) || a.name.localeCompare(b.name, "nb")),
  }));
}

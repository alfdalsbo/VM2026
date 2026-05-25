import Link from "next/link";

import { displayTeamName } from "@/lib/display";
import { isPlaceholderTeam, teamSlug } from "@/lib/teams";

export function TeamLink({ teamName, className }: { teamName: string; className?: string }) {
  if (isPlaceholderTeam(teamName)) return <span className={className}>{displayTeamName(teamName)}</span>;
  return (
    <Link className={className ?? "team-link"} href={`/lag/${teamSlug(teamName)}`}>
      {displayTeamName(teamName)}
    </Link>
  );
}

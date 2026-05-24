import Link from "next/link";

import { isPlaceholderTeam, teamSlug } from "@/lib/teams";

export function TeamLink({ teamName, className }: { teamName: string; className?: string }) {
  if (isPlaceholderTeam(teamName)) return <span className={className}>{teamName}</span>;
  return (
    <Link className={className ?? "team-link"} href={`/lag/${teamSlug(teamName)}`}>
      {teamName}
    </Link>
  );
}

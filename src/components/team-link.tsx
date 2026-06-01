import Link from "next/link";

import { displayTeamName } from "@/lib/display";
import { cx } from "@/lib/format";
import { isPlaceholderTeam, teamSlug } from "@/lib/teams";

export function TeamLink({ teamName, className }: { teamName: string; className?: string }) {
  if (isPlaceholderTeam(teamName)) return <span className={className}>{displayTeamName(teamName)}</span>;
  return (
    <Link className={className ?? "team-link"} href={`/lag/${teamSlug(teamName)}`}>
      {displayTeamName(teamName)}
    </Link>
  );
}

export function MatchupLinks({
  match,
  className,
  separator = " - ",
}: {
  match: { homeTeam: string; awayTeam: string };
  className?: string;
  separator?: string;
}) {
  return (
    <span className={cx("matchup-links", className)}>
      <TeamLink teamName={match.homeTeam} />
      <span className="matchup-separator" aria-hidden="true">{separator}</span>
      <TeamLink teamName={match.awayTeam} />
    </span>
  );
}

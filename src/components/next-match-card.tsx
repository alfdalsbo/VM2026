import Link from "next/link";

import { TeamLink } from "@/components/team-link";
import { displayStageOrGroup, flagEmojiFromCode, hostForCity, teamFlagEmoji } from "@/lib/display";
import { formatOsloDate } from "@/lib/format";
import type { WorldCupMatch } from "@/lib/types";

const timeFormatter = new Intl.DateTimeFormat("nb-NO", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Oslo",
});

export function NextMatchCard({ match }: { match: WorldCupMatch }) {
  const host = hostForCity(match.city);
  const hostFlag = flagEmojiFromCode(host?.code);
  const homeFlag = teamFlagEmoji(match.homeTeam);
  const awayFlag = teamFlagEmoji(match.awayTeam);
  const time = timeFormatter.format(new Date(match.kickoffAt));

  return (
    <article className="next-match-card">
      <Link href={`/kamp/${match.id}`} className="next-match-thumb" aria-label="Kampkort">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/stadium.svg" alt="" className="next-match-thumb-img" />
        <span className="next-match-time">{time}</span>
      </Link>

      <div className="next-match-content">
        <div className="next-match-place">
          {hostFlag ? <span className="next-match-host-flag" aria-hidden="true">{hostFlag}</span> : null}
          <div>
            <strong>{match.city}</strong>
            <span>{[host?.country, match.venue].filter(Boolean).join(" · ")}</span>
          </div>
        </div>

        <div className="next-match-teams">
          <div className="next-match-team">
            {homeFlag ? <span className="next-match-flag" aria-hidden="true">{homeFlag}</span> : null}
            <TeamLink teamName={match.homeTeam} />
          </div>
          <div className="next-match-team">
            {awayFlag ? <span className="next-match-flag" aria-hidden="true">{awayFlag}</span> : null}
            <TeamLink teamName={match.awayTeam} />
          </div>
        </div>

        <div className="next-match-foot">
          <span>{displayStageOrGroup(match)} · {formatOsloDate(match.kickoffAt)}</span>
          <Link href={`/kamp/${match.id}`} className="tip-card-link">Kampkort</Link>
        </div>
      </div>
    </article>
  );
}

import { BonusAutofillButton } from "@/components/bonus-autofill-button";
import { FinishedMatchesArchive } from "@/components/finished-matches-archive";
import { MatchTipCard } from "@/components/match-tip-card";
import { PredictionDeadlinePanel } from "@/components/prediction-deadline-panel";
import { Panel } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { BONUS_AUTOFILL_PREDICTED_OPEN } from "@/lib/bonus-autofill";
import { formatOsloDate } from "@/lib/format";
import { getPredictionDeadlineSummary } from "@/lib/prediction-insights";
import { hasFinalResult } from "@/lib/scoring";
import { getAppState } from "@/lib/state";
import type { WorldCupMatch } from "@/lib/types";

export const metadata = {
  title: "Kamper",
};

const osloKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Oslo",
  year: "numeric",
});
const archiveAfterKickoffMs = 3 * 60 * 60 * 1000;

function osloDateKey(value: string) {
  const parts = osloKeyFormatter.formatToParts(new Date(value));
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function groupMatchesByDate(matches: WorldCupMatch[], direction: "asc" | "desc" = "asc") {
  const buckets = new Map<string, { kickoff: string; matches: WorldCupMatch[] }>();
  for (const match of matches) {
    const key = osloDateKey(match.kickoffAt);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.matches.push(match);
    } else {
      buckets.set(key, { kickoff: match.kickoffAt, matches: [match] });
    }
  }

  return [...buckets.entries()]
    .map(([key, value]) => ({
      key,
      kickoff: value.kickoff,
      matches: value.matches.sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt)),
    }))
    .sort((a, b) => (direction === "asc" ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key)));
}

function isArchivedMatch(match: WorldCupMatch, now: Date) {
  if (hasFinalResult(match)) return true;
  if (match.status === "live" || match.status === "halftime") return false;
  const kickoff = Date.parse(match.kickoffAt);
  return Number.isFinite(kickoff) && kickoff + archiveAfterKickoffMs <= now.getTime();
}

function MatchDayList({
  bonusNext,
  groupedMatches,
  player,
  state,
}: {
  bonusNext: string;
  groupedMatches: ReturnType<typeof groupMatchesByDate>;
  player: Awaited<ReturnType<typeof requireSession>>;
  state: Awaited<ReturnType<typeof getAppState>>;
}) {
  return (
    <div className="tip-day-list">
      {groupedMatches.map(({ key, kickoff, matches }) => (
        <section key={key} className="tip-day">
          <h2 className="tip-day-heading">{formatOsloDate(kickoff)}</h2>
          <div className="tip-day-matches">
            {matches.map((match) => (
              <MatchTipCard key={match.id} match={match} player={player} state={state} bonusNext={bonusNext} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default async function MatchesPage() {
  const [player, state] = await Promise.all([requireSession(), getAppState()]);
  const deadlineSummary = getPredictionDeadlineSummary(state, player.id);
  const now = new Date();
  const finishedMatches = state.matches.filter((match) => isArchivedMatch(match, now));
  const activeMatches = state.matches.filter((match) => !isArchivedMatch(match, now));
  const groupedActiveMatches = groupMatchesByDate(activeMatches);
  const groupedFinishedMatches = groupMatchesByDate(finishedMatches, "desc");

  return (
    <div className="space-y-6">
      <Panel>
        <div className="bonus-page-heading">
          <div>
            <p className="eyebrow">VM 2026</p>
            <h1 className="section-title mt-2">Alle kampene</h1>
            <p className="lead mt-3 max-w-3xl">
              Lever resultattips helt til avspark. Bonustips ligger inne på samme kamp for dem som vil føre den litt mer selvhøytidelige protokollen.
            </p>
          </div>
          <BonusAutofillButton
            matchId={BONUS_AUTOFILL_PREDICTED_OPEN}
            next="/kamper"
            label="Autofyll bonus for tippede kamper"
          />
        </div>
      </Panel>

      <PredictionDeadlinePanel summary={deadlineSummary} />

      {finishedMatches.length ? (
        <FinishedMatchesArchive
          dayCount={groupedFinishedMatches.length}
          matchCount={finishedMatches.length}
          matchIds={finishedMatches.map((match) => match.id)}
        >
          <MatchDayList bonusNext="/kamper" groupedMatches={groupedFinishedMatches} player={player} state={state} />
        </FinishedMatchesArchive>
      ) : null}

      <MatchDayList bonusNext="/kamper" groupedMatches={groupedActiveMatches} player={player} state={state} />
    </div>
  );
}

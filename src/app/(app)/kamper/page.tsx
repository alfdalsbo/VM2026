import { BonusAutofillButton } from "@/components/bonus-autofill-button";
import { MatchTipCard } from "@/components/match-tip-card";
import { PredictionDeadlinePanel } from "@/components/prediction-deadline-panel";
import { Panel } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { BONUS_AUTOFILL_PREDICTED_OPEN } from "@/lib/bonus-autofill";
import { formatOsloDate } from "@/lib/format";
import { getPredictionDeadlineSummary } from "@/lib/prediction-insights";
import { getAppState } from "@/lib/state";

export const metadata = {
  title: "Kamper",
};

const osloKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Oslo",
  year: "numeric",
});

function osloDateKey(value: string) {
  const parts = osloKeyFormatter.formatToParts(new Date(value));
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export default async function MatchesPage() {
  const [player, state] = await Promise.all([requireSession(), getAppState()]);
  const deadlineSummary = getPredictionDeadlineSummary(state, player.id);

  const buckets = new Map<string, { kickoff: string; matches: typeof state.matches }>();
  for (const match of state.matches) {
    const key = osloDateKey(match.kickoffAt);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.matches.push(match);
    } else {
      buckets.set(key, { kickoff: match.kickoffAt, matches: [match] });
    }
  }
  const groupedByDate = [...buckets.entries()]
    .map(([key, value]) => ({
      key,
      kickoff: value.kickoff,
      matches: value.matches.sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt)),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

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

      <div className="tip-day-list">
        {groupedByDate.map(({ key, kickoff, matches }) => (
          <section key={key} className="tip-day">
            <h2 className="tip-day-heading">{formatOsloDate(kickoff)}</h2>
            <div className="tip-day-matches">
              {matches.map((match) => (
                <MatchTipCard key={match.id} match={match} player={player} state={state} bonusNext="/kamper" />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

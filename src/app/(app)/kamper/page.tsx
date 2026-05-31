import { MatchTipCard } from "@/components/match-tip-card";
import { Panel } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatOsloDate } from "@/lib/format";
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
        <p className="eyebrow">VM 2026</p>
        <h1 className="section-title mt-2">Alle kampene</h1>
        <p className="lead mt-3 max-w-3xl">
          Lever resultattips helt til avspark. Når dommeren blåser i gang, blir kupongen stående der som en liten offentlig karaktertest.
        </p>
      </Panel>

      <div className="tip-day-list">
        {groupedByDate.map(({ key, kickoff, matches }) => (
          <section key={key} className="tip-day">
            <h2 className="tip-day-heading">{formatOsloDate(kickoff)}</h2>
            <div className="tip-day-matches">
              {matches.map((match) => (
                <MatchTipCard key={match.id} match={match} player={player} state={state} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

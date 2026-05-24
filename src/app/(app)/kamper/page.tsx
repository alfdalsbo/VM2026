import { MatchCard } from "@/components/match-card";
import { Notice, Panel } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatOsloDate } from "@/lib/format";
import { getAppState } from "@/lib/state";

export const metadata = {
  title: "Kamper",
};

export default async function MatchesPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const [player, state] = await Promise.all([requireSession(), getAppState()]);
  const grouped = state.rounds.map((round) => ({
    round,
    matches: state.matches.filter((match) => match.roundId === round.id),
  }));

  return (
    <div className="space-y-6">
      <Panel>
        <p className="eyebrow">VM 2026</p>
        <h1 className="section-title mt-2">Alle kampene</h1>
        <p className="lead mt-3 max-w-3xl">
          Tipp resultat før kampstart. Én joker per kampdag. Når fristen er passert, blir tipset stående der som en liten offentlig karaktertest.
        </p>
      </Panel>

      <Notice message={params.status} />
      <Notice message={params.error} tone="error" />

      <div className="space-y-5">
        {grouped.map(({ round, matches }) => (
          <section key={round.id} className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">{matches[0]?.stageLabel ?? "Runde"}</p>
                <h2 className="text-2xl font-black capitalize">{formatOsloDate(round.startsAt)}</h2>
              </div>
              <p className="lead text-sm">{matches.length} kamp{matches.length === 1 ? "" : "er"}</p>
            </div>
            <div className="grid gap-4">
              {matches.map((match) => (
                <MatchCard key={match.id} match={match} player={player} state={state} showLockedPredictions />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

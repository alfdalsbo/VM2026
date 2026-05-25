import { KnockoutFlow } from "@/components/knockout-flow";
import { Panel } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { displayGroupLabel, displayMatchup, displayTeamName } from "@/lib/display";
import { formatOsloDateTime } from "@/lib/format";
import { getAppState } from "@/lib/state";
import { buildKnockoutFlow, computeGroupTables, formatBroadcast, formatMatchStatus } from "@/lib/tournament";

export const metadata = {
  title: "VM",
};

export default async function WorldCupPage() {
  await requireSession();
  const state = await getAppState();
  const groups = computeGroupTables(state);
  const knockout = buildKnockoutFlow(state);
  const tvMatches = [...state.matches].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
  const stats = state.tournamentStats;

  return (
    <div className="space-y-6">
      <Panel>
        <p className="eyebrow">VM 2026</p>
        <h1 className="section-title mt-2">Hele turneringen</h1>
        <p className="lead mt-3 max-w-3xl">
          Grupper, utslagsvei, TV-kanaler og statistikk. Med akkurat nok oversikt til at alle kan påstå at de hadde sett dette komme.
        </p>
        <div className="vm-tabs mt-5">
          <a href="#grupper">Grupper</a>
          <a href="#utslag">Utslag</a>
          <a href="#tv">TV-guide</a>
          <a href="#statistikk">Statistikk</a>
        </div>
      </Panel>

      <section id="grupper" className="space-y-4">
        <div>
          <p className="eyebrow">Grupper</p>
          <h2 className="section-title">Stillingen</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <Panel key={group.group}>
              <h3 className="text-xl font-black">{displayGroupLabel(group.group) ?? group.group}</h3>
              <div className="table-wrap mt-3">
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Lag</th>
                      <th>K</th>
                      <th>V</th>
                      <th>U</th>
                      <th>T</th>
                      <th>MF</th>
                      <th>P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr key={row.team}>
                        <td className="font-bold">{displayTeamName(row.team)}</td>
                        <td>{row.played}</td>
                        <td>{row.wins}</td>
                        <td>{row.draws}</td>
                        <td>{row.losses}</td>
                        <td>{row.goalDifference}</td>
                        <td className="font-black">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ))}
        </div>
      </section>

      <section id="utslag" className="space-y-4">
        <div>
          <p className="eyebrow">Utslag</p>
          <h2 className="section-title">Veien til finalen</h2>
        </div>
        <KnockoutFlow rounds={knockout} />
      </section>

      <section id="tv" className="space-y-4">
        <div>
          <p className="eyebrow">TV-guide</p>
          <h2 className="section-title">Når og hvor</h2>
        </div>
        <Panel>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kamp</th>
                  <th>Tid</th>
                  <th>TV</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tvMatches.map((match) => (
                  <tr key={match.id}>
                    <td className="font-bold">Kamp {match.matchNumber}: {displayMatchup(match)}</td>
                    <td>{formatOsloDateTime(match.kickoffAt)}</td>
                    <td>{formatBroadcast(match)}</td>
                    <td>{formatMatchStatus(match)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      <section id="statistikk" className="space-y-4">
        <div>
          <p className="eyebrow">Statistikk</p>
          <h2 className="section-title">Tall som kan brukes i diskusjoner</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <StatsPanel title="Toppscorer" rows={stats.topScorers.map((row) => `${row.playerName}, ${displayTeamName(row.teamName)}: ${row.value}`)} empty={stats.unavailableReason} />
          <StatsPanel title="Assist" rows={stats.assistMakers.map((row) => `${row.playerName}, ${displayTeamName(row.teamName)}: ${row.value}`)} empty={stats.unavailableReason} />
          <StatsPanel title="Kortkongen" rows={stats.discipline.map((row) => `${displayTeamName(row.teamName)}: ${row.yellowCards} gule, ${row.redCards} røde`)} empty={stats.unavailableReason} />
        </div>
      </section>
    </div>
  );
}

function StatsPanel({ title, rows, empty }: { title: string; rows: string[]; empty: string | null }) {
  return (
    <Panel>
      <h3 className="text-xl font-black">{title}</h3>
      {rows.length ? (
        <ol className="mt-3 grid gap-2">
          {rows.map((row) => (
            <li key={row} className="lead">{row}</li>
          ))}
        </ol>
      ) : (
        <p className="lead mt-3">{empty ?? "Ikke tilgjengelig ennå."}</p>
      )}
    </Panel>
  );
}

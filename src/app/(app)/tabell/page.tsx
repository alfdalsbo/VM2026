import { Panel } from "@/components/ui";
import { computeStandings } from "@/lib/scoring";
import { getAppState } from "@/lib/state";

export const metadata = {
  title: "Tabell",
};

export default async function TablePage() {
  const state = await getAppState();
  const standings = computeStandings(state);

  return (
    <div className="space-y-6">
      <Panel>
        <p className="eyebrow">Offisiell stilling</p>
        <h1 className="section-title mt-2">Tabellen</h1>
        <p className="lead mt-3 max-w-3xl">
          Sortert etter poeng, deretter eksakte resultater og riktig utfall. Med andre ord: akkurat nok system til at alle kan være uenige med verdighet.
        </p>
      </Panel>

      <Panel>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Spiller</th>
                <th>Poeng</th>
                <th>Tips</th>
                <th>Eksakte</th>
                <th>Utfall</th>
                <th>Jokertreff</th>
                <th>Rundeseire</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing) => (
                <tr key={standing.player.id}>
                  <td className="font-black">{standing.rank}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded text-sm font-black text-white" style={{ backgroundColor: standing.player.color }}>
                        {standing.player.avatar}
                      </span>
                      <span className="font-bold">{standing.player.shortName}</span>
                    </div>
                  </td>
                  <td className="font-black">{standing.totalPoints}</td>
                  <td>{standing.predictions}</td>
                  <td>{standing.exactResults}</td>
                  <td>{standing.outcomeHits}</td>
                  <td>{standing.jokerHits}</td>
                  <td>{standing.roundsWon}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

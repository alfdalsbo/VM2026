import Link from "next/link";

import { KnockoutFlow } from "@/components/knockout-flow";
import { MatchupLinks, TeamLink } from "@/components/team-link";
import { Panel } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { displayGroupLabel } from "@/lib/display";
import { formatOsloDateTime } from "@/lib/format";
import { getAppState } from "@/lib/state";
import { buildKnockoutFlow, computeGroupTables, formatBroadcast, formatMatchStatus } from "@/lib/tournament";
import { buildWorldCupStatistics, type VmStatisticCard, type VmStatisticRow } from "@/lib/vm-statistics";

export const metadata = {
  title: "VM26",
};

export default async function WorldCupPage() {
  await requireSession();
  const state = await getAppState();
  const groups = computeGroupTables(state);
  const knockout = buildKnockoutFlow(state);
  const tvMatches = [...state.matches].sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
  const richStats = buildWorldCupStatistics(state, new Date());

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
              <div className="group-table-wrap mt-3">
                <table className="compact-table group-table">
                  <colgroup>
                    <col />
                    <col span={6} className="group-stat-col" />
                  </colgroup>
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
                        <td className="group-team-cell font-bold"><TeamLink teamName={row.team} /></td>
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
                    <td className="font-bold">
                      Kamp {match.matchNumber}: <MatchupLinks match={match} />
                    </td>
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
          <h2 className="section-title">Kjellerens analysebord</h2>
        </div>
        <Panel className="vm-stat-command">
          <p className="eyebrow">Dommerbordet</p>
          <h3 className="section-title mt-2">Tallene som gjør vennskap litt mer presist</h3>
          <p className="lead mt-3 max-w-3xl">
            Her blandes fasit, 0-0-standard, leverte tips og bonusrot til en privat tiltale. Offisiell VM-statistikk får sitte nederst og oppføre seg.
          </p>
        </Panel>

        <StatisticCardGrid cards={richStats.overview.cards} />

        <div className="vm-stat-layout">
          <StatisticPanel
            eyebrow="Gjengens orakel"
            title="Hvem kan bli uutholdelig?"
            cards={richStats.playerRecords.cards}
            rows={richStats.playerRecords.rows}
          />
          <StatisticPanel
            eyebrow="Tips vs virkelighet"
            title="Kollektiv domsfellelse"
            cards={richStats.teamBias.cards}
            rows={richStats.teamBias.rows}
          />
        </div>

        <div className="vm-stat-layout">
          <StatisticPanel
            eyebrow="Kampdrama"
            title="Hvor kjelleren er mest uenig"
            cards={richStats.matchDrama.cards}
            rows={richStats.matchDrama.rows}
          />
          <StatisticPanel
            eyebrow="Hall of Fame / skammekrok"
            title="Arkiverte ugjerninger"
            rows={richStats.hallOfFame.rows}
          />
        </div>

        <div>
          <p className="eyebrow">Offisiell pynt</p>
          <h3 className="section-title mt-2">VM-tall fra utsiden</h3>
          <p className="lead mt-3">{richStats.officialStats.sourceDetail}</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <OfficialStatsPanel title="Toppscorer" rows={richStats.officialStats.topScorers} empty={richStats.officialStats.sourceDetail} />
          <OfficialStatsPanel title="Assist" rows={richStats.officialStats.assists} empty={richStats.officialStats.sourceDetail} />
          <OfficialStatsPanel title="Kortkongen" rows={richStats.officialStats.discipline} empty={richStats.officialStats.sourceDetail} />
        </div>
      </section>
    </div>
  );
}

function StatisticCardGrid({ cards }: { cards: VmStatisticCard[] }) {
  return (
    <div className="vm-stat-card-grid">
      {cards.map((card) => (
        <StatisticCard key={`${card.label}-${card.value}`} card={card} />
      ))}
    </div>
  );
}

function StatisticCard({ card }: { card: VmStatisticCard }) {
  const content = (
    <>
      <span>{card.label}</span>
      <strong>{card.value}</strong>
      <em>{card.detail}</em>
      <Meter value={card.meter} />
    </>
  );

  if (card.href) {
    return (
      <Link className="vm-stat-card vm-stat-link" href={card.href}>
        {content}
      </Link>
    );
  }

  return <article className="vm-stat-card">{content}</article>;
}

function StatisticPanel({
  eyebrow,
  title,
  cards = [],
  rows,
}: {
  eyebrow: string;
  title: string;
  cards?: VmStatisticCard[];
  rows: VmStatisticRow[];
}) {
  return (
    <Panel className="vm-stat-panel">
      <p className="eyebrow">{eyebrow}</p>
      <h3 className="text-xl font-black">{title}</h3>
      {cards.length ? (
        <div className="vm-stat-mini-grid">
          {cards.map((card) => (
            <StatisticCard key={`${card.label}-${card.value}`} card={card} />
          ))}
        </div>
      ) : null}
      <div className="vm-stat-row-list">
        {rows.map((row) => (
          <StatisticRow key={`${row.title}-${row.value}`} row={row} />
        ))}
      </div>
    </Panel>
  );
}

function StatisticRow({ row }: { row: VmStatisticRow }) {
  const content = (
    <>
      <div>
        <strong>{row.title}</strong>
        <span>{row.detail}</span>
      </div>
      <em>{row.value}</em>
      <Meter value={row.meter} />
    </>
  );

  if (row.href) {
    return (
      <Link className="vm-stat-row vm-stat-link" href={row.href}>
        {content}
      </Link>
    );
  }

  return <article className="vm-stat-row">{content}</article>;
}

function OfficialStatsPanel({ title, rows, empty }: { title: string; rows: VmStatisticRow[]; empty: string }) {
  return (
    <Panel className="vm-stat-panel">
      <h3 className="text-xl font-black">{title}</h3>
      {rows.length ? (
        <ol className="vm-official-list">
          {rows.map((row) => (
            <li key={`${row.title}-${row.value}`}>
              <div>
                {row.href ? (
                  <Link href={row.href}>
                    <strong>{row.title}</strong>
                  </Link>
                ) : (
                  <strong>{row.title}</strong>
                )}
                <span>{row.detail}</span>
              </div>
              <em>{row.value}</em>
              <Meter value={row.meter} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="lead mt-3">{empty}</p>
      )}
    </Panel>
  );
}

function Meter({ value }: { value?: number }) {
  if (value == null) return null;
  return (
    <span className="vm-stat-meter" aria-hidden="true">
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}

import { TeamLink } from "@/components/team-link";
import { displayTeamName } from "@/lib/display";
import { formatScore } from "@/lib/format";
import type { MatchAnalysis } from "@/lib/match-analysis";
import type { MatchEvent, MatchLineup, MatchStats, TeamSide, WorldCupMatch } from "@/lib/types";

export function PostMatchAnalysis({
  analysis,
  match,
  stats,
  lineup,
  events,
}: {
  analysis: MatchAnalysis;
  match: WorldCupMatch;
  stats: MatchStats | null;
  lineup: MatchLineup | null;
  events: MatchEvent[];
}) {
  const statusLabel = analysis.status === "tsg_enriched" ? "TSG-beriket" : "Foreløpig analyse";

  return (
    <div className="post-match-analysis">
      <div className="analysis-hero">
        <div>
          <p className="eyebrow">Taktisk rapport</p>
          <h2 className="section-title mt-2">{analysis.headline}</h2>
          <p className="lead mt-3">{analysis.summary}</p>
        </div>
        <span className={`analysis-status analysis-status-${analysis.status}`}>{statusLabel}</span>
      </div>

      <TacticalSvgBoard analysis={analysis} match={match} lineup={lineup} events={events} />

      <div className="analysis-grid">
        <section>
          <h3>Kampbildet</h3>
          <ul className="analysis-list">
            {analysis.tacticalThemes.map((theme) => (
              <li key={theme}>{theme}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3><TeamLink teamName={match.homeTeam} /></h3>
          <p>{analysis.homeAnalysis}</p>
        </section>
        <section>
          <h3><TeamLink teamName={match.awayTeam} /></h3>
          <p>{analysis.awayAnalysis}</p>
        </section>
      </div>

      <StatsBars stats={stats} match={match} />

      <div className="analysis-grid analysis-grid-compact">
        <section>
          <h3>Vendepunkt</h3>
          <ul className="analysis-list">
            {analysis.turningPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
        <section>
          <h3>Spillernotater</h3>
          <ul className="analysis-list">
            {analysis.playerNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      </div>

      {analysis.graphicsNotes.notes.length ? (
        <div className="analysis-notes">
          {analysis.graphicsNotes.notes.map((note) => (
            <span key={note}>{note}</span>
          ))}
        </div>
      ) : null}

      {analysis.sources.length ? (
        <div className="analysis-sources" aria-label="Kilder for taktisk rapport">
          {analysis.sources.map((source) => (
            <a key={`${source.title}-${source.url}`} href={source.url} rel="noreferrer" target="_blank">
              {source.publisher ? `${source.publisher}: ` : ""}
              {source.title}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TacticalSvgBoard({
  analysis,
  match,
  lineup,
  events,
}: {
  analysis: MatchAnalysis;
  match: WorldCupMatch;
  lineup: MatchLineup | null;
  events: MatchEvent[];
}) {
  const home = displayTeamName(match.homeTeam);
  const away = displayTeamName(match.awayTeam);
  const homeFormation = lineup?.formation.home ?? "-";
  const awayFormation = lineup?.formation.away ?? "-";
  const timelineEvents = events
    .filter((event) => event.minute != null && ["goal", "own_goal", "penalty_goal", "yellow_card", "red_card", "second_yellow"].includes(event.type))
    .slice(0, 14);
  const maxMinute = Math.max(90, ...timelineEvents.map((event) => event.minute ?? 0));

  return (
    <div className="analysis-board" aria-label={`Taktikktavle for ${home} mot ${away}`}>
      <svg viewBox="0 0 100 72" role="img">
        <title>{`Taktikktavle: ${home} ${homeFormation} mot ${away} ${awayFormation}`}</title>
        <defs>
          <marker id={`analysis-arrow-${match.id}`} markerHeight="5" markerWidth="5" orient="auto" refX="4" refY="2.5">
            <path d="M0,0 L5,2.5 L0,5 Z" />
          </marker>
        </defs>
        <rect className="analysis-pitch" x="1" y="1" width="98" height="54" rx="2" />
        <line className="analysis-pitch-line" x1="50" x2="50" y1="1" y2="55" />
        <circle className="analysis-pitch-line" cx="50" cy="28" r="8" />
        <rect className="analysis-box" x="1" y="14" width="12" height="28" />
        <rect className="analysis-box" x="87" y="14" width="12" height="28" />
        {analysis.graphicsNotes.keyZones.map((zone, index) => (
          <g key={`${zone.label}-${index}`}>
            <rect className={`analysis-zone analysis-zone-${zone.tone}`} x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx="2" />
            <text className="analysis-zone-label" x={zone.x + zone.width / 2} y={zone.y + zone.height / 2}>
              {zone.label}
            </text>
          </g>
        ))}
        <FormationMarkers side="home" label={homeFormation} />
        <FormationMarkers side="away" label={awayFormation} />
        {analysis.graphicsNotes.arrows.map((arrow, index) => (
          <g key={`${arrow.from.x}-${arrow.to.x}-${index}`}>
            <line
              className={`analysis-arrow analysis-arrow-${arrow.teamSide}`}
              markerEnd={`url(#analysis-arrow-${match.id})`}
              x1={arrow.from.x}
              x2={arrow.to.x}
              y1={arrow.from.y}
              y2={arrow.to.y}
            />
            {arrow.label ? (
              <text className="analysis-arrow-label" x={(arrow.from.x + arrow.to.x) / 2} y={(arrow.from.y + arrow.to.y) / 2 - 2}>
                {arrow.label}
              </text>
            ) : null}
          </g>
        ))}
        <text className="analysis-team-label" x="7" y="63">
          {home} {homeFormation}
        </text>
        <text className="analysis-team-label analysis-team-label-away" x="93" y="63">
          {away} {awayFormation}
        </text>
        <line className="analysis-timeline" x1="8" x2="92" y1="68" y2="68" />
        {timelineEvents.map((event, index) => {
          const x = 8 + ((event.minute ?? 0) / maxMinute) * 84;
          const tone = event.teamSide ?? "neutral";
          return (
            <g key={`${event.id}-${index}`}>
              <circle className={`analysis-event-dot analysis-event-${tone}`} cx={x} cy="68" r={eventRadius(event.type)} />
              <title>{eventTitle(event)}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function FormationMarkers({ side, label }: { side: TeamSide; label: string }) {
  const home = side === "home";
  const rows = label.match(/\d+/g)?.map(Number).filter((value) => value > 0).slice(0, 4) ?? [4, 3, 3];
  const allRows = [1, ...rows];
  const xStart = home ? 10 : 90;
  const xStep = home ? 10 : -10;

  return (
    <>
      {allRows.map((count, rowIndex) =>
        Array.from({ length: count }).map((_, playerIndex) => {
          const y = 10 + ((playerIndex + 1) * 36) / (count + 1);
          const x = xStart + rowIndex * xStep;
          return <circle key={`${side}-${rowIndex}-${playerIndex}`} className={`analysis-player-dot analysis-player-${side}`} cx={x} cy={y} r="1.25" />;
        }),
      )}
    </>
  );
}

function StatsBars({ stats, match }: { stats: MatchStats | null; match: WorldCupMatch }) {
  const home = displayTeamName(match.homeTeam);
  const away = displayTeamName(match.awayTeam);
  const rows = [
    { label: "Ballbesittelse", home: stats?.homePossession ?? null, away: stats?.awayPossession ?? null, suffix: "%" },
    { label: "Skudd", home: stats?.homeShots ?? null, away: stats?.awayShots ?? null, suffix: "" },
    { label: "På mål", home: stats?.homeShotsOnTarget ?? null, away: stats?.awayShotsOnTarget ?? null, suffix: "" },
    { label: "Cornere", home: stats?.homeCorners ?? null, away: stats?.awayCorners ?? null, suffix: "" },
  ];

  return (
    <div className="analysis-stat-bars" aria-label={`Sammenlignende statistikk for ${home} og ${away}`}>
      {rows.map((row) => {
        const total = (row.home ?? 0) + (row.away ?? 0);
        const homeWidth = total > 0 ? ((row.home ?? 0) / total) * 100 : 50;
        return (
          <div key={row.label} className="analysis-stat-row">
            <span>{formatStat(row.home, row.suffix)}</span>
            <div>
              <strong>{row.label}</strong>
              <i>
                <b style={{ width: `${homeWidth}%` }} />
              </i>
            </div>
            <span>{formatStat(row.away, row.suffix)}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatStat(value: number | null, suffix: string) {
  return value == null ? "-" : `${value}${suffix}`;
}

function eventRadius(type: MatchEvent["type"]) {
  if (type === "goal" || type === "own_goal" || type === "penalty_goal") return 2.2;
  if (type === "red_card" || type === "second_yellow") return 1.9;
  return 1.5;
}

function eventTitle(event: MatchEvent) {
  const minute = event.minute != null ? `${event.minute}'` : "Tid ukjent";
  const player = event.playerName ? ` ${event.playerName}` : "";
  const score = event.scoreAfter ? ` ${formatScore(event.scoreAfter.homeGoals, event.scoreAfter.awayGoals)}` : "";
  return `${minute}${player}${score}`;
}

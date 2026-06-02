import { ExternalLink } from "lucide-react";

import { Panel } from "@/components/ui";
import type { WorldCupHeadToHeadMoment } from "@/lib/world-cup-head-to-head";

export function MatchHeadToHeadNote({ moment }: { moment: WorldCupHeadToHeadMoment }) {
  return (
    <aside className="match-nostalgia-note match-head-to-head-note" aria-label="Tidligere VM-møte">
      <span>Tidligere VM-møte · {moment.year} · {moment.result}</span>
      <strong>{moment.tournament}: {moment.stage}</strong>
      <p>{moment.teaser}</p>
      <details className="match-head-to-head-more">
        <summary>Mer</summary>
        <p>{moment.body}</p>
        <a href={moment.source.url} target="_blank" rel="noreferrer">
          Kilde: {moment.source.name}
        </a>
      </details>
    </aside>
  );
}

export function MatchHeadToHeadPanel({ moment }: { moment: WorldCupHeadToHeadMoment }) {
  return (
    <Panel className="match-head-to-head-panel">
      <div>
        <p className="eyebrow">Tidligere VM-møte</p>
        <h2 className="section-title mt-2">{moment.result}</h2>
        <p className="lead mt-3">{moment.body}</p>
      </div>
      <div className="match-head-to-head-facts" aria-label="VM-historikk">
        <Fact label="År" value={moment.year} />
        <Fact label="Turnering" value={moment.tournament} />
        <Fact label="Fase" value={moment.stage} />
        <Fact label="Sted" value={moment.venue} />
      </div>
      <a className="nostalgia-source match-head-to-head-source" href={moment.source.url} target="_blank" rel="noreferrer">
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        Kilde: {moment.source.name}
      </a>
    </Panel>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

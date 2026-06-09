import Link from "next/link";

import { DeadlineCountdown } from "@/components/deadline-countdown";
import { Panel } from "@/components/ui";
import { displayMatchup } from "@/lib/display";
import { formatOsloDateTime } from "@/lib/format";
import type { PredictionDeadlineSummary } from "@/lib/prediction-insights";

export function PredictionDeadlinePanel({ summary }: { summary: PredictionDeadlineSummary }) {
  const { nextMatch, firstMissingMatch, missingMatches } = summary;
  const missingCount = missingMatches.length;

  return (
    <Panel className="prediction-deadline-panel">
      <div className="prediction-deadline-copy">
        <p className="eyebrow">Neste lås</p>
        {nextMatch ? (
          <>
            <h2 className="section-title mt-2">{displayMatchup(nextMatch)}</h2>
            <p className="lead mt-2">
              {formatOsloDateTime(nextMatch.kickoffAt)} · {summary.deliveredCount}/{summary.playerCount} i kjelleren har levert
            </p>
            <div className="prediction-deadline-timer">
              <DeadlineCountdown targetAt={nextMatch.kickoffAt} />
            </div>
          </>
        ) : (
          <>
            <h2 className="section-title mt-2">Ingen åpne frister</h2>
            <p className="lead mt-2">Kupongen har lukket luka for nå.</p>
          </>
        )}
      </div>

      <div className="prediction-deadline-status">
        <strong>{missingCount > 0 ? `Du mangler ${missingCount} åpne tips` : "Kupongen er tett"}</strong>
        <span>{missingCount > 0 ? "Ingen grunn til panikk, bare lett administrativ svetting." : "Alt som kan leveres er levert."}</span>
        <div className="prediction-deadline-actions">
          {firstMissingMatch ? (
            <Link href={`/kamper#${firstMissingMatch.id}`} className="btn-primary">
              Tett hullene
            </Link>
          ) : null}
          {nextMatch ? (
            <Link href={`/kamp/${nextMatch.id}`} className="btn-secondary">
              Kampkort
            </Link>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}

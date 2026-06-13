"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useId, useState } from "react";

export function FinishedMatchesArchive({
  children,
  dayCount,
  defaultOpen = false,
  matchCount,
  matchIds,
}: {
  children?: React.ReactNode;
  dayCount: number;
  defaultOpen?: boolean;
  matchCount: number;
  matchIds: string[];
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const matchLabel = matchCount === 1 ? "ferdigspilt kamp" : "ferdigspilte kamper";
  const dayLabel = dayCount === 1 ? "kampdag" : "kampdager";

  return (
    <section className="finished-matches-archive" aria-label="Ferdigspilte kamper">
      <div className="finished-matches-archive-summary">
        <div>
          <p className="eyebrow">Arkiv</p>
          <h2>Ferdigspilte kamper</h2>
          <p>
            {matchCount} {matchLabel} fra {dayCount} {dayLabel}.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary finished-matches-archive-toggle"
          aria-controls={panelId}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
          {open ? "Skjul arkivet" : "Åpne arkivet"}
        </button>
      </div>

      {open ? (
        <div id={panelId} className="finished-matches-archive-content" data-match-ids={matchIds.join(" ")}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { Minus, Plus, TicketCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import { savePredictionAction, type SavePredictionState } from "@/app/actions";
import { TeamLink } from "@/components/team-link";
import { teamFlagEmoji } from "@/lib/display";
import { cx } from "@/lib/format";
import type { Prediction, TeamSquadPlayer, WorldCupMatch } from "@/lib/types";

const INITIAL: SavePredictionState = {};

type Counts = Record<string, number>;

const POSITION_LABELS: Record<TeamSquadPlayer["position"], string> = {
  goalkeeper: "K",
  defender: "F",
  midfielder: "M",
  forward: "A",
  unknown: "—",
};

function listToCounts(ids: string[] | undefined): Counts {
  const counts: Counts = {};
  for (const id of ids ?? []) {
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

function countsToList(counts: Counts): string[] {
  const list: string[] = [];
  for (const [id, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i += 1) list.push(id);
  }
  return list;
}

function totalCount(counts: Counts): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

export function ScorerAssistPicker({
  match,
  prediction,
  homeSquad,
  awaySquad,
}: {
  match: WorldCupMatch;
  prediction: Prediction | null;
  homeSquad: TeamSquadPlayer[];
  awaySquad: TeamSquadPlayer[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const homeGoals = prediction?.homeGoals ?? 0;
  const awayGoals = prediction?.awayGoals ?? 0;
  const [homeScorers, setHomeScorers] = useState<Counts>(() => listToCounts(prediction?.homeScorers));
  const [awayScorers, setAwayScorers] = useState<Counts>(() => listToCounts(prediction?.awayScorers));
  const [homeAssists, setHomeAssists] = useState<Counts>(() => listToCounts(prediction?.homeAssists));
  const [awayAssists, setAwayAssists] = useState<Counts>(() => listToCounts(prediction?.awayAssists));
  const [saveState, formAction, pending] = useActionState(savePredictionAction, INITIAL);

  useEffect(() => {
    if (!saveState.status && !saveState.error) return;
    const key = saveState.error ? "error" : "status";
    const value = saveState.error ?? saveState.status ?? "";
    router.replace(`${pathname}?${key}=${encodeURIComponent(value)}`, { scroll: false });
  }, [saveState, router, pathname]);

  const homeScorerList = useMemo(() => countsToList(homeScorers), [homeScorers]);
  const awayScorerList = useMemo(() => countsToList(awayScorers), [awayScorers]);
  const homeAssistList = useMemo(() => countsToList(homeAssists), [homeAssists]);
  const awayAssistList = useMemo(() => countsToList(awayAssists), [awayAssists]);

  if (homeGoals + awayGoals === 0) {
    return (
      <p className="lead">
        Resultattipset står på 0-0. Sett et tips med mål på <a className="tip-card-link" href="/kamper">kampoversikten</a>,
        så åpner scorer- og assist-valgene seg her.
      </p>
    );
  }

  return (
    <form action={formAction} className="scorer-form">
      <input type="hidden" name="matchId" value={match.id} />
      <input type="hidden" name="homeGoals" value={homeGoals} />
      <input type="hidden" name="awayGoals" value={awayGoals} />
      {prediction?.knockoutResolution ? (
        <PreservedKnockout resolution={prediction.knockoutResolution} />
      ) : null}
      {homeScorerList.map((id, idx) => (
        <input key={`hs-${idx}`} type="hidden" name="homeScorers" value={id} />
      ))}
      {awayScorerList.map((id, idx) => (
        <input key={`as-${idx}`} type="hidden" name="awayScorers" value={id} />
      ))}
      {homeAssistList.map((id, idx) => (
        <input key={`ha-${idx}`} type="hidden" name="homeAssists" value={id} />
      ))}
      {awayAssistList.map((id, idx) => (
        <input key={`aa-${idx}`} type="hidden" name="awayAssists" value={id} />
      ))}

      <div className="scorer-grid">
        <TeamSection
          team={match.homeTeam}
          squad={homeSquad}
          goals={homeGoals}
          scorers={homeScorers}
          setScorers={setHomeScorers}
          assists={homeAssists}
          setAssists={setHomeAssists}
        />
        <TeamSection
          team={match.awayTeam}
          squad={awaySquad}
          goals={awayGoals}
          scorers={awayScorers}
          setScorers={setAwayScorers}
          assists={awayAssists}
          setAssists={setAwayAssists}
        />
      </div>

      <div className="scorer-form-actions">
        <button className="btn-primary tip-submit" type="submit" disabled={pending} aria-live="polite">
          <TicketCheck className="h-4 w-4" aria-hidden="true" />
          {pending ? "Tipper..." : "Lagre bonustips"}
        </button>
      </div>
    </form>
  );
}

function PreservedKnockout({
  resolution,
}: {
  resolution: NonNullable<Prediction["knockoutResolution"]>;
}) {
  return (
    <>
      <input type="hidden" name="knockoutMethod" value={resolution.method} />
      <input type="hidden" name="knockoutWinner" value={resolution.winner} />
      {resolution.method === "extra_time" ? (
        <>
          <input type="hidden" name="extraTimeHomeGoals" value={resolution.homeGoals} />
          <input type="hidden" name="extraTimeAwayGoals" value={resolution.awayGoals} />
        </>
      ) : null}
    </>
  );
}

function TeamSection({
  team,
  squad,
  goals,
  scorers,
  setScorers,
  assists,
  setAssists,
}: {
  team: string;
  squad: TeamSquadPlayer[];
  goals: number;
  scorers: Counts;
  setScorers: (next: Counts) => void;
  assists: Counts;
  setAssists: (next: Counts) => void;
}) {
  const flag = teamFlagEmoji(team);

  if (goals === 0) {
    return (
      <section className="scorer-team">
        <header className="scorer-team-header">
          <span className="scorer-team-flag" aria-hidden="true">{flag}</span>
          <h3 className="scorer-team-name"><TeamLink teamName={team} /></h3>
          <span className="scorer-team-goals">0 mål</span>
        </header>
        <p className="lead">Ingen tippede mål — ingen valg her.</p>
      </section>
    );
  }

  if (!squad.length) {
    return (
      <section className="scorer-team">
        <header className="scorer-team-header">
          <span className="scorer-team-flag" aria-hidden="true">{flag}</span>
          <h3 className="scorer-team-name"><TeamLink teamName={team} /></h3>
          <span className="scorer-team-goals">{goals} mål</span>
        </header>
        <p className="lead">Tropp ikke tilgjengelig ennå.</p>
      </section>
    );
  }

  return (
    <section className="scorer-team">
      <header className="scorer-team-header">
        <span className="scorer-team-flag" aria-hidden="true">{flag}</span>
        <h3 className="scorer-team-name"><TeamLink teamName={team} /></h3>
        <span className="scorer-team-goals">{goals} mål</span>
      </header>

      <PickerBlock
        label="Scorere"
        squad={squad}
        counts={scorers}
        setCounts={setScorers}
        max={goals}
      />
      <PickerBlock
        label="Assister"
        squad={squad}
        counts={assists}
        setCounts={setAssists}
        max={goals}
      />
    </section>
  );
}

function PickerBlock({
  label,
  squad,
  counts,
  setCounts,
  max,
}: {
  label: string;
  squad: TeamSquadPlayer[];
  counts: Counts;
  setCounts: (next: Counts) => void;
  max: number;
}) {
  const total = totalCount(counts);
  const isComplete = total === max;
  const isOver = total > max;

  function setPlayerCount(id: string, next: number) {
    const value = Math.max(0, next);
    const updated: Counts = { ...counts };
    if (value === 0) delete updated[id];
    else updated[id] = value;
    setCounts(updated);
  }

  return (
    <div className="scorer-block">
      <div className="scorer-block-header">
        <span className="scorer-block-label">{label}</span>
        <span
          className={cx(
            "scorer-block-counter",
            isComplete && "scorer-block-counter-ok",
            isOver && "scorer-block-counter-warn",
          )}
        >
          {total}/{max}
        </span>
      </div>
      <ul className="scorer-list">
        {squad.map((player) => {
          const count = counts[player.id] ?? 0;
          const positionLabel = POSITION_LABELS[player.position] ?? "—";
          return (
            <li key={player.id} className={cx("scorer-row", count > 0 && "scorer-row-active")}>
              <span className="scorer-position">{positionLabel}</span>
              <span className="scorer-name">{player.name}</span>
              <div className="tip-stepper" role="group" aria-label={`${player.name} ${label.toLowerCase()}`}>
                <button
                  type="button"
                  className="tip-stepper-btn"
                  onClick={() => setPlayerCount(player.id, count - 1)}
                  aria-label={`Trekk fra ${player.name}`}
                  disabled={count === 0}
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="tip-stepper-value" aria-live="polite">{count}</span>
                <button
                  type="button"
                  className="tip-stepper-btn"
                  onClick={() => setPlayerCount(player.id, count + 1)}
                  aria-label={`Legg til ${player.name}`}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

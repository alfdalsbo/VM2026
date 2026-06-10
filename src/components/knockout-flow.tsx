import type { CSSProperties } from "react";

import { TeamLink } from "@/components/team-link";
import { displayMatchup, teamFlagEmoji } from "@/lib/display";
import { cx, formatOsloDateTime } from "@/lib/format";
import { resultSummary, type KnockoutFlowMatch, type KnockoutFlowRound } from "@/lib/tournament";

type BracketSide = "left" | "right";

type RoundSlice = {
  stage: KnockoutFlowRound["stage"];
  stageLabel: string;
  matches: KnockoutFlowMatch[];
};

export function KnockoutFlow({ rounds }: { rounds: KnockoutFlowRound[] }) {
  const finalRound = rounds.find((round) => round.stage === "final");
  const bronzeRound = rounds.find((round) => round.stage === "third_place");
  const treeRounds = rounds.filter((round) => round.stage !== "final" && round.stage !== "third_place");
  const splitRounds = treeRounds.map(splitRound);
  const leftRounds = splitRounds.map(({ round, left }) => ({ ...round, matches: left }));
  const rightRounds = splitRounds.map(({ round, right }) => ({ ...round, matches: right })).reverse();

  return (
    <section className="knockout-board" aria-label="Veien til finalen">
      <div className="knockout-board-heading">
        <p className="eyebrow">Utslagstreet</p>
        <h3>32 lag inn. Ett lag ut med overdreven verdighet.</h3>
        <p>Vinnerne trekkes inn mot finalen. Bronsekampen får sitt eget lille sidebord.</p>
      </div>

      <div className="knockout-scroll">
        <div className="knockout-tree">
          <BracketWing label="Øvre halvdel" rounds={leftRounds} side="left" />

          <div className="knockout-final-column" aria-label={finalRound?.stageLabel ?? "Finale"}>
            <div className="knockout-final-title">
              <span>Finale</span>
              <em>Kamp {finalRound?.matches[0]?.match.matchNumber ?? 104}</em>
            </div>
            {finalRound?.matches.map((item) => (
              <KnockoutCard key={item.match.id} item={item} variant="final" />
            ))}
          </div>

          <BracketWing label="Nedre halvdel" rounds={rightRounds} side="right" />
        </div>
      </div>

      {bronzeRound ? (
        <aside className="knockout-bronze" aria-label={bronzeRound.stageLabel}>
          <div>
            <p className="eyebrow">Sidegren</p>
            <h3>{bronzeRound.stageLabel}</h3>
          </div>
          <div className="knockout-bronze-matches">
            {bronzeRound.matches.map((item) => (
              <KnockoutCard key={item.match.id} item={item} variant="bronze" />
            ))}
          </div>
        </aside>
      ) : null}

      <KnockoutMobile rounds={rounds} />
    </section>
  );
}

const MOBILE_STAGE_ORDER: KnockoutFlowRound["stage"][] = [
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
  "third_place",
];

// Telefon-vennlig variant: rundene i rekkefølge (32-del → finale → bronse),
// hver runde som en kompakt vannrett sveipestripe i stedet for det brede treet.
function KnockoutMobile({ rounds }: { rounds: KnockoutFlowRound[] }) {
  const ordered = MOBILE_STAGE_ORDER.map((stage) => rounds.find((round) => round.stage === stage)).filter(
    (round): round is KnockoutFlowRound => Boolean(round),
  );

  return (
    <div className="knockout-mobile">
      {ordered.map((round) => (
        <section key={round.stage} className="knockout-mobile-round" aria-label={round.stageLabel}>
          <div className="knockout-mobile-round-head">
            <h4>{round.stageLabel}</h4>
            <span>{round.matches.length === 1 ? "1 kamp" : `${round.matches.length} kamper`}</span>
          </div>
          <div className="knockout-mobile-strip">
            {round.matches.map((item) => (
              <KnockoutCard key={item.match.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function splitRound(round: KnockoutFlowRound) {
  const midpoint = Math.ceil(round.matches.length / 2);
  return {
    round,
    left: round.matches.slice(0, midpoint),
    right: round.matches.slice(midpoint),
  };
}

function BracketWing({ label, rounds, side }: { label: string; rounds: RoundSlice[]; side: BracketSide }) {
  return (
    <div className={cx("knockout-wing-shell", `knockout-wing-shell-${side}`)}>
      <p className="knockout-wing-label">{label}</p>
      <div className={cx("knockout-wing", `knockout-wing-${side}`)}>
        {rounds.map((round) => (
          <RoundColumn key={`${side}-${round.stage}`} round={round} side={side} />
        ))}
      </div>
    </div>
  );
}

function RoundColumn({ round, side }: { round: RoundSlice; side: BracketSide }) {
  const style = { "--match-count": round.matches.length } as CSSProperties;

  return (
    <section className={cx("knockout-round", `knockout-round-${round.stage}`, `knockout-round-${side}`)} style={style}>
      <div className="knockout-round-title">
        <h4>{round.stageLabel}</h4>
        <span>{round.matches.length === 1 ? "1 kamp" : `${round.matches.length} kamper`}</span>
      </div>
      <div className="knockout-round-matches">
        {round.matches.map((item) => (
          <KnockoutCard key={item.match.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function KnockoutCard({
  item,
  variant = "default",
}: {
  item: KnockoutFlowMatch;
  variant?: "default" | "final" | "bronze";
}) {
  const { match } = item;
  const sourceLabel = sourceReferenceLabel(item);

  return (
    <article
      className={cx("knockout-card", variant !== "default" && `knockout-card-${variant}`)}
      aria-label={`Kamp ${match.matchNumber}: ${displayMatchup(match)}`}
    >
      <p className="knockout-card-meta">
        <span>Kamp {match.matchNumber}</span>
        <span>{formatOsloDateTime(match.kickoffAt)}</span>
      </p>
      <div className="knockout-teams">
        <KnockoutTeam teamName={match.homeTeam} />
        <strong>{resultSummary(match)}</strong>
        <KnockoutTeam teamName={match.awayTeam} />
      </div>
      <div className="knockout-card-foot">
        {sourceLabel ? <span>{sourceLabel}</span> : <span>{match.city}</span>}
        <RouteLabel item={item} />
      </div>
    </article>
  );
}

function KnockoutTeam({ teamName }: { teamName: string }) {
  const flag = teamFlagEmoji(teamName);

  return (
    <span className="knockout-team">
      <span className="knockout-team-flag" aria-hidden="true">
        {flag}
      </span>
      <TeamLink className="knockout-team-name" teamName={teamName} />
    </span>
  );
}

function RouteLabel({ item }: { item: KnockoutFlowMatch }) {
  if (item.winner) {
    return (
      <em>
        Videre: <TeamLink teamName={item.winner} />
      </em>
    );
  }

  if (item.nextReferences.length) {
    return <em>{item.nextReferences.map((reference) => reference.label).join(" / ")}</em>;
  }

  return <em>{item.match.stage === "final" ? "Venter på kroning" : "Venter på fasit"}</em>;
}

function sourceReferenceLabel(item: KnockoutFlowMatch) {
  const matchNumbers = [...new Set(item.sourceReferences.map((reference) => reference.matchNumber))];
  if (!matchNumbers.length) return null;
  if (matchNumbers.length === 1) return `Fra kamp ${matchNumbers[0]}`;
  return `Fra kamp ${matchNumbers.slice(0, -1).join(", ")} og ${matchNumbers.at(-1)}`;
}

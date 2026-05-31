"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Minus, Plus, TicketCheck } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { savePredictionAction, type SavePredictionState } from "@/app/actions";
import {
  displayStageOrGroup,
  displayTeamName,
  formatCompactMatchStatus,
  teamFlagEmoji,
} from "@/lib/display";
import { cx, formatScore } from "@/lib/format";
import {
  getPrediction,
  isKnockoutMatch,
  isMatchLocked,
  scorePrediction,
} from "@/lib/scoring";
import { getBroadcastForMatch } from "@/lib/tournament";
import type { AppState, Player, Prediction, TeamSquadPlayer, WorldCupMatch } from "@/lib/types";

const timeFormatter = new Intl.DateTimeFormat("nb-NO", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Oslo",
});

function broadcastTone(channel: string | undefined): "nrk" | "tv2" | null {
  if (!channel) return null;
  const value = channel.toLowerCase();
  if (value.includes("nrk")) return "nrk";
  if (value.includes("tv 2") || value.includes("tv2")) return "tv2";
  return null;
}

function ChannelBadge({ channel, service }: { channel: string; service?: string }) {
  const tone = broadcastTone(channel);
  const title = service ? `${channel} · ${service}` : channel;

  if (tone === "nrk") {
    return (
      <span className="tip-card-channel tip-card-channel-nrk" title={title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/nrk.svg"
          alt=""
          className="tip-card-channel-logo tip-card-channel-logo-nrk"
        />
        <span className="sr-only">{channel}</span>
      </span>
    );
  }

  if (tone === "tv2") {
    return (
      <span className="tip-card-channel tip-card-channel-tv2" title={title}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/tv2.svg"
          alt=""
          className="tip-card-channel-logo tip-card-channel-logo-tv2"
        />
        <span className="sr-only">{channel}</span>
      </span>
    );
  }

  return (
    <span className="tip-card-channel" title={title}>
      {channel}
    </span>
  );
}

export function MatchTipCard({
  match,
  player,
  state,
}: {
  match: WorldCupMatch;
  player: Player;
  state: AppState;
}) {
  const prediction = getPrediction(state, player.id, match.id);
  const locked = isMatchLocked(match);
  const status = formatCompactMatchStatus(match);
  const stageLabel = displayStageOrGroup(match);
  const broadcast = getBroadcastForMatch(match);
  const time = timeFormatter.format(new Date(match.kickoffAt));
  const homeSquad = state.teamProfiles.find((profile) => profile.teamName === match.homeTeam)?.squad ?? [];
  const awaySquad = state.teamProfiles.find((profile) => profile.teamName === match.awayTeam)?.squad ?? [];

  return (
    <article id={match.id} className={cx("tip-card", `tip-card-${status.tone}`, locked && "tip-card-locked")}>
      <div className="tip-card-header">
        <div className="tip-card-header-start">
          <span className="tip-card-time">{time}</span>
          {broadcast ? (
            <ChannelBadge channel={broadcast.channel} service={broadcast.service} />
          ) : null}
          {status.tone !== "scheduled" ? (
            <span className={`tip-card-status status-${status.tone}`}>{status.label}</span>
          ) : null}
        </div>
        <Link href={`/kamp/${match.id}`} className="tip-card-link">Kampkort</Link>
      </div>
      <div className="tip-card-body">
        <span className="tip-card-stage">{stageLabel}</span>
        {locked ? (
          <LockedView
            match={match}
            prediction={prediction}
            state={state}
            homeSquad={homeSquad}
            awaySquad={awaySquad}
          />
        ) : (
          <EditableForm match={match} prediction={prediction} />
        )}
      </div>
    </article>
  );
}

function TeamRow({
  team,
  value,
  onChange,
}: {
  team: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const display = displayTeamName(team);
  const flag = teamFlagEmoji(team);
  return (
    <div className="tip-team-row">
      <span className="tip-team-name">
        {flag ? (
          <span className="tip-team-flag" aria-hidden="true">{flag}</span>
        ) : null}
        {display}
      </span>
      <div className="tip-stepper" role="group" aria-label={`${display} mål`}>
        <button
          type="button"
          className="tip-stepper-btn"
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label={`Trekk fra ${display}`}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className="tip-stepper-value" aria-live="polite">{value}</span>
        <button
          type="button"
          className="tip-stepper-btn"
          onClick={() => onChange(Math.min(30, value + 1))}
          aria-label={`Legg til ${display}`}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const INITIAL_SAVE_STATE: SavePredictionState = {};

function EditableForm({
  match,
  prediction,
}: {
  match: WorldCupMatch;
  prediction: Prediction | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [homeGoals, setHomeGoals] = useState(prediction?.homeGoals ?? 0);
  const [awayGoals, setAwayGoals] = useState(prediction?.awayGoals ?? 0);
  const [method, setMethod] = useState(prediction?.knockoutResolution?.method ?? "");
  const [saveState, formAction, pending] = useActionState(savePredictionAction, INITIAL_SAVE_STATE);
  const isDraw = homeGoals === awayGoals;
  const needsKnockoutResolution = isKnockoutMatch(match) && isDraw;
  const extraTimeResolution =
    prediction?.knockoutResolution?.method === "extra_time" ? prediction.knockoutResolution : null;
  const homeTeam = displayTeamName(match.homeTeam);
  const awayTeam = displayTeamName(match.awayTeam);
  const preservedHomeScorers = (prediction?.homeScorers ?? []).slice(0, homeGoals);
  const preservedAwayScorers = (prediction?.awayScorers ?? []).slice(0, awayGoals);
  const preservedHomeAssists = (prediction?.homeAssists ?? []).slice(0, homeGoals);
  const preservedAwayAssists = (prediction?.awayAssists ?? []).slice(0, awayGoals);

  useEffect(() => {
    if (!saveState.status && !saveState.error) return;
    const key = saveState.error ? "error" : "status";
    const value = saveState.error ?? saveState.status ?? "";
    router.replace(`${pathname}?${key}=${encodeURIComponent(value)}`, { scroll: false });
  }, [saveState, router, pathname]);

  return (
    <form action={formAction} className="tip-form">
      <input type="hidden" name="matchId" value={match.id} />
      <input type="hidden" name="homeGoals" value={homeGoals} />
      <input type="hidden" name="awayGoals" value={awayGoals} />
      {preservedHomeScorers.map((id, idx) => (
        <input key={`hs-${idx}`} type="hidden" name="homeScorers" value={id} />
      ))}
      {preservedAwayScorers.map((id, idx) => (
        <input key={`as-${idx}`} type="hidden" name="awayScorers" value={id} />
      ))}
      {preservedHomeAssists.map((id, idx) => (
        <input key={`ha-${idx}`} type="hidden" name="homeAssists" value={id} />
      ))}
      {preservedAwayAssists.map((id, idx) => (
        <input key={`aa-${idx}`} type="hidden" name="awayAssists" value={id} />
      ))}
      <div className="tip-teams">
        <TeamRow team={match.homeTeam} value={homeGoals} onChange={setHomeGoals} />
        <TeamRow team={match.awayTeam} value={awayGoals} onChange={setAwayGoals} />
      </div>

      {needsKnockoutResolution ? (
        <div className="tip-knockout">
          <label>
            <span>Avgjørelse</span>
            <select
              name="knockoutMethod"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              required
            >
              <option value="">Velg</option>
              <option value="extra_time">Vinner etter ekstraomganger</option>
              <option value="penalties">Vinner på straffer</option>
            </select>
          </label>
          {method === "extra_time" ? (
            <>
              <label>
                <span>{homeTeam} etter ekstra</span>
                <input
                  aria-label={`${homeTeam} mål etter ekstraomganger`}
                  inputMode="numeric"
                  min={0}
                  max={30}
                  name="extraTimeHomeGoals"
                  required
                  type="number"
                  defaultValue={extraTimeResolution?.homeGoals ?? ""}
                />
              </label>
              <label>
                <span>{awayTeam} etter ekstra</span>
                <input
                  aria-label={`${awayTeam} mål etter ekstraomganger`}
                  inputMode="numeric"
                  min={0}
                  max={30}
                  name="extraTimeAwayGoals"
                  required
                  type="number"
                  defaultValue={extraTimeResolution?.awayGoals ?? ""}
                />
              </label>
            </>
          ) : null}
          {method ? (
            <label>
              <span>Videre</span>
              <select
                name="knockoutWinner"
                defaultValue={prediction?.knockoutResolution?.winner ?? ""}
                required
              >
                <option value="">Velg lag</option>
                <option value="home">{homeTeam}</option>
                <option value="away">{awayTeam}</option>
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="tip-form-actions">
        <TipSubmitButton hasPrediction={Boolean(prediction)} pending={pending} />
      </div>
    </form>
  );
}

function TipSubmitButton({ hasPrediction, pending }: { hasPrediction: boolean; pending: boolean }) {
  const label = hasPrediction ? "Oppdater" : "Tipp";
  return (
    <button className="btn-primary tip-submit" type="submit" disabled={pending} aria-live="polite">
      <TicketCheck className="h-4 w-4" aria-hidden="true" />
      {pending ? "Tipper..." : label}
    </button>
  );
}

function LockedView({
  match,
  prediction,
  state,
  homeSquad,
  awaySquad,
}: {
  match: WorldCupMatch;
  prediction: Prediction | null;
  state: AppState;
  homeSquad: TeamSquadPlayer[];
  awaySquad: TeamSquadPlayer[];
}) {
  const score = scorePrediction(match, prediction, state);
  const homeFlag = teamFlagEmoji(match.homeTeam);
  const awayFlag = teamFlagEmoji(match.awayTeam);
  const hasResult = Boolean(match.result);
  const isLive = match.status === "live" || match.status === "halftime";
  const resolveName = (squad: TeamSquadPlayer[], id: string) => squad.find((p) => p.id === id)?.name ?? null;
  const scorerLine = [
    ...(prediction?.homeScorers ?? []).map((id) => resolveName(homeSquad, id)),
    ...(prediction?.awayScorers ?? []).map((id) => resolveName(awaySquad, id)),
  ]
    .filter((name): name is string => Boolean(name))
    .join(", ");
  const assistLine = [
    ...(prediction?.homeAssists ?? []).map((id) => resolveName(homeSquad, id)),
    ...(prediction?.awayAssists ?? []).map((id) => resolveName(awaySquad, id)),
  ]
    .filter((name): name is string => Boolean(name))
    .join(", ");

  return (
    <div className="tip-teams tip-teams-locked">
      <LockedTeamRow flag={homeFlag} name={displayTeamName(match.homeTeam)} predicted={prediction?.homeGoals} actual={match.result?.homeGoals} />
      <LockedTeamRow flag={awayFlag} name={displayTeamName(match.awayTeam)} predicted={prediction?.awayGoals} actual={match.result?.awayGoals} />
      {scorerLine || assistLine ? (
        <p className="tip-result-line">
          {scorerLine ? <>Scorere: <strong>{scorerLine}</strong></> : null}
          {scorerLine && assistLine ? " · " : null}
          {assistLine ? <>Assister: <strong>{assistLine}</strong></> : null}
        </p>
      ) : null}
      {prediction && hasResult ? (
        <p className="tip-result-line">
          {isLive ? "Resultattips hvis det blir slik:" : "Resultattips:"} <strong>{score.total}</strong>
          {" "}· utfall {score.outcome}, målforskjell {score.goalDifference}, eksakt {score.exactResult}
          {score.bonus ? ` · bonustips ${score.bonus}` : ""}
        </p>
      ) : !prediction ? (
        <p className="tip-result-line tip-result-line-muted">
          Ingen kupong levert.{hasResult ? ` Resultat ${formatScore(match.result?.homeGoals, match.result?.awayGoals)}.` : ""}
        </p>
      ) : null}
    </div>
  );
}

function LockedTeamRow({
  flag,
  name,
  predicted,
  actual,
}: {
  flag: string;
  name: string;
  predicted: number | null | undefined;
  actual: number | null | undefined;
}) {
  const predictionLabel = predicted ?? "-";
  return (
    <div className="tip-team-row tip-team-row-locked">
      <span className="tip-team-name">
        {flag ? <span className="tip-team-flag" aria-hidden="true">{flag}</span> : null}
        {name}
      </span>
      <span className="tip-locked-scores">
        {actual !== null && actual !== undefined ? (
          <span className="tip-locked-actual">{actual}</span>
        ) : null}
        <span className="tip-locked-tip" title="Ditt tips">{predictionLabel}</span>
      </span>
    </div>
  );
}

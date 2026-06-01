"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { saveResultPredictionAction, type SaveResultPredictionInput } from "@/app/actions";
import { BonusAutofillButton } from "@/components/bonus-autofill-button";
import { LivePotForm } from "@/components/live-pot-form";
import { MatchNostalgiaNote } from "@/components/nostalgia";
import { ScorerAssistPicker } from "@/components/scorer-assist-picker";
import { TeamLink } from "@/components/team-link";
import {
  displayStageOrGroup,
  displayTeamName,
  formatCompactMatchStatus,
  teamFlagEmoji,
} from "@/lib/display";
import { footballCopy } from "@/lib/football-jargon";
import { cx } from "@/lib/format";
import { hasUnresolvedKnockoutTeams } from "@/lib/knockout-placeholders";
import {
  countYellowCards,
  formatLiveRedCardsPrediction,
  getLivePotTip,
  isLivePotOpen,
} from "@/lib/live-pot";
import {
  getPrediction,
  getPredictionOrDefault,
  inferPredictionOutcome,
  isKnockoutMatch,
  isMatchLocked,
  scorePrediction,
} from "@/lib/scoring";
import { getBroadcastForMatch } from "@/lib/tournament";
import type { AppState, KnockoutPredictionResolution, Player, Prediction, TeamSquadPlayer, WorldCupMatch } from "@/lib/types";
import { getMatchNostalgia } from "@/lib/world-cup-nostalgia";

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

function predictionTimestamp(prediction: Prediction | null) {
  if (!prediction) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(prediction.updatedAt);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
}

function newestPrediction(stored: Prediction | null, local: Prediction | null) {
  return predictionTimestamp(local) >= predictionTimestamp(stored) ? local : stored;
}

export function MatchTipCard({
  match,
  player,
  state,
  bonusNext = "/kamper",
  showDetailLink = true,
  showNostalgiaNote = true,
}: {
  match: WorldCupMatch;
  player: Player;
  state: AppState;
  bonusNext?: string;
  showDetailLink?: boolean;
  showNostalgiaNote?: boolean;
}) {
  const storedPrediction = getPrediction(state, player.id, match.id);
  const [localPrediction, setLocalPrediction] = useState<Prediction | null>(null);
  const optimisticPrediction = newestPrediction(storedPrediction, localPrediction);
  const displayedPrediction = optimisticPrediction ?? getPredictionOrDefault(state, player.id, match.id);
  const locked = isMatchLocked(match);
  const knockoutPending = hasUnresolvedKnockoutTeams(match);
  const status = formatCompactMatchStatus(match);
  const stageLabel = displayStageOrGroup(match);
  const broadcast = getBroadcastForMatch(match);
  const nostalgia = getMatchNostalgia(match);
  const time = timeFormatter.format(new Date(match.kickoffAt));
  const homeSquad = state.teamProfiles.find((profile) => profile.teamName === match.homeTeam)?.squad ?? [];
  const awaySquad = state.teamProfiles.find((profile) => profile.teamName === match.awayTeam)?.squad ?? [];

  return (
    <article id={match.id} className={cx("tip-card", `tip-card-${status.tone}`, (locked || knockoutPending) && "tip-card-locked")}>
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
        {showDetailLink ? <Link href={`/kamp/${match.id}`} className="tip-card-link">Kampkort</Link> : null}
      </div>
      <div className="tip-card-body">
        <span className="tip-card-stage">{stageLabel}</span>
        {showNostalgiaNote ? <MatchNostalgiaNote moment={nostalgia} /> : null}
        {locked ? (
          <>
            <LockedView
              match={match}
              prediction={displayedPrediction}
              state={state}
              homeSquad={homeSquad}
              awaySquad={awaySquad}
            />
            <MatchBonusPanel
              match={match}
              player={player}
              state={state}
              prediction={storedPrediction}
              homeSquad={homeSquad}
              awaySquad={awaySquad}
              next={bonusNext}
              canEdit={false}
            />
          </>
        ) : knockoutPending ? (
          <PendingKnockoutView match={match} />
        ) : (
          <>
            <EditableForm
              match={match}
              playerId={player.id}
              prediction={optimisticPrediction}
              onSavedPrediction={setLocalPrediction}
            />
            <MatchBonusPanel
              match={match}
              player={player}
              state={state}
              prediction={optimisticPrediction}
              homeSquad={homeSquad}
              awaySquad={awaySquad}
              next={bonusNext}
              canEdit
            />
          </>
        )}
      </div>
    </article>
  );
}

function PendingKnockoutView({ match }: { match: WorldCupMatch }) {
  return (
    <div className="tip-teams tip-teams-locked">
      <PendingTeamRow flag={teamFlagEmoji(match.homeTeam)} teamName={match.homeTeam} />
      <PendingTeamRow flag={teamFlagEmoji(match.awayTeam)} teamName={match.awayTeam} />
      <p className="tip-result-line tip-result-line-muted">{footballCopy.knockoutPending}</p>
    </div>
  );
}

function PendingTeamRow({ flag, teamName }: { flag: string; teamName: string }) {
  return (
    <div className="tip-team-row tip-team-row-locked">
      <span className="tip-team-name">
        {flag ? <span className="tip-team-flag" aria-hidden="true">{flag}</span> : null}
        <TeamLink teamName={teamName} />
      </span>
      <span className="tip-locked-scores">
        <span className="tip-locked-tip">Venter</span>
      </span>
    </div>
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
        <TeamLink teamName={team} />
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

type SaveSignal = "saved" | "saving" | "needs-input" | "error";
type SaveDisplay = {
  key: string;
  signal: SaveSignal;
  message: string;
};

function saveKey(input: SaveResultPredictionInput) {
  return JSON.stringify(input);
}

function EditableForm({
  match,
  playerId,
  prediction,
  onSavedPrediction,
}: {
  match: WorldCupMatch;
  playerId: string;
  prediction: Prediction | null;
  onSavedPrediction: (prediction: Prediction) => void;
}) {
  const [homeGoals, setHomeGoals] = useState(prediction?.homeGoals ?? 0);
  const [awayGoals, setAwayGoals] = useState(prediction?.awayGoals ?? 0);
  const [method, setMethod] = useState(prediction?.knockoutResolution?.method ?? "");
  const [winner, setWinner] = useState<"home" | "away" | "">(prediction?.knockoutResolution?.winner ?? "");
  const [extraTimeHomeGoals, setExtraTimeHomeGoals] = useState<number | "">(
    prediction?.knockoutResolution?.method === "extra_time" ? prediction.knockoutResolution.homeGoals : "",
  );
  const [extraTimeAwayGoals, setExtraTimeAwayGoals] = useState<number | "">(
    prediction?.knockoutResolution?.method === "extra_time" ? prediction.knockoutResolution.awayGoals : "",
  );
  const [saveDisplay, setSaveDisplay] = useState<SaveDisplay | null>(null);
  const [, startTransition] = useTransition();
  const initialInput = buildSaveInput({
    match,
    homeGoals: prediction?.homeGoals ?? 0,
    awayGoals: prediction?.awayGoals ?? 0,
    method: prediction?.knockoutResolution?.method ?? "",
    winner: prediction?.knockoutResolution?.winner ?? "",
    extraTimeHomeGoals: prediction?.knockoutResolution?.method === "extra_time" ? prediction.knockoutResolution.homeGoals : "",
    extraTimeAwayGoals: prediction?.knockoutResolution?.method === "extra_time" ? prediction.knockoutResolution.awayGoals : "",
  });
  const initialKey = "error" in initialInput ? "" : saveKey(initialInput.input);
  const [lastSavedKey, setLastSavedKey] = useState(initialKey);
  const latestRequest = useRef(0);
  const isDraw = homeGoals === awayGoals;
  const needsKnockoutResolution = isKnockoutMatch(match) && isDraw;
  const homeTeam = displayTeamName(match.homeTeam);
  const awayTeam = displayTeamName(match.awayTeam);
  const prepared = buildSaveInput({
    match,
    homeGoals,
    awayGoals,
    method,
    winner,
    extraTimeHomeGoals,
    extraTimeAwayGoals,
  });
  const currentKey = "error" in prepared ? "" : saveKey(prepared.input);
  const displayedSignal = getSaveDisplay({
    prepared,
    currentKey,
    lastSavedKey,
    saveDisplay,
    hasStoredPrediction: Boolean(prediction),
  });

  useEffect(() => {
    if ("error" in prepared) return;

    const input = prepared.input;
    const key = saveKey(input);
    if (key === lastSavedKey) return;

    const timeout = window.setTimeout(() => {
      const requestId = latestRequest.current + 1;
      latestRequest.current = requestId;
      startTransition(() => {
        void saveResultPredictionAction(input).then((result) => {
          if (latestRequest.current !== requestId) return;
          if (result.error) {
            setSaveDisplay({ key, signal: "error", message: result.error });
            return;
          }
          setLastSavedKey(key);
          setSaveDisplay({ key, signal: "saved", message: "Registrert" });
          onSavedPrediction(buildOptimisticPrediction({
            existing: prediction,
            input,
            playerId,
            updatedAt: result.updatedAt ?? new Date().toISOString(),
          }));
        });
      });
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [lastSavedKey, onSavedPrediction, playerId, prediction, prepared, startTransition]);

  return (
    <div className="tip-form">
      <div className="tip-teams">
        <TeamRow team={match.homeTeam} value={homeGoals} onChange={setHomeGoals} />
        <TeamRow team={match.awayTeam} value={awayGoals} onChange={setAwayGoals} />
      </div>

      {needsKnockoutResolution ? (
        <div className="tip-knockout">
          <label>
            <span>Avgjørelse</span>
            <select
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
                  required
                  type="number"
                  value={extraTimeHomeGoals}
                  onChange={(event) => setExtraTimeHomeGoals(event.target.value === "" ? "" : Number(event.target.value))}
                />
              </label>
              <label>
                <span>{awayTeam} etter ekstra</span>
                <input
                  aria-label={`${awayTeam} mål etter ekstraomganger`}
                  inputMode="numeric"
                  min={0}
                  max={30}
                  required
                  type="number"
                  value={extraTimeAwayGoals}
                  onChange={(event) => setExtraTimeAwayGoals(event.target.value === "" ? "" : Number(event.target.value))}
                />
              </label>
            </>
          ) : null}
          {method ? (
            <label>
              <span>Videre</span>
              <select
                value={winner}
                onChange={(event) => setWinner(sideValue(event.target.value))}
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

      <SaveSignal signal={displayedSignal.signal} message={displayedSignal.message} />
    </div>
  );
}

function buildOptimisticPrediction({
  existing,
  input,
  playerId,
  updatedAt,
}: {
  existing: Prediction | null;
  input: SaveResultPredictionInput;
  playerId: string;
  updatedAt: string;
}): Prediction {
  return {
    playerId,
    matchId: input.matchId,
    homeGoals: input.homeGoals,
    awayGoals: input.awayGoals,
    outcome: inferPredictionOutcome(input.homeGoals, input.awayGoals),
    knockoutResolution: knockoutResolutionFromInput(input),
    homeScorers: (existing?.homeScorers ?? []).slice(0, input.homeGoals),
    awayScorers: (existing?.awayScorers ?? []).slice(0, input.awayGoals),
    homeAssists: (existing?.homeAssists ?? []).slice(0, input.homeGoals),
    awayAssists: (existing?.awayAssists ?? []).slice(0, input.awayGoals),
    updatedAt,
  };
}

function knockoutResolutionFromInput(input: SaveResultPredictionInput): KnockoutPredictionResolution | null {
  if (input.homeGoals !== input.awayGoals) return null;
  if (input.knockoutMethod === "penalties" && input.knockoutWinner) {
    return { method: "penalties", winner: input.knockoutWinner };
  }
  if (
    input.knockoutMethod === "extra_time" &&
    input.knockoutWinner &&
    typeof input.extraTimeHomeGoals === "number" &&
    typeof input.extraTimeAwayGoals === "number"
  ) {
    return {
      method: "extra_time",
      winner: input.knockoutWinner,
      homeGoals: input.extraTimeHomeGoals,
      awayGoals: input.extraTimeAwayGoals,
    };
  }
  return null;
}

function MatchBonusPanel({
  match,
  player,
  state,
  prediction,
  homeSquad,
  awaySquad,
  next,
  canEdit,
}: {
  match: WorldCupMatch;
  player: Player;
  state: AppState;
  prediction: Prediction | null;
  homeSquad: TeamSquadPlayer[];
  awaySquad: TeamSquadPlayer[];
  next: string;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const liveTip = getLivePotTip(state, player.id, match.id);
  const currentYellowCards = countYellowCards(state.matchEvents, match.id);
  const cardOpen = canEdit && isLivePotOpen(match);
  const goals = (prediction?.homeGoals ?? 0) + (prediction?.awayGoals ?? 0);
  const playerSlotsMax = goals * 2;
  const playerSlotsUsed =
    (prediction?.homeScorers?.length ?? 0) +
    (prediction?.awayScorers?.length ?? 0) +
    (prediction?.homeAssists?.length ?? 0) +
    (prediction?.awayAssists?.length ?? 0);
  const playerStatus = playerSlotsMax > 0 ? `${playerSlotsUsed}/${playerSlotsMax} spillervalg` : "0-0: ingen spillervalg";
  const cardStatus = liveTip
    ? `${liveTip.yellowCardsTotal} gule · ${formatLiveRedCardsPrediction(liveTip.redCardsTotal)}`
    : "kort ikke satt";
  const hasVisibleBonus = canEdit || playerSlotsUsed > 0 || Boolean(liveTip);

  if (!hasVisibleBonus) return null;

  return (
    <section className={cx("tip-bonus", open && "tip-bonus-open")}>
      <div className="tip-bonus-summary">
        <div className="tip-bonus-copy">
          <span className="tip-bonus-label">Bonustips</span>
          <span>{playerStatus}</span>
          <span>{cardStatus}</span>
        </div>
        <div className="tip-bonus-actions">
          {canEdit ? <BonusAutofillButton matchId={match.id} next={next} compact label="Autofyll bonus" /> : null}
          <button
            type="button"
            className="btn-secondary tip-bonus-toggle"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
            {open ? "Lukk bonus" : "Åpne bonus"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="tip-bonus-detail">
          <section className="tip-bonus-section">
            <header>
              <p className="eyebrow">Mine spillere</p>
              <h3>Scorere og assister</h3>
            </header>
            {canEdit ? (
              <ScorerAssistPicker
                match={match}
                prediction={prediction}
                homeSquad={homeSquad}
                awaySquad={awaySquad}
              />
            ) : (
              <p className="lead">
                {playerSlotsUsed > 0 ? `${playerSlotsUsed} spillervalg er låst i dommerboka.` : "Ingen scorer- eller assistbonus registrert."}
              </p>
            )}
          </section>

          <section className="tip-bonus-section">
            <header>
              <p className="eyebrow">Kortbonus</p>
              <h3>Gule og røde kort</h3>
            </header>
            {cardOpen ? (
              <LivePotForm match={match} tip={liveTip} currentYellowCards={currentYellowCards} />
            ) : liveTip ? (
              <p className="lead">
                {liveTip.yellowCardsTotal} gule · {formatLiveRedCardsPrediction(liveTip.redCardsTotal)}.
              </p>
            ) : (
              <p className="lead">{canEdit ? "Kortbonusen er ikke notert ennå." : "Ingen kortbonus registrert."}</p>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

function sideValue(value: string): "home" | "away" | "" {
  return value === "home" || value === "away" ? value : "";
}

function buildSaveInput({
  match,
  homeGoals,
  awayGoals,
  method,
  winner,
  extraTimeHomeGoals,
  extraTimeAwayGoals,
}: {
  match: WorldCupMatch;
  homeGoals: number;
  awayGoals: number;
  method: string;
  winner: "home" | "away" | "";
  extraTimeHomeGoals: number | "";
  extraTimeAwayGoals: number | "";
}): { input: SaveResultPredictionInput; error?: never } | { input?: never; error: string } {
  const input: SaveResultPredictionInput = {
    matchId: match.id,
    homeGoals,
    awayGoals,
  };
  const needsKnockoutResolution = isKnockoutMatch(match) && homeGoals === awayGoals;

  if (!needsKnockoutResolution) return { input };
  if (!method) return { error: "Velg avgjørelse" };
  if (!winner) return { error: "Velg hvem som går videre" };
  input.knockoutMethod = method;
  input.knockoutWinner = winner;

  if (method === "extra_time") {
    if (extraTimeHomeGoals === "" || extraTimeAwayGoals === "") return { error: "Skriv stillingen etter ekstra" };
    input.extraTimeHomeGoals = extraTimeHomeGoals;
    input.extraTimeAwayGoals = extraTimeAwayGoals;
  }

  return { input };
}

function getSaveDisplay({
  prepared,
  currentKey,
  lastSavedKey,
  saveDisplay,
  hasStoredPrediction,
}: {
  prepared: ReturnType<typeof buildSaveInput>;
  currentKey: string;
  lastSavedKey: string;
  saveDisplay: SaveDisplay | null;
  hasStoredPrediction: boolean;
}): { signal: SaveSignal; message: string } {
  if (prepared.error) return { signal: "needs-input", message: prepared.error };
  if (saveDisplay?.key === currentKey && saveDisplay.signal === "error") {
    return { signal: "error", message: saveDisplay.message };
  }
  if (currentKey !== lastSavedKey) return { signal: "saving", message: "Lagrer..." };
  if (saveDisplay?.key === currentKey && saveDisplay.signal === "saved") {
    return { signal: "saved", message: saveDisplay.message };
  }
  return { signal: "saved", message: hasStoredPrediction ? "Registrert" : "0-0 står klart" };
}

function SaveSignal({ signal, message }: { signal: SaveSignal; message: string }) {
  const ok = signal === "saved";
  const error = signal === "error";
  return (
    <div className={cx("tip-save-signal", ok && "tip-save-signal-ok", error && "tip-save-signal-error")} aria-live="polite">
      {ok ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <AlertCircle className="h-4 w-4" aria-hidden="true" />}
      <span>{message}</span>
    </div>
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
      <LockedTeamRow flag={homeFlag} teamName={match.homeTeam} predicted={prediction?.homeGoals} actual={match.result?.homeGoals} />
      <LockedTeamRow flag={awayFlag} teamName={match.awayTeam} predicted={prediction?.awayGoals} actual={match.result?.awayGoals} />
      {scorerLine || assistLine ? (
        <p className="tip-result-line">
          {scorerLine ? <>Scorere: <strong>{scorerLine}</strong></> : null}
          {scorerLine && assistLine ? " · " : null}
          {assistLine ? <>Assister: <strong>{assistLine}</strong></> : null}
        </p>
      ) : null}
      {hasResult ? (
        <p className="tip-result-line">
          {isLive ? "Resultattips hvis det blir slik:" : "Resultattips:"} <strong>{score.total}</strong>
          {" "}· utfall {score.outcome}, eksakt {score.exactResult}
          {score.bonus ? ` · bonustips ${score.bonus}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function LockedTeamRow({
  flag,
  teamName,
  predicted,
  actual,
}: {
  flag: string;
  teamName: string;
  predicted: number | null | undefined;
  actual: number | null | undefined;
}) {
  const predictionLabel = predicted ?? "-";
  return (
    <div className="tip-team-row tip-team-row-locked">
      <span className="tip-team-name">
        {flag ? <span className="tip-team-flag" aria-hidden="true">{flag}</span> : null}
        <TeamLink teamName={teamName} />
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

"use client";

import { AlertCircle, CheckCircle2, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { saveLivePotTipAction, type SaveLivePotTipInput } from "@/app/actions";
import { TeamLink } from "@/components/team-link";
import { displayTeamName } from "@/lib/display";
import { cx } from "@/lib/format";
import { getLivePotCardTotals, LIVE_POT_MAX_RED_CARDS, LIVE_POT_MAX_YELLOW_CARDS } from "@/lib/live-pot";
import type { LivePotTip, WorldCupMatch } from "@/lib/types";

type CardDraft = {
  homeYellowCardsTotal: number;
  awayYellowCardsTotal: number;
  homeRedCardsTotal: number;
  awayRedCardsTotal: number;
};

type SaveSignalName = "saved" | "saving" | "error";
type SaveDisplay = {
  key: string;
  signal: SaveSignalName;
  message: string;
};

export function LivePotForm({
  match,
  tip,
  currentYellowCards,
}: {
  match: WorldCupMatch;
  tip: LivePotTip | null;
  currentYellowCards: number;
}) {
  const router = useRouter();
  const [cards, setCards] = useState<CardDraft>(() => initialCards(tip, currentYellowCards));
  const input = useMemo(
    () =>
      ({
        matchId: match.id,
        ...cards,
      }) satisfies SaveLivePotTipInput,
    [cards, match.id],
  );
  const currentKey = saveKey(input);
  const [lastSavedKey, setLastSavedKey] = useState(currentKey);
  const [saveDisplay, setSaveDisplay] = useState<SaveDisplay | null>(null);
  const latestRequest = useRef(0);
  const [, startTransition] = useTransition();
  const yellowTotal = cards.homeYellowCardsTotal + cards.awayYellowCardsTotal;
  const redTotal = cards.homeRedCardsTotal + cards.awayRedCardsTotal;
  const displayedSignal = getDisplay({
    currentKey,
    lastSavedKey,
    saveDisplay,
    hasStoredTip: Boolean(tip),
  });

  useEffect(() => {
    if (currentKey === lastSavedKey) return;

    const key = currentKey;
    const timeout = window.setTimeout(() => {
      const requestId = latestRequest.current + 1;
      latestRequest.current = requestId;
      startTransition(() => {
        void saveLivePotTipAction(input).then((result) => {
          if (latestRequest.current !== requestId) return;
          if (result.error) {
            setSaveDisplay({ key, signal: "error", message: result.error });
            return;
          }
          setLastSavedKey(key);
          setSaveDisplay({ key, signal: "saved", message: "Kortbonus lagret" });
          router.refresh();
        });
      });
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [currentKey, input, lastSavedKey, router, startTransition]);

  function setCard(field: keyof CardDraft, next: number) {
    setCards((current) => normalizeCardDraft({ ...current, [field]: next }));
  }

  return (
    <div className="tip-form">
      <div className="tip-teams">
        <CardTeamRow
          team={match.homeTeam}
          yellow={cards.homeYellowCardsTotal}
          red={cards.homeRedCardsTotal}
          yellowTotal={yellowTotal}
          redTotal={redTotal}
          onYellowChange={(value) => setCard("homeYellowCardsTotal", value)}
          onRedChange={(value) => setCard("homeRedCardsTotal", value)}
        />
        <CardTeamRow
          team={match.awayTeam}
          yellow={cards.awayYellowCardsTotal}
          red={cards.awayRedCardsTotal}
          yellowTotal={yellowTotal}
          redTotal={redTotal}
          onYellowChange={(value) => setCard("awayYellowCardsTotal", value)}
          onRedChange={(value) => setCard("awayRedCardsTotal", value)}
        />
      </div>

      <SaveSignal signal={displayedSignal.signal} message={displayedSignal.message} />
    </div>
  );
}

function CardTeamRow({
  team,
  yellow,
  red,
  yellowTotal,
  redTotal,
  onYellowChange,
  onRedChange,
}: {
  team: string;
  yellow: number;
  red: number;
  yellowTotal: number;
  redTotal: number;
  onYellowChange: (value: number) => void;
  onRedChange: (value: number) => void;
}) {
  const label = displayTeamName(team);

  return (
    <div className="tip-team-row card-team-row">
      <span className="tip-team-name">
        <TeamLink teamName={team} />
      </span>
      <div className="card-bonus-controls">
        <CardStepper
          tone="yellow"
          label={`${label} gule kort`}
          value={yellow}
          onChange={onYellowChange}
          canIncrease={yellowTotal < LIVE_POT_MAX_YELLOW_CARDS}
        />
        <CardStepper
          tone="red"
          label={`${label} røde kort`}
          value={red}
          onChange={onRedChange}
          canIncrease={redTotal < LIVE_POT_MAX_RED_CARDS}
        />
      </div>
    </div>
  );
}

function CardStepper({
  tone,
  label,
  value,
  onChange,
  canIncrease,
}: {
  tone: "yellow" | "red";
  label: string;
  value: number;
  onChange: (value: number) => void;
  canIncrease: boolean;
}) {
  return (
    <div className="card-stepper">
      <span className={cx("bonus-card-chip", tone === "yellow" ? "bonus-card-chip-yellow" : "bonus-card-chip-red")} aria-hidden="true" />
      <div className="tip-stepper" role="group" aria-label={label}>
        <button
          type="button"
          className="tip-stepper-btn"
          onClick={() => onChange(value - 1)}
          aria-label={`Trekk fra ${label}`}
          disabled={value === 0}
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className={cx("tip-stepper-value", tone === "red" && value > 0 && "live-pot-red-value")} aria-live="polite">{value}</span>
        <button
          type="button"
          className="tip-stepper-btn"
          onClick={() => onChange(value + 1)}
          aria-label={`Legg til ${label}`}
          disabled={!canIncrease}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function initialCards(tip: LivePotTip | null, currentYellowCards: number): CardDraft {
  if (tip) {
    const totals = getLivePotCardTotals(tip);
    if (totals.homeYellowCardsTotal !== null && totals.awayYellowCardsTotal !== null) {
      return normalizeCardDraft({
        homeYellowCardsTotal: totals.homeYellowCardsTotal,
        awayYellowCardsTotal: totals.awayYellowCardsTotal,
        homeRedCardsTotal: totals.homeRedCardsTotal ?? 0,
        awayRedCardsTotal: totals.awayRedCardsTotal ?? 0,
      });
    }
    return {
      ...splitTotal(totals.yellowCardsTotal, LIVE_POT_MAX_YELLOW_CARDS),
      ...splitRedTotal(totals.redCardsTotal),
    };
  }

  return {
    ...splitTotal(Math.min(LIVE_POT_MAX_YELLOW_CARDS, currentYellowCards + 2), LIVE_POT_MAX_YELLOW_CARDS),
    homeRedCardsTotal: 0,
    awayRedCardsTotal: 0,
  };
}

function splitTotal(total: number, max: number) {
  const safeTotal = Math.max(0, Math.min(max, total));
  const homeYellowCardsTotal = Math.ceil(safeTotal / 2);
  return {
    homeYellowCardsTotal,
    awayYellowCardsTotal: safeTotal - homeYellowCardsTotal,
  };
}

function splitRedTotal(total: number) {
  const safeTotal = Math.max(0, Math.min(LIVE_POT_MAX_RED_CARDS, total));
  const homeRedCardsTotal = Math.ceil(safeTotal / 2);
  return {
    homeRedCardsTotal,
    awayRedCardsTotal: safeTotal - homeRedCardsTotal,
  };
}

function normalizeCardDraft(draft: CardDraft): CardDraft {
  return {
    homeYellowCardsTotal: clampCard(draft.homeYellowCardsTotal, LIVE_POT_MAX_YELLOW_CARDS),
    awayYellowCardsTotal: clampCard(draft.awayYellowCardsTotal, LIVE_POT_MAX_YELLOW_CARDS),
    homeRedCardsTotal: clampCard(draft.homeRedCardsTotal, LIVE_POT_MAX_RED_CARDS),
    awayRedCardsTotal: clampCard(draft.awayRedCardsTotal, LIVE_POT_MAX_RED_CARDS),
  };
}

function clampCard(value: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.trunc(value)));
}

function saveKey(input: SaveLivePotTipInput) {
  return JSON.stringify(input);
}

function getDisplay({
  currentKey,
  lastSavedKey,
  saveDisplay,
  hasStoredTip,
}: {
  currentKey: string;
  lastSavedKey: string;
  saveDisplay: SaveDisplay | null;
  hasStoredTip: boolean;
}): { signal: SaveSignalName; message: string } {
  if (saveDisplay?.key === currentKey && saveDisplay.signal === "error") {
    return { signal: "error", message: saveDisplay.message };
  }
  if (currentKey !== lastSavedKey) return { signal: "saving", message: "Lagrer..." };
  if (saveDisplay?.key === currentKey && saveDisplay.signal === "saved") {
    return { signal: "saved", message: saveDisplay.message };
  }
  return { signal: "saved", message: hasStoredTip ? "Kortbonus lagret" : "Kortbonus ikke satt" };
}

function SaveSignal({ signal, message }: { signal: SaveSignalName; message: string }) {
  const ok = signal === "saved";
  const error = signal === "error";
  return (
    <div className={cx("tip-save-signal", ok && "tip-save-signal-ok", error && "tip-save-signal-error")} aria-live="polite">
      {ok ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <AlertCircle className="h-4 w-4" aria-hidden="true" />}
      <span>{message}</span>
    </div>
  );
}

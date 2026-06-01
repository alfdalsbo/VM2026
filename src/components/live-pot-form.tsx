"use client";

import { Minus, Plus, TicketCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { saveLivePotTipAction, type SaveLivePotTipState } from "@/app/actions";
import { cx } from "@/lib/format";
import { LIVE_POT_MAX_RED_CARDS, LIVE_POT_MAX_YELLOW_CARDS } from "@/lib/live-pot";
import type { LivePotTip, WorldCupMatch } from "@/lib/types";

const INITIAL: SaveLivePotTipState = {};

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
  const pathname = usePathname();
  const [yellowCardsTotal, setYellowCardsTotal] = useState(tip?.yellowCardsTotal ?? Math.min(LIVE_POT_MAX_YELLOW_CARDS, currentYellowCards + 2));
  const [redCardsTotal, setRedCardsTotal] = useState(tip?.redCardsTotal ?? 0);
  const [saveState, formAction, pending] = useActionState(saveLivePotTipAction, INITIAL);

  useEffect(() => {
    if (!saveState.status && !saveState.error) return;
    const key = saveState.error ? "error" : "status";
    const value = saveState.error ?? saveState.status ?? "";
    router.replace(`${pathname}?${key}=${encodeURIComponent(value)}`, { scroll: false });
  }, [saveState, router, pathname]);

  function setCards(next: number) {
    setYellowCardsTotal(Math.max(0, Math.min(LIVE_POT_MAX_YELLOW_CARDS, next)));
  }

  function setRedCards(next: number) {
    setRedCardsTotal(Math.max(0, Math.min(LIVE_POT_MAX_RED_CARDS, next)));
  }

  return (
    <form action={formAction} className="tip-form">
      <input type="hidden" name="matchId" value={match.id} />
      <input type="hidden" name="yellowCardsTotal" value={yellowCardsTotal} />
      <input type="hidden" name="redCardsTotal" value={redCardsTotal} />

      <div className="tip-teams">
        <div className="tip-team-row">
          <span className="tip-team-name">
            <span className="bonus-card-chip bonus-card-chip-yellow" aria-hidden="true" />
            Gule kort totalt
          </span>
          <div className="tip-stepper" role="group" aria-label="Gule kort totalt">
            <button
              type="button"
              className="tip-stepper-btn"
              onClick={() => setCards(yellowCardsTotal - 1)}
              aria-label="Trekk fra gult kort"
              disabled={yellowCardsTotal === 0}
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span className="tip-stepper-value" aria-live="polite">{yellowCardsTotal}</span>
            <button
              type="button"
              className="tip-stepper-btn"
              onClick={() => setCards(yellowCardsTotal + 1)}
              aria-label="Legg til gult kort"
              disabled={yellowCardsTotal === LIVE_POT_MAX_YELLOW_CARDS}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="tip-team-row">
          <span className="tip-team-name">
            <span className="bonus-card-chip bonus-card-chip-red" aria-hidden="true" />
            Røde kort totalt
          </span>
          <div className="tip-stepper" role="group" aria-label="Røde kort totalt">
            <button
              type="button"
              className="tip-stepper-btn"
              onClick={() => setRedCards(redCardsTotal - 1)}
              aria-label="Trekk fra rødt kort"
              disabled={redCardsTotal === 0}
            >
              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span className={cx("tip-stepper-value", redCardsTotal > 0 && "live-pot-red-value")} aria-live="polite">{redCardsTotal}</span>
            <button
              type="button"
              className="tip-stepper-btn"
              onClick={() => setRedCards(redCardsTotal + 1)}
              aria-label="Legg til rødt kort"
              disabled={redCardsTotal === LIVE_POT_MAX_RED_CARDS}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="tip-form-actions">
        <button className="btn-primary tip-submit" type="submit" disabled={pending} aria-live="polite">
          <TicketCheck className="h-4 w-4" aria-hidden="true" />
          {pending ? "Noterer..." : tip ? "Oppdater" : "Lagre"}
        </button>
      </div>
    </form>
  );
}

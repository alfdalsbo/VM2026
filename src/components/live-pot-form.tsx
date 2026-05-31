"use client";

import { Minus, Plus, TicketCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { saveLivePotTipAction, type SaveLivePotTipState } from "@/app/actions";
import { cx } from "@/lib/format";
import { LIVE_POT_MAX_YELLOW_CARDS } from "@/lib/live-pot";
import type { LivePotTip, LiveRedCardPrediction, WorldCupMatch } from "@/lib/types";

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
  const [redCard, setRedCard] = useState<LiveRedCardPrediction>(tip?.redCard ?? "no");
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

  return (
    <form action={formAction} className="live-pot-form">
      <input type="hidden" name="matchId" value={match.id} />
      <input type="hidden" name="yellowCardsTotal" value={yellowCardsTotal} />
      <input type="hidden" name="redCard" value={redCard} />

      <label className="live-pot-number">
        <span>Gule kort totalt</span>
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
      </label>

      <fieldset className="live-pot-red-card">
        <legend>Rødt kort</legend>
        <div>
          {(["no", "yes"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={cx("live-pot-toggle", redCard === value && "live-pot-toggle-active")}
              onClick={() => setRedCard(value)}
              aria-pressed={redCard === value}
            >
              {value === "yes" ? "Ja" : "Nei"}
            </button>
          ))}
        </div>
      </fieldset>

      <button className="btn-primary live-pot-submit" type="submit" disabled={pending} aria-live="polite">
        <TicketCheck className="h-4 w-4" aria-hidden="true" />
        {pending ? "Noterer..." : tip ? "Oppdater bonustips" : "Lagre bonustips"}
      </button>
    </form>
  );
}

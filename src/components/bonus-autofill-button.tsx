"use client";

import { Wand2 } from "lucide-react";

import { autofillBonusTipsAction } from "@/app/actions";
import { cx } from "@/lib/format";

export function BonusAutofillButton({
  matchId,
  next,
  compact = false,
  label,
}: {
  matchId: string;
  next: string;
  compact?: boolean;
  label?: string;
}) {
  return (
    <form action={autofillBonusTipsAction}>
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="next" value={next} />
      <button className={cx("btn-secondary bonus-autofill-button", compact && "bonus-autofill-button-compact")} type="submit">
        <Wand2 className="h-4 w-4" aria-hidden="true" />
        {label ?? (compact ? "Autofyll" : "Autofyll bonustips")}
      </button>
    </form>
  );
}

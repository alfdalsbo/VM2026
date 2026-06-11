"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function TournamentBonusSubmitButton({ hasPrediction }: { hasPrediction: boolean }) {
  const { pending } = useFormStatus();
  const label = hasPrediction ? "Endre svar" : "Avgi svar";

  return (
    <button type="submit" className="btn-primary tournament-bonus-submit" disabled={pending}>
      {pending ? <LoaderCircle className="tournament-bonus-submit-icon" size={17} aria-hidden="true" /> : null}
      {pending ? "Lagrer..." : label}
    </button>
  );
}

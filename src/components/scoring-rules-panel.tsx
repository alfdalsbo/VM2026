import { Panel } from "@/components/ui";
import { SCORE_RULES } from "@/lib/scoring-rules";

type ScoringRulesVariant = "combined" | "result" | "bonus";

export function ScoringRulesPanel({
  compact = false,
  variant = "combined",
}: {
  compact?: boolean;
  variant?: ScoringRulesVariant;
}) {
  const result = SCORE_RULES.resultTips;
  const bonus = SCORE_RULES.bonusTips;
  const showResultRules = variant === "combined" || variant === "result";
  const showBonusRules = variant === "combined" || variant === "bonus";

  return (
    <Panel className="scoring-rules-panel">
      <div className="scoring-rules-heading">
        <p className="eyebrow">Poengregler</p>
        <h2 className="scoring-rules-title">Slik telles poengene</h2>
      </div>

      <div className="scoring-rules-grid">
        {showResultRules ? (
          <section>
            <h3>Resultattips</h3>
            <ul>
              <li><strong>+{result.outcome}</strong><span>Riktig utfall</span></li>
              <li><strong>+{result.exactResult}</strong><span>Eksakt resultat</span></li>
            </ul>
            {!compact ? <p>Eksakt resultat gir også riktig utfall, altså maks {result.outcome + result.exactResult} poeng per kamp.</p> : null}
          </section>
        ) : null}

        {showBonusRules ? (
          <section>
            <h3>Bonustips</h3>
            <ul>
              <li><strong>+{bonus.scorer}</strong><span>Riktig målscorer</span></li>
              <li><strong>+{bonus.assist}</strong><span>Riktig assist</span></li>
              <li><strong>+{bonus.yellowExact}</strong><span>Eksakt antall gule kort</span></li>
              <li><strong>+{bonus.redExact}</strong><span>Eksakt antall røde kort</span></li>
              <li><strong>+{bonus.tournamentWinner}</strong><span>VM-vinner</span></li>
              <li><strong>+{bonus.tournamentTopScorer}</strong><span>Toppscorer</span></li>
              <li><strong>+{bonus.tournamentAssistKing}</strong><span>Assistkonge</span></li>
            </ul>
            {!compact ? <p>Bom gir 0. Bonustips har egen tabell og påvirker ikke resultattips-tabellen.</p> : null}
          </section>
        ) : null}
      </div>
    </Panel>
  );
}

import { Panel } from "@/components/ui";
import { SCORE_RULES } from "@/lib/scoring-rules";

export function ScoringRulesPanel({ compact = false }: { compact?: boolean }) {
  const result = SCORE_RULES.resultTips;
  const bonus = SCORE_RULES.bonusTips;

  return (
    <Panel className="scoring-rules-panel">
      <div className="scoring-rules-heading">
        <div>
          <p className="eyebrow">Poengregler</p>
          <h2 className="section-title mt-2">Slik telles poengene</h2>
        </div>
        <span>Enkelt nok til at dommerbordet kan lese det høyt</span>
      </div>

      <div className="scoring-rules-grid">
        <section>
          <h3>Resultattips</h3>
          <ul>
            <li><strong>+{result.outcome}</strong><span>Riktig utfall</span></li>
            <li><strong>+{result.exactResult}</strong><span>Eksakt resultat</span></li>
          </ul>
          {!compact ? <p>Eksakt resultat gir også riktig utfall, altså maks {result.outcome + result.exactResult} poeng per kamp.</p> : null}
        </section>

        <section>
          <h3>Bonustips</h3>
          <ul>
            <li><strong>+{bonus.scorer}</strong><span>Riktig målscorer</span></li>
            <li><strong>+{bonus.assist}</strong><span>Riktig assist</span></li>
            <li><strong>+{bonus.yellowExact}</strong><span>Eksakt antall gule kort</span></li>
            <li><strong>+{bonus.redExact}</strong><span>Eksakt antall røde kort</span></li>
          </ul>
          {!compact ? <p>Bom gir 0. Bonustips har egen tabell, og vinneren får +{bonus.winnerAward} i resultattips ved VM-slutt.</p> : null}
        </section>
      </div>
    </Panel>
  );
}

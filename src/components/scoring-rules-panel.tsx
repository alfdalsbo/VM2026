import { Panel } from "@/components/ui";
import { SCORE_RULES } from "@/lib/scoring-rules";

export function ScoringRulesPanel({ compact = false }: { compact?: boolean }) {
  const result = SCORE_RULES.resultTips;
  const bonus = SCORE_RULES.bonusTips;
  const resultAwards = bonus.resultAwards.map((award) => `${award}+`).join("/");

  return (
    <Panel className="scoring-rules-panel">
      <div className="scoring-rules-heading">
        <p className="eyebrow">Poengregler</p>
        <h2 className="scoring-rules-title">Slik telles poengene</h2>
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
            <li><strong>+{bonus.tournamentWinner}</strong><span>VM-vinner</span></li>
            <li><strong>+{bonus.tournamentTopScorer}</strong><span>Toppscorer</span></li>
            <li><strong>+{bonus.tournamentAssistKing}</strong><span>Assistkonge</span></li>
          </ul>
          {!compact ? <p>Bom gir 0. Bonustips har egen tabell. Topp 3 får {resultAwards} i resultattips ved VM-slutt.</p> : null}
        </section>
      </div>
    </Panel>
  );
}

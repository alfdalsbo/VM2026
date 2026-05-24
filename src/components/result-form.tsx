import { Save } from "lucide-react";

import { saveResultAction } from "@/app/actions";
import { formatOsloDateTime } from "@/lib/format";
import { getBroadcastForMatch } from "@/lib/tournament";
import type { WorldCupMatch } from "@/lib/types";

export function ResultForm({ match }: { match: WorldCupMatch }) {
  const broadcast = getBroadcastForMatch(match);
  return (
    <form id={match.id} action={saveResultAction} className="admin-match">
      <input type="hidden" name="matchId" value={match.id} />
      <div className="admin-match-head">
        <span>#{match.matchNumber}</span>
        <strong>{match.group ?? match.stageLabel}</strong>
        <span>{formatOsloDateTime(match.kickoffAt)}</span>
      </div>
      <div className="admin-grid">
        <label>
          <span>Hjemmelag</span>
          <input name="homeTeam" defaultValue={match.homeTeam} />
        </label>
        <label>
          <span>Bortelag</span>
          <input name="awayTeam" defaultValue={match.awayTeam} />
        </label>
        <label>
          <span>Hjemmemål</span>
          <input min={0} max={30} name="homeGoals" type="number" defaultValue={match.result?.homeGoals ?? ""} />
        </label>
        <label>
          <span>Bortemål</span>
          <input min={0} max={30} name="awayGoals" type="number" defaultValue={match.result?.awayGoals ?? ""} />
        </label>
        <label>
          <span>Videre ved straffer</span>
          <select name="advancingTeam" defaultValue={match.result?.advancingTeam ?? ""}>
            <option value="">Ikke relevant</option>
            <option value="home">{match.homeTeam}</option>
            <option value="away">{match.awayTeam}</option>
          </select>
        </label>
        <label className="joker-toggle">
          <input name="decidedByPenalties" type="checkbox" defaultChecked={match.result?.decidedByPenalties ?? false} />
          <span>Avgjort på straffer</span>
        </label>
        <label>
          <span>Kanal</span>
          <input name="broadcastChannel" defaultValue={broadcast?.channel ?? ""} placeholder="NRK1 / TV 2 Direkte" />
        </label>
        <label>
          <span>Strømming</span>
          <input name="broadcastService" defaultValue={broadcast?.service ?? ""} placeholder="NRK TV / TV 2 Play" />
        </label>
        <label>
          <span>TV-notat</span>
          <input name="broadcastNote" defaultValue={broadcast?.note ?? ""} placeholder="Endret av admin ved behov" />
        </label>
      </div>
      <button className="btn-primary" type="submit">
        <Save className="h-4 w-4" aria-hidden="true" />
        Lagre kamp
      </button>
    </form>
  );
}

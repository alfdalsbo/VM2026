import { saveTournamentBonusPredictionAction } from "@/app/actions";
import { PlayerCombobox } from "@/components/player-combobox";
import { Panel } from "@/components/ui";
import { displayTeamName } from "@/lib/display";
import { formatOsloDateTime } from "@/lib/format";
import type { PlayerComboboxOption } from "@/lib/player-combobox";
import {
  formatTournamentBonusPlayer,
  getTournamentBonusLockAt,
  getTournamentBonusPlayerOptions,
  getTournamentBonusPrediction,
  getTournamentBonusTeamOptions,
  isTournamentBonusOpen,
  tournamentBonusPlayerName,
  tournamentBonusTeamName,
} from "@/lib/tournament-bonus";
import type { AppState, Player, PlayerTournamentStat } from "@/lib/types";

export function TournamentBonusPanel({ state, player }: { state: AppState; player: Player }) {
  const prediction = getTournamentBonusPrediction(state, player.id);
  const teams = getTournamentBonusTeamOptions(state);
  const playerOptions = getTournamentBonusPlayerOptions(state);
  const comboboxTeamOptions = tournamentTeamComboboxOptions(teams);
  const comboboxPlayerOptions = tournamentPlayerComboboxOptions(playerOptions);
  const open = isTournamentBonusOpen(state);
  const lockAt = getTournamentBonusLockAt(state);
  const canSubmit = open && teams.length > 0 && playerOptions.length > 0;
  const result = state.tournamentBonusResult;

  return (
    <Panel className="tournament-bonus-panel">
      <div className="bonus-panel-heading">
        <div>
          <p className="eyebrow">Turneringsbonus</p>
          <h2 className="section-title mt-2">VM-vinner, toppscorer og assistkonge</h2>
          <p className="lead mt-3 max-w-3xl">
            Tre små profetier fra kjellerens langtidsarkiv. Låses {lockAt ? formatOsloDateTime(lockAt) : "ved første avspark"}.
          </p>
        </div>
        <span className={open ? "tournament-bonus-state tournament-bonus-state-open" : "tournament-bonus-state"}>
          {open ? "Åpen" : "Låst"}
        </span>
      </div>

      <div className="tournament-bonus-layout mt-4">
        {canSubmit ? (
          <form action={saveTournamentBonusPredictionAction} className="tournament-bonus-form">
            <input type="hidden" name="next" value="/live" />
            <PlayerCombobox
              label="VM-vinner"
              name="winnerTeamSlug"
              placeholder="Velg lag"
              options={comboboxTeamOptions}
              defaultValue={prediction?.winnerTeamSlug ?? ""}
              required
            />
            <PlayerCombobox
              label="Toppscorer"
              name="topScorerPlayerProfileId"
              placeholder="Velg spiller"
              options={comboboxPlayerOptions}
              defaultValue={prediction?.topScorerPlayerProfileId ?? ""}
              required
            />
            <PlayerCombobox
              label="Assistkonge"
              name="assistKingPlayerProfileId"
              placeholder="Velg spiller"
              options={comboboxPlayerOptions}
              defaultValue={prediction?.assistKingPlayerProfileId ?? ""}
              required
            />
            <button type="submit" className="btn-primary tournament-bonus-submit">
              Lagre turneringsbonus
            </button>
          </form>
        ) : (
          <p className="lead tournament-bonus-empty">
            {open
              ? "Troppdata er ikke klar nok til turneringsbonus ennå."
              : prediction
                ? "Turneringsbonusen er låst og ligger i protokollen."
                : "Turneringsbonusen er låst uten registrert tips."}
          </p>
        )}

        <div className="tournament-bonus-ledger">
          <TournamentBonusSummary
            title="Ditt tips"
            rows={[
              ["VM-vinner", tournamentBonusTeamName(state, prediction?.winnerTeamSlug) ?? "-"],
              ["Toppscorer", tournamentBonusPlayerName(state, prediction?.topScorerPlayerProfileId) ?? "-"],
              ["Assistkonge", tournamentBonusPlayerName(state, prediction?.assistKingPlayerProfileId) ?? "-"],
            ]}
          />
          <TournamentBonusSummary
            title="Fasit"
            rows={[
              ["VM-vinner", result.winnerTeamName ? displayTeamName(result.winnerTeamName) : "-"],
              ["Toppscorer", formatStatWinners(result.topScorers)],
              ["Assistkonge", formatStatWinners(result.assistKings)],
            ]}
            note={result.unavailableReason ?? (result.source ? `Kilde: ${result.source}` : null)}
          />
        </div>
      </div>
    </Panel>
  );
}

function TournamentBonusSummary({
  title,
  rows,
  note,
}: {
  title: string;
  rows: Array<[string, string]>;
  note?: string | null;
}) {
  return (
    <section className="tournament-bonus-summary">
      <h3>{title}</h3>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {note ? <p>{note}</p> : null}
    </section>
  );
}

function formatStatWinners(rows: PlayerTournamentStat[]) {
  if (!rows.length) return "-";
  return rows.map((row) => `${row.playerName} (${displayTeamName(row.teamName)})`).join(", ");
}

function tournamentTeamComboboxOptions(
  teams: ReturnType<typeof getTournamentBonusTeamOptions>,
): PlayerComboboxOption[] {
  return teams.map((team) => ({
    value: team.slug,
    label: team.name,
    searchText: team.searchText,
  }));
}

function tournamentPlayerComboboxOptions(
  playerOptions: ReturnType<typeof getTournamentBonusPlayerOptions>,
): PlayerComboboxOption[] {
  return playerOptions.map((option) => ({
    value: option.id,
    label: option.name,
    meta: displayTeamName(option.teamName),
    groupLabel: displayTeamName(option.teamName),
    searchText: [formatTournamentBonusPlayer(option), displayTeamName(option.teamName), option.teamSlug, option.position].join(" "),
  }));
}

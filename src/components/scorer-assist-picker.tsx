"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { saveMatchBonusPredictionAction, type SaveMatchBonusPredictionInput } from "@/app/actions";
import { PlayerCombobox } from "@/components/player-combobox";
import { TeamLink } from "@/components/team-link";
import { realSquadPlayers } from "@/lib/bonus-player-options";
import { teamFlagEmoji } from "@/lib/display";
import { cx } from "@/lib/format";
import type { PlayerComboboxOption } from "@/lib/player-combobox";
import type { Prediction, TeamSquadPlayer, WorldCupMatch } from "@/lib/types";

type BonusDraft = {
  homeScorers: string[];
  awayScorers: string[];
  homeAssists: string[];
  awayAssists: string[];
};

type SaveSignalName = "saved" | "saving" | "needs-input" | "error";
type SaveDisplay = {
  key: string;
  signal: SaveSignalName;
  message: string;
};
type PreparedBonusSave = { input: SaveMatchBonusPredictionInput } | { error: string };

export function ScorerAssistPicker({
  match,
  prediction,
  homeSquad,
  awaySquad,
}: {
  match: WorldCupMatch;
  prediction: Prediction | null;
  homeSquad: TeamSquadPlayer[];
  awaySquad: TeamSquadPlayer[];
}) {
  const router = useRouter();
  const homeGoals = prediction?.homeGoals ?? 0;
  const awayGoals = prediction?.awayGoals ?? 0;
  const realHomeSquad = useMemo(() => realSquadPlayers(homeSquad), [homeSquad]);
  const realAwaySquad = useMemo(() => realSquadPlayers(awaySquad), [awaySquad]);
  const homeIds = useMemo(() => new Set(realHomeSquad.map((player) => player.id)), [realHomeSquad]);
  const awayIds = useMemo(() => new Set(realAwaySquad.map((player) => player.id)), [realAwaySquad]);
  const [draft, setDraft] = useState<BonusDraft>(() => ({
    homeScorers: slotValues(prediction?.homeScorers, homeIds, homeGoals),
    awayScorers: slotValues(prediction?.awayScorers, awayIds, awayGoals),
    homeAssists: slotValues(prediction?.homeAssists, homeIds, homeGoals),
    awayAssists: slotValues(prediction?.awayAssists, awayIds, awayGoals),
  }));
  const currentDraft = useMemo(
    () => ({
      homeScorers: slotValues(draft.homeScorers, homeIds, homeGoals),
      awayScorers: slotValues(draft.awayScorers, awayIds, awayGoals),
      homeAssists: slotValues(draft.homeAssists, homeIds, homeGoals),
      awayAssists: slotValues(draft.awayAssists, awayIds, awayGoals),
    }),
    [awayGoals, awayIds, draft, homeGoals, homeIds],
  );
  const prepared = useMemo<PreparedBonusSave>(() => {
    if (!prediction) return { error: "Sett resultattips først" };
    return {
      input: {
        matchId: match.id,
        homeScorers: compactSlots(currentDraft.homeScorers),
        awayScorers: compactSlots(currentDraft.awayScorers),
        homeAssists: compactSlots(currentDraft.homeAssists),
        awayAssists: compactSlots(currentDraft.awayAssists),
      },
    };
  }, [currentDraft, match.id, prediction]);
  const initialKey = "input" in prepared ? saveKey(prepared.input) : "";
  const [lastSavedKey, setLastSavedKey] = useState(initialKey);
  const [saveDisplay, setSaveDisplay] = useState<SaveDisplay | null>(null);
  const latestRequest = useRef(0);
  const [, startTransition] = useTransition();
  const currentKey = "input" in prepared ? saveKey(prepared.input) : "";
  const displayedSignal = getDisplay({
    prepared,
    currentKey,
    lastSavedKey,
    saveDisplay,
    hasStoredBonus: hasStoredBonus(prediction),
  });

  useEffect(() => {
    if (!("input" in prepared)) return;
    if (currentKey === lastSavedKey) return;

    const input = prepared.input;
    const key = currentKey;
    const timeout = window.setTimeout(() => {
      const requestId = latestRequest.current + 1;
      latestRequest.current = requestId;
      startTransition(() => {
        void saveMatchBonusPredictionAction(input).then((result) => {
          if (latestRequest.current !== requestId) return;
          if (result.error) {
            setSaveDisplay({ key, signal: "error", message: result.error });
            return;
          }
          setLastSavedKey(key);
          setSaveDisplay({ key, signal: "saved", message: "Bonustips lagret" });
          router.refresh();
        });
      });
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [currentKey, lastSavedKey, prepared, router, startTransition]);

  function setSlot(field: keyof BonusDraft, index: number, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: replaceSlot(current[field], index, value),
    }));
  }

  if (homeGoals + awayGoals === 0) {
    return (
      <p className="lead">
        Resultattipset står på 0-0. Sett et tips med mål på kampen, så åpner scorer- og assist-valgene seg her.
      </p>
    );
  }

  return (
    <div className="scorer-form">
      <div className="scorer-grid">
        <TeamSection
          team={match.homeTeam}
          squad={realHomeSquad}
          goals={homeGoals}
          scorers={currentDraft.homeScorers}
          assists={currentDraft.homeAssists}
          onScorerChange={(index, value) => setSlot("homeScorers", index, value)}
          onAssistChange={(index, value) => setSlot("homeAssists", index, value)}
        />
        <TeamSection
          team={match.awayTeam}
          squad={realAwaySquad}
          goals={awayGoals}
          scorers={currentDraft.awayScorers}
          assists={currentDraft.awayAssists}
          onScorerChange={(index, value) => setSlot("awayScorers", index, value)}
          onAssistChange={(index, value) => setSlot("awayAssists", index, value)}
        />
      </div>

      <SaveSignal signal={displayedSignal.signal} message={displayedSignal.message} />
    </div>
  );
}

function TeamSection({
  team,
  squad,
  goals,
  scorers,
  assists,
  onScorerChange,
  onAssistChange,
}: {
  team: string;
  squad: TeamSquadPlayer[];
  goals: number;
  scorers: string[];
  assists: string[];
  onScorerChange: (index: number, value: string) => void;
  onAssistChange: (index: number, value: string) => void;
}) {
  const flag = teamFlagEmoji(team);
  const playerOptions = useMemo(() => squadPlayerOptions(squad, team), [squad, team]);

  if (goals === 0) {
    return (
      <section className="scorer-team">
        <TeamHeader flag={flag} team={team} goals={goals} />
        <p className="lead">Ingen tippede mål.</p>
      </section>
    );
  }

  if (!squad.length) {
    return (
      <section className="scorer-team">
        <TeamHeader flag={flag} team={team} goals={goals} />
        <p className="lead">Tropp ikke klar.</p>
      </section>
    );
  }

  return (
    <section className="scorer-team">
      <TeamHeader flag={flag} team={team} goals={goals} />
      <div className="scorer-slots">
        {Array.from({ length: goals }, (_, index) => (
          <div key={`${team}-${index}`} className="scorer-slot-row">
            <span className="scorer-slot-number">{index + 1}</span>
            <PlayerCombobox
              className="scorer-slot-field"
              label="Scorer"
              placeholder="Velg scorer"
              emptyLabel="Velg scorer"
              options={playerOptions}
              value={scorers[index] ?? ""}
              onChange={(value) => onScorerChange(index, value)}
            />
            <PlayerCombobox
              className="scorer-slot-field"
              label="Assist"
              placeholder="Ingen/usikker"
              emptyLabel="Ingen/usikker"
              options={playerOptions}
              value={assists[index] ?? ""}
              onChange={(value) => onAssistChange(index, value)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamHeader({ flag, team, goals }: { flag: string; team: string; goals: number }) {
  return (
    <header className="scorer-team-header">
      <span className="scorer-team-flag" aria-hidden="true">{flag}</span>
      <h3 className="scorer-team-name"><TeamLink teamName={team} /></h3>
      <span className="scorer-team-goals">{goals} mål</span>
    </header>
  );
}

function slotValues(ids: string[] | undefined, validIds: Set<string>, slots: number) {
  const values = (ids ?? []).filter((id) => validIds.has(id)).slice(0, slots);
  while (values.length < slots) values.push("");
  return values;
}

function compactSlots(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

function replaceSlot(values: string[], index: number, value: string) {
  const next = [...values];
  while (next.length <= index) next.push("");
  next[index] = value;
  return next;
}

function saveKey(input: SaveMatchBonusPredictionInput) {
  return JSON.stringify(input);
}

function hasStoredBonus(prediction: Prediction | null) {
  return Boolean(
    prediction?.homeScorers?.length ||
      prediction?.awayScorers?.length ||
      prediction?.homeAssists?.length ||
      prediction?.awayAssists?.length,
  );
}

const POSITION_GROUP_ORDER: TeamSquadPlayer["position"][] = [
  "goalkeeper",
  "defender",
  "midfielder",
  "forward",
  "unknown",
];

const POSITION_GROUP_LABELS: Record<TeamSquadPlayer["position"], string> = {
  goalkeeper: "Keepere",
  defender: "Forsvar",
  midfielder: "Midtbane",
  forward: "Angrep",
  unknown: "Uten posisjon",
};

function splitNameAndClub(rawName: string) {
  const match = rawName.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (!match) return { name: rawName, club: null as string | null };
  return { name: match[1].trim(), club: match[2].trim() };
}

function playerOptionLabel(player: TeamSquadPlayer) {
  const shirt = player.shirtNumber ? `${player.shirtNumber} ` : "";
  const { name } = splitNameAndClub(player.name);
  const goals = player.goals ?? 0;
  const assists = player.assists ?? 0;
  return `${shirt}${name} (m:${goals}, a:${assists})`;
}

function squadOptionGroups(squad: TeamSquadPlayer[]): Array<{
  position: TeamSquadPlayer["position"];
  label: string;
  players: TeamSquadPlayer[];
}> {
  const byPosition = new Map<TeamSquadPlayer["position"], TeamSquadPlayer[]>();
  for (const player of squad) {
    const bucket = byPosition.get(player.position) ?? [];
    bucket.push(player);
    byPosition.set(player.position, bucket);
  }
  return POSITION_GROUP_ORDER
    .map((position) => ({
      position,
      label: POSITION_GROUP_LABELS[position],
      players: byPosition.get(position) ?? [],
    }))
    .filter((group) => group.players.length > 0);
}

function squadPlayerOptions(squad: TeamSquadPlayer[], team: string): PlayerComboboxOption[] {
  return squadOptionGroups(squad).flatMap((group) =>
    group.players.map((player) => ({
      value: player.id,
      label: playerOptionLabel(player),
      groupLabel: group.label,
      searchText: [
        player.name,
        player.shortName,
        player.shirtNumber,
        player.position,
        player.positionDetail,
        team,
        group.label,
        `m:${player.goals ?? 0}`,
        `a:${player.assists ?? 0}`,
      ]
        .filter(Boolean)
        .join(" "),
    })),
  );
}

function getDisplay({
  prepared,
  currentKey,
  lastSavedKey,
  saveDisplay,
  hasStoredBonus,
}: {
  prepared: PreparedBonusSave;
  currentKey: string;
  lastSavedKey: string;
  saveDisplay: SaveDisplay | null;
  hasStoredBonus: boolean;
}): { signal: SaveSignalName; message: string } {
  if ("error" in prepared) return { signal: "needs-input", message: prepared.error };
  if (saveDisplay?.key === currentKey && saveDisplay.signal === "error") {
    return { signal: "error", message: saveDisplay.message };
  }
  if (currentKey !== lastSavedKey) return { signal: "saving", message: "Lagrer..." };
  if (saveDisplay?.key === currentKey && saveDisplay.signal === "saved") {
    return { signal: "saved", message: saveDisplay.message };
  }
  return { signal: "saved", message: hasStoredBonus ? "Bonustips lagret" : "Klart for spillervalg" };
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

import { DailyWorldCupMoment } from "@/components/daily-world-cup-moment";
import { NostalgiaArchiveSection } from "@/components/nostalgia";
import { Panel } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { getAppState } from "@/lib/state";
import { getNostalgiaArchive, pickDailyNostalgiaMoment } from "@/lib/world-cup-nostalgia";

export const metadata = {
  title: "Nerding",
};

const osloKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Oslo",
  year: "numeric",
});

function osloDateKey(value: string | Date) {
  const parts = osloKeyFormatter.formatToParts(typeof value === "string" ? new Date(value) : value);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function matchesOnDate(state: Awaited<ReturnType<typeof getAppState>>, key: string) {
  return state.matches
    .filter((match) => osloDateKey(match.kickoffAt) === key)
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
}

export default async function NerdingPage() {
  await requireSession();
  const state = await getAppState();
  const now = new Date();
  const todayKey = osloDateKey(now);
  const todayMatches = matchesOnDate(state, todayKey);
  const nextOpenMatch = state.matches.find((match) => new Date(match.kickoffAt).getTime() > now.getTime());
  const focusKey = todayMatches.length ? todayKey : nextOpenMatch ? osloDateKey(nextOpenMatch.kickoffAt) : todayKey;
  const focusMatches = todayMatches.length ? todayMatches : matchesOnDate(state, focusKey);
  const dailyNostalgia = pickDailyNostalgiaMoment(focusKey, focusMatches);
  const archive = getNostalgiaArchive();

  return (
    <div className="space-y-6">
      <Panel>
        <p className="eyebrow">Kjellerarkivet</p>
        <h1 className="section-title mt-2">Nerding</h1>
        <p className="lead mt-3 max-w-3xl">
          VM-nostalgi, historiske øyeblikk og hele arkivet. For dere som heller graver i 1998 enn i tabellen.
        </p>
      </Panel>

      <DailyWorldCupMoment dateKey={focusKey} matches={focusMatches} moment={dailyNostalgia} />

      <NostalgiaArchiveSection archive={archive} />
    </div>
  );
}

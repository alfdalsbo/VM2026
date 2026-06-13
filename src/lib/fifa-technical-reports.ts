import type {
  AppState,
  MatchTechnicalReport,
  TeamSide,
  TechnicalReportMetric,
  TechnicalReportPhase,
  TechnicalReportPlayerHighlight,
  WorldCupMatch,
} from "@/lib/types";

export const fifaTrainingCentreReportHubUrl =
  "https://www.fifatrainingcentre.com/en/fifa-world-cup-2026/match-report-hub.php";

const fifaTrainingCentreBaseUrl = "https://www.fifatrainingcentre.com";
const n = String.raw`([0-9]+(?:[.,][0-9]+)?)`;

export type FifaTechnicalReportLink = {
  matchNumber: number;
  url: string;
  title: string;
};

type SyncOptions = {
  fetcher?: typeof fetch;
  force?: boolean;
  syncedAt?: string;
  extractPdfText?: (data: Uint8Array) => Promise<string>;
};

const metricSpecs: Array<{
  key: string;
  label: string;
  unit: string | null;
  pattern: RegExp;
  home?: number;
  away?: number;
  homeDetail?: number;
  awayDetail?: number;
}> = [
  {
    key: "possession",
    label: "Ballbesittelse",
    unit: "%",
    pattern: new RegExp(`Possession Total\\s+${n}%\\s+${n}%\\s+${n}%\\s+Total`, "i"),
    home: 1,
    away: 3,
  },
  { key: "goals", label: "Mål", unit: null, pattern: new RegExp(`${n}\\s+Goals\\s+${n}`, "i") },
  { key: "expected_goals", label: "xG", unit: null, pattern: new RegExp(`${n}\\s+xG \\(Expected Goals\\)\\s+${n}`, "i") },
  {
    key: "attempts_at_goal",
    label: "Avslutninger",
    unit: null,
    pattern: new RegExp(`${n}\\s*\\(\\s*${n}\\s*\\)\\s+Attempts at Goal \\(On Target\\)\\s+${n}\\s*\\(\\s*${n}\\s*\\)`, "i"),
    home: 1,
    homeDetail: 2,
    away: 3,
    awayDetail: 4,
  },
  {
    key: "total_passes",
    label: "Pasninger",
    unit: null,
    pattern: new RegExp(`${n}\\s*\\(\\s*${n}\\s*\\)\\s+Total Passes \\(Complete\\)\\s+${n}\\s*\\(\\s*${n}\\s*\\)`, "i"),
    home: 1,
    homeDetail: 2,
    away: 3,
    awayDetail: 4,
  },
  { key: "pass_completion", label: "Pasningspresisjon", unit: "%", pattern: new RegExp(`${n}\\s*%\\s+Pass Completion %\\s+${n}\\s*%`, "i") },
  { key: "completed_line_breaks", label: "Fullførte line breaks", unit: null, pattern: new RegExp(`${n}\\s+Completed Line Breaks\\s+${n}`, "i") },
  { key: "defensive_line_breaks", label: "Defensive line breaks", unit: null, pattern: new RegExp(`${n}\\s+Defensive Line Breaks\\s+${n}`, "i") },
  { key: "final_third_receptions", label: "Mottak i siste tredjedel", unit: null, pattern: new RegExp(`${n}\\s+Receptions in the Final Third\\s+${n}`, "i") },
  { key: "crosses", label: "Innlegg", unit: null, pattern: new RegExp(`${n}\\s+Crosses\\s+${n}`, "i") },
  { key: "ball_progressions", label: "Ballprogresjoner", unit: null, pattern: new RegExp(`${n}\\s+Ball Progressions\\s+${n}`, "i") },
  {
    key: "defensive_pressures",
    label: "Defensive press",
    unit: null,
    pattern: new RegExp(`${n}\\s*\\(\\s*${n}\\s*\\)\\s+Defensive Pressures Applied \\(Direct Pressures\\)\\s+${n}\\s*\\(\\s*${n}\\s*\\)`, "i"),
    home: 1,
    homeDetail: 2,
    away: 3,
    awayDetail: 4,
  },
  { key: "forced_turnovers", label: "Fremprovoserte brudd", unit: null, pattern: new RegExp(`${n}\\s+Forced Turnovers\\s+${n}`, "i") },
  { key: "second_balls", label: "Andreballer", unit: null, pattern: new RegExp(`${n}\\s+Second Balls\\s+${n}`, "i") },
  { key: "total_distance", label: "Løpsdistanse", unit: "km", pattern: new RegExp(`${n}\\s*km\\s+Total Distance Covered\\s+${n}\\s*km`, "i") },
  {
    key: "low_speed_sprinting",
    label: "Lav sprint 20-25 km/t",
    unit: "km",
    pattern: new RegExp(`${n}\\s*km\\s+Zone 4 - Low Speed Sprinting: 20-25 km/h\\s+${n}\\s*km`, "i"),
  },
];

const phaseSpecs: Array<{ group: TechnicalReportPhase["group"]; label: string }> = [
  { group: "in_possession", label: "Build Up Unopposed" },
  { group: "in_possession", label: "Build Up Opposed" },
  { group: "in_possession", label: "Progression" },
  { group: "in_possession", label: "Final Third" },
  { group: "in_possession", label: "Long Ball" },
  { group: "in_possession", label: "Attacking Transition" },
  { group: "in_possession", label: "Counter Attack" },
  { group: "in_possession", label: "Set Piece" },
  { group: "out_of_possession", label: "High Press" },
  { group: "out_of_possession", label: "Mid Press" },
  { group: "out_of_possession", label: "Low Press" },
  { group: "out_of_possession", label: "High Block" },
  { group: "out_of_possession", label: "Mid Block" },
  { group: "out_of_possession", label: "Low Block" },
  { group: "out_of_possession", label: "Recovery" },
  { group: "out_of_possession", label: "Defensive Transition" },
  { group: "out_of_possession", label: "Counter-press" },
];

export function discoverFifaTechnicalReportLinks(html: string): FifaTechnicalReportLink[] {
  const links = new Map<number, FifaTechnicalReportLink>();
  const anchors = html.matchAll(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi);
  for (const anchor of anchors) {
    const href = decodeHtml(anchor[2]);
    if (!/PMSR/i.test(href) || !/\.pdf(?:$|\?)/i.test(href)) continue;
    const numberMatch = href.match(/PMSR[-\s]*M[-\s]*0*(\d{1,3})/i) ?? href.match(/\bM[-\s]*0*(\d{1,3})\b/i);
    const matchNumber = numberMatch ? Number(numberMatch[1]) : NaN;
    if (!Number.isFinite(matchNumber)) continue;
    links.set(matchNumber, {
      matchNumber,
      url: new URL(href.replace(/ /g, "%20"), fifaTrainingCentreBaseUrl).href,
      title: stripTags(decodeHtml(anchor[3])).trim() || decodeURIComponent(href.split("/").pop() ?? "FIFA-rapport.pdf"),
    });
  }
  return [...links.values()].sort((a, b) => a.matchNumber - b.matchNumber);
}

export async function extractFifaPdfText(data: Uint8Array): Promise<string> {
  ensurePdfJsNodePolyfills();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data,
    disableWorker: true,
    disableFontFace: true,
    isEvalSupported: false,
  } as unknown as Parameters<typeof pdfjs.getDocument>[0]);
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .trim(),
    );
  }
  await loadingTask.destroy();
  return pages.join("\n");
}

type DomMatrixLike = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  multiplySelf(other: DomMatrixLike): DomMatrixLike;
  preMultiplySelf(other: DomMatrixLike): DomMatrixLike;
  invertSelf(): DomMatrixLike;
  translate(x?: number, y?: number): DomMatrixLike;
  scale(scaleX?: number, scaleY?: number): DomMatrixLike;
};

function ensurePdfJsNodePolyfills() {
  const global = globalThis as unknown as { DOMMatrix?: new (init?: number[] | DomMatrixLike) => DomMatrixLike };
  if (global.DOMMatrix) return;

  global.DOMMatrix = class NodeDomMatrix implements DomMatrixLike {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;

    constructor(init?: number[] | DomMatrixLike) {
      if (Array.isArray(init)) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = [init[0] ?? 1, init[1] ?? 0, init[2] ?? 0, init[3] ?? 1, init[4] ?? 0, init[5] ?? 0];
      } else if (init) {
        this.a = init.a;
        this.b = init.b;
        this.c = init.c;
        this.d = init.d;
        this.e = init.e;
        this.f = init.f;
      }
    }

    multiplySelf(other: DomMatrixLike) {
      const a = this.a * other.a + this.c * other.b;
      const b = this.b * other.a + this.d * other.b;
      const c = this.a * other.c + this.c * other.d;
      const d = this.b * other.c + this.d * other.d;
      const e = this.a * other.e + this.c * other.f + this.e;
      const f = this.b * other.e + this.d * other.f + this.f;
      this.a = a;
      this.b = b;
      this.c = c;
      this.d = d;
      this.e = e;
      this.f = f;
      return this;
    }

    preMultiplySelf(other: DomMatrixLike) {
      return this.setFrom(new NodeDomMatrix(other).multiplySelf(this));
    }

    invertSelf() {
      const determinant = this.a * this.d - this.b * this.c;
      if (!determinant) {
        this.a = Number.NaN;
        this.b = Number.NaN;
        this.c = Number.NaN;
        this.d = Number.NaN;
        this.e = Number.NaN;
        this.f = Number.NaN;
        return this;
      }
      const a = this.d / determinant;
      const b = -this.b / determinant;
      const c = -this.c / determinant;
      const d = this.a / determinant;
      const e = (this.c * this.f - this.d * this.e) / determinant;
      const f = (this.b * this.e - this.a * this.f) / determinant;
      this.a = a;
      this.b = b;
      this.c = c;
      this.d = d;
      this.e = e;
      this.f = f;
      return this;
    }

    translate(x = 0, y = 0) {
      return this.multiplySelf(new NodeDomMatrix([1, 0, 0, 1, x, y]));
    }

    scale(scaleX = 1, scaleY = scaleX) {
      return this.multiplySelf(new NodeDomMatrix([scaleX, 0, 0, scaleY, 0, 0]));
    }

    private setFrom(other: DomMatrixLike) {
      this.a = other.a;
      this.b = other.b;
      this.c = other.c;
      this.d = other.d;
      this.e = other.e;
      this.f = other.f;
      return this;
    }
  };
}

export function parseFifaTechnicalReportText({
  match,
  sourceUrl,
  fetchedAt,
  text,
}: {
  match: WorldCupMatch;
  sourceUrl: string;
  fetchedAt: string;
  text: string;
}): MatchTechnicalReport {
  const normalized = normalizeText(text);
  const metrics = parseMetrics(normalized);
  const phases = parsePhases(normalized);
  const playerHighlights = parsePlayerHighlights(normalized, match);
  const parseStatus = metrics.length >= 10 && phases.length >= 10 ? "complete" : metrics.length || phases.length ? "partial" : "unavailable";
  return {
    matchId: match.id,
    sourceUrl,
    fetchedAt,
    parsedAt: new Date().toISOString(),
    parseStatus,
    unavailableReason: parseStatus === "unavailable" ? "FIFA-rapporten kunne ikke tolkes til stabile nøkkeltall." : null,
    metrics,
    phases,
    playerHighlights,
    notes: [
      metrics.length ? `${metrics.length} nøkkeltall importert fra FIFA-rapporten.` : null,
      phases.length ? `${phases.length} faseverdier importert.` : null,
      playerHighlights.length ? `${playerHighlights.length} spillerlinjer valgt ut.` : null,
    ].filter((note): note is string => Boolean(note)),
  };
}

export async function syncFifaTechnicalReportsForState(state: AppState, options: SyncOptions = {}) {
  const fetcher = options.fetcher ?? fetch;
  const syncedAt = options.syncedAt ?? new Date().toISOString();
  const hub = await fetcher(fifaTrainingCentreReportHubUrl, { cache: "no-store" });
  if (!hub.ok) return { state, updatedReports: 0, skippedReason: `FIFA Training Centre svarte ${hub.status}.` };

  const links = new Map(discoverFifaTechnicalReportLinks(await hub.text()).map((link) => [link.matchNumber, link]));
  const byMatchId = new Map(state.matchTechnicalReports.map((report) => [report.matchId, report]));
  let updatedReports = 0;

  for (const match of state.matches.filter((item) => item.status === "finished" && item.result)) {
    const link = links.get(match.matchNumber);
    if (!link) continue;
    const existing = byMatchId.get(match.id);
    if (existing && !options.force && existing.sourceUrl === link.url && existing.parseStatus === "complete") continue;
    byMatchId.set(match.id, await fetchAndParseReport(match, link.url, syncedAt, fetcher, options.extractPdfText ?? extractFifaPdfText));
    updatedReports += 1;
  }

  return {
    state: {
      ...state,
      matchTechnicalReports: [...byMatchId.values()].sort((a, b) => a.matchId.localeCompare(b.matchId)),
    },
    updatedReports,
    skippedReason: null,
  };
}

function parseMetrics(text: string): TechnicalReportMetric[] {
  return metricSpecs
    .map((spec) => {
      const found = text.match(spec.pattern);
      if (!found) return null;
      return {
        key: spec.key,
        label: spec.label,
        unit: spec.unit,
        home: num(found[spec.home ?? 1]),
        away: num(found[spec.away ?? 2]),
        ...(spec.homeDetail ? { homeDetail: num(found[spec.homeDetail]) } : {}),
        ...(spec.awayDetail ? { awayDetail: num(found[spec.awayDetail]) } : {}),
      };
    })
    .filter((metric): metric is TechnicalReportMetric => Boolean(metric));
}

function parsePhases(text: string): TechnicalReportPhase[] {
  return phaseSpecs
    .map((phase) => {
      const found = text.match(new RegExp(`${n}\\s*%\\s+${escapeRegExp(phase.label)}\\s+${n}\\s*%`, "i"));
      return found ? { group: phase.group, label: phase.label, home: num(found[1]), away: num(found[2]) } : null;
    })
    .filter((phase): phase is TechnicalReportPhase => Boolean(phase));
}

function parsePlayerHighlights(text: string, match: WorldCupMatch): TechnicalReportPlayerHighlight[] {
  const highlights: TechnicalReportPlayerHighlight[] = [];
  const used = new Set<string>();
  const specs = [
    { label: "flest innlegg forsøkt", unit: "innlegg", pattern: /Most Crosses Attempted\s+(\d+)\s+([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þa-zà-öø-ÿ.'-]+(?:\s+[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þa-zà-öø-ÿ.'-]+){1,3})/g },
    { label: "flest pasningstilbud", unit: "tilbud", pattern: /Most Offers\s+(\d+)\s+([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þa-zà-öø-ÿ.'-]+(?:\s+[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þa-zà-öø-ÿ.'-]+){1,3})/g },
    { label: "flest direkte press", unit: "direkte press", pattern: /Most Direct Pressures\s+(\d+)\s+([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þa-zà-öø-ÿ.'-]+(?:\s+[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þa-zà-öø-ÿ.'-]+){1,3})/g },
    { label: "flest gjenvinninger", unit: "gjenvinninger", pattern: /Most Possession Regains\s+(\d+)\s+([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þa-zà-öø-ÿ.'-]+(?:\s+[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þa-zà-öø-ÿ.'-]+){1,3})/g },
  ];

  for (const spec of specs) {
    let occurrence = 0;
    for (const found of text.matchAll(spec.pattern)) {
      occurrence += 1;
      pushHighlight(highlights, used, {
        playerName: titleCaseName(found[2]),
        teamSide: sideFromContext(text, found.index ?? 0, match) ?? (occurrence % 2 === 1 ? "home" : "away"),
        label: spec.label,
        value: num(found[1]),
        unit: spec.unit,
      });
    }
  }

  for (const found of text.matchAll(/\b\d{1,3}\s+([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þa-zà-öø-ÿ.'-]+(?:\s+[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þa-zà-öø-ÿ.'-]+){1,3})\s+On Target - Goal\b/g)) {
    pushHighlight(highlights, used, {
      playerName: titleCaseName(found[1]),
      teamSide: sideFromContext(text, found.index ?? 0, match),
      label: "målavslutning",
      value: 1,
      unit: "mål",
    });
  }

  return highlights.slice(0, 12);
}

function pushHighlight(highlights: TechnicalReportPlayerHighlight[], used: Set<string>, highlight: TechnicalReportPlayerHighlight) {
  const key = `${highlight.teamSide ?? "neutral"}-${highlight.playerName}-${highlight.label}`;
  if (used.has(key)) return;
  used.add(key);
  highlights.push(highlight);
}

async function fetchAndParseReport(
  match: WorldCupMatch,
  url: string,
  fetchedAt: string,
  fetcher: typeof fetch,
  extractPdfText: (data: Uint8Array) => Promise<string>,
) {
  try {
    const response = await fetcher(url, { cache: "no-store" });
    if (!response.ok) return unavailableReport(match, url, fetchedAt, `FIFA-rapporten svarte ${response.status}.`);
    return parseFifaTechnicalReportText({
      match,
      sourceUrl: url,
      fetchedAt,
      text: await extractPdfText(new Uint8Array(await response.arrayBuffer())),
    });
  } catch (error) {
    return unavailableReport(match, url, fetchedAt, error instanceof Error ? error.message : "Ukjent PDF-feil.");
  }
}

function unavailableReport(match: WorldCupMatch, sourceUrl: string, fetchedAt: string, reason: string): MatchTechnicalReport {
  return {
    matchId: match.id,
    sourceUrl,
    fetchedAt,
    parsedAt: new Date().toISOString(),
    parseStatus: "unavailable",
    unavailableReason: reason,
    metrics: [],
    phases: [],
    playerHighlights: [],
    notes: [reason],
  };
}

function sideFromContext(text: string, index: number, match: WorldCupMatch): TeamSide | null {
  const context = text.slice(Math.max(0, index - 900), index + 120).toLowerCase();
  const homeIndex = context.lastIndexOf(match.homeTeam.toLowerCase());
  const awayIndex = context.lastIndexOf(match.awayTeam.toLowerCase());
  if (homeIndex === -1 && awayIndex === -1) return null;
  return homeIndex > awayIndex ? "home" : "away";
}

function normalizeText(text: string) {
  return text.replace(/\u0000/g, "f").replace(/[‐‑‒–—−]/g, "-").replace(/\s+/g, " ").trim();
}

function num(value: string | undefined) {
  const parsed = Number(value?.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

function titleCaseName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => (part.length <= 3 && part === part.toUpperCase() ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
    .join(" ");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const stateId = "tippekjelleren-vm2026";
const blobPath = "state/tippekjelleren-vm2026.json";
const analysisPath = path.join(root, "src", "data", "match-analyses.json");
const localStatePath = path.join(root, ".data", "tippekjelleren-state.json");
const jsonMode = process.argv.includes("--json");

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const state = await readState();
if (!state) {
  finish({
    ok: false,
    message: "Fant ingen app-state i Postgres, Blob eller lokal .data-fil.",
    pending: [],
  });
}

const analyses = await readAnalyses();
const analysisByMatch = new Map(analyses.map((analysis) => [analysis.matchId, analysis]));
const statsByMatch = new Map((state.matchStats ?? []).map((stats) => [stats.matchId, stats]));
const lineupsByMatch = new Map((state.lineups ?? []).map((lineup) => [lineup.matchId, lineup]));

const pending = (state.matches ?? [])
  .filter((match) => match.status === "finished" && match.result)
  .filter((match) => {
    const analysis = analysisByMatch.get(match.id);
    return !analysis || analysis.status === "preliminary";
  })
  .map((match) => {
    const analysis = analysisByMatch.get(match.id);
    return {
      match,
      analysisStatus: analysis?.status ?? "missing",
      stats: statsByMatch.get(match.id) ?? null,
      lineup: lineupsByMatch.get(match.id) ?? null,
      events: (state.matchEvents ?? []).filter((event) => event.matchId === match.id),
    };
  });

finish({
  ok: true,
  generatedAt: new Date().toISOString(),
  analysisPath: path.relative(root, analysisPath),
  pending,
});

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

async function readAnalyses() {
  try {
    return JSON.parse(await readFile(analysisPath, "utf8"));
  } catch {
    return [];
  }
}

async function readState() {
  return (await readDatabaseState()) ?? (await readBlobState()) ?? (await readLocalState());
}

async function readDatabaseState() {
  if (!process.env.DATABASE_URL) return null;
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });
  try {
    const rows = await sql`
      select data from tippekjelleren_state where id = ${stateId} limit 1
    `;
    return rows[0]?.data ?? null;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function readBlobState() {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) return null;
  const { get } = await import("@vercel/blob");
  const result = await get(blobPath, { access: "private", useCache: false });
  if (!result?.stream) return null;
  return JSON.parse(await new Response(result.stream).text());
}

async function readLocalState() {
  try {
    return JSON.parse(await readFile(localStatePath, "utf8"));
  } catch {
    return null;
  }
}

function finish(payload) {
  if (jsonMode) {
    console.log(JSON.stringify(payload, null, 2));
    process.exit(payload.ok ? 0 : 1);
  }

  if (!payload.ok) {
    console.log(payload.message);
    process.exit(1);
  }

  if (!payload.pending.length) {
    console.log("Ingen ferdigspilte kamper mangler taktisk analyse.");
    return;
  }

  console.log(`${payload.pending.length} ferdigspilte kamper trenger analyse eller TSG-berikelse:`);
  for (const item of payload.pending) {
    console.log(`- Kamp ${item.match.matchNumber}: ${item.match.homeTeam} - ${item.match.awayTeam} (${item.analysisStatus})`);
  }
}

import { spawn } from "node:child_process";
import { access, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const MANIFEST_FILE = "src/lib/world-cup-image-assets.generated.ts";
const PUBLIC_ROOT = "public";
const API_URL = "https://commons.wikimedia.org/w/api.php";
const WIDTH = 720;
const MIN_ASSETS = 100;
const CONCURRENCY = 5;
const USER_AGENT = "TippekjellerenLocal/1.0 (private VM nostalgia asset downloader)";
const downloadUrlCache = new Map();

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function readField(block, name) {
  return block.match(new RegExp(`${name}: "([^"]+)"`))?.[1] ?? "";
}

function parseAssets(text) {
  return [...text.matchAll(/  \{\n[\s\S]*?\n  \}/g)].map((match) => {
    const block = match[0];
    return {
      block,
      sourceUrl: readField(block, "sourceUrl"),
      src: readField(block, "src"),
    };
  });
}

function redirectUrl(sourceUrl) {
  const url = new URL(sourceUrl);
  const wikiTitle = decodeURIComponent(url.pathname.replace(/^\/wiki\//, ""));
  const fileName = wikiTitle.replace(/^File:/, "");
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}?width=${WIDTH}`;
}

function sourceTitle(sourceUrl) {
  const url = new URL(sourceUrl);
  return decodeURIComponent(url.pathname.replace(/^\/wiki\//, "")).replace(/_/g, " ");
}

async function fetchDownloadUrl(sourceUrl) {
  if (downloadUrlCache.has(sourceUrl)) return downloadUrlCache.get(sourceUrl);

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: String(WIDTH),
    titles: sourceTitle(sourceUrl),
  });

  const response = await fetch(`${API_URL}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`metadata ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const pages = Object.values(data.query?.pages ?? {});
  const imageInfo = pages[0]?.imageinfo?.[0];
  const downloadUrl = imageInfo?.thumburl ?? imageInfo?.url ?? redirectUrl(sourceUrl);
  downloadUrlCache.set(sourceUrl, downloadUrl);
  return downloadUrl;
}

async function curlDownload(url, target) {
  await new Promise((resolve, reject) => {
    const child = spawn("curl.exe", [
      "-L",
      "--fail",
      "--silent",
      "--show-error",
      "--connect-timeout",
      "10",
      "--max-time",
      "45",
      "--retry",
      "0",
      "--retry-delay",
      "0",
      "-A",
      USER_AGENT,
      "-o",
      target,
      url,
    ]);
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("curl timeout"));
    }, 55_000);
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `curl exit ${code}`));
    });
  });
}

async function download(asset, index, total) {
  const target = join(PUBLIC_ROOT, asset.src);
  if (await exists(target)) {
    console.log(`Skipping existing ${index + 1}/${total}: ${basename(target)}`);
    return true;
  }
  try {
    await mkdir(dirname(target), { recursive: true });
    console.log(`Downloading ${index + 1}/${total}: ${basename(target)}`);
    await curlDownload(await fetchDownloadUrl(asset.sourceUrl), target);
    const file = await stat(target);
    if (file.size < 1000) throw new Error(`Suspiciously small file (${file.size} bytes)`);
    return true;
  } catch (error) {
    await rm(target, { force: true });
    console.log(`Failed ${basename(target)}: ${error.message}`);
    return false;
  }
}

async function main() {
  const text = await readFile(MANIFEST_FILE, "utf8");
  const assets = parseAssets(text);

  if (process.env.DOWNLOAD_COMMONS_PRUNE_ONLY !== "1") {
    let cursor = 0;

    async function worker() {
      while (cursor < assets.length) {
        const index = cursor;
        cursor += 1;
        await download(assets[index], index, assets.length);
      }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  }

  const kept = [];
  const seenIds = new Set();
  const seenSrcs = new Set();
  for (const asset of assets) {
    const id = readField(asset.block, "id");
    if (seenIds.has(id) || seenSrcs.has(asset.src)) continue;
    if (await exists(join(PUBLIC_ROOT, asset.src))) {
      kept.push(asset.block);
      seenIds.add(id);
      seenSrcs.add(asset.src);
    }
  }

  if (kept.length < MIN_ASSETS) {
    throw new Error(`Only ${kept.length} local assets available; need at least ${MIN_ASSETS}.`);
  }

  const content = `import type { WorldCupImageAsset } from "@/lib/world-cup-image-assets";

export const worldCupImageAssets: WorldCupImageAsset[] = [
${kept.join(",\n")}
];
`;
  await writeFile(MANIFEST_FILE, content, "utf8");
  console.log(`Kept ${kept.length} local assets in ${MANIFEST_FILE}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

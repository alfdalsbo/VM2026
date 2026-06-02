import { readdirSync } from "node:fs";
import { join } from "node:path";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);
const FALLBACK_FILE = "fallback.svg";
const IMAGE_DIR = join(process.cwd(), "public", "daily-images");

function isImageFile(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return false;
  return IMAGE_EXTENSIONS.has(name.slice(dot).toLowerCase());
}

function listManualImageFiles(): string[] {
  try {
    return readdirSync(IMAGE_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && isImageFile(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, "nb"));
  } catch {
    return [];
  }
}

export function getManualDailyImages(): string[] {
  return listManualImageFiles()
    .filter((file) => file !== FALLBACK_FILE)
    .map((file) => `/daily-images/${encodeURIComponent(file)}`);
}

export function pickRandomManualDailyImage(): string | null {
  const images = getManualDailyImages();
  if (images.length === 0) return null;
  return images[Math.floor(Math.random() * images.length)];
}

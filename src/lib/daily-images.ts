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

function listImageFiles(): string[] {
  try {
    return readdirSync(IMAGE_DIR)
      .filter(isImageFile)
      .sort((a, b) => a.localeCompare(b, "nb"));
  } catch {
    return [];
  }
}

/**
 * Every image found in public/daily-images/ (fallback.svg only when the folder
 * is otherwise empty). Returns public paths ready for an <img src>.
 */
export function getDailyImages(): string[] {
  const files = listImageFiles();
  const gallery = files.filter((file) => file !== FALLBACK_FILE);
  const pool = gallery.length > 0 ? gallery : files;
  return pool.map((file) => `/daily-images/${encodeURIComponent(file)}`);
}

/**
 * Deterministic rotation across the full image bank — same date always picks
 * the same image, so alle ser samme bilde samme dag.
 */
export function pickDailyImage(today: string): string | null {
  const images = getDailyImages();
  if (images.length === 0) return null;
  const seed = hashString(today);
  return images[seed % images.length];
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

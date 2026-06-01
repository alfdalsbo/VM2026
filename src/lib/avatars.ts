import { readdirSync } from "node:fs";
import { join } from "node:path";

import type { AppState } from "@/lib/types";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);
const AVATAR_DIR = join(process.cwd(), "public", "avatars");

export type AvatarDisplay = {
  src: string;
  posX: number;
  posY: number;
  scale: number;
};

function isImageFile(name: string): boolean {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return false;
  return IMAGE_EXTENSIONS.has(name.slice(dot).toLowerCase());
}

/**
 * All avatar images available to choose from in public/avatars/.
 * Returns bare filenames (e.g. "maradona.png"), sorted.
 */
export function getAvatarOptions(): string[] {
  try {
    return readdirSync(AVATAR_DIR)
      .filter(isImageFile)
      .sort((a, b) => a.localeCompare(b, "nb"));
  } catch {
    return [];
  }
}

/** Public path for an avatar filename. */
export function avatarSrc(file: string): string {
  return `/avatars/${encodeURIComponent(file)}`;
}

/**
 * The chosen avatar (with framing) for a player, or null when no valid
 * selection exists.
 */
export function getAvatarDisplay(state: AppState, playerId: string): AvatarDisplay | null {
  const selection = (state.avatarSelections ?? []).find((item) => item.playerId === playerId);
  if (!selection) return null;
  if (!getAvatarOptions().includes(selection.avatar)) return null;
  return {
    src: avatarSrc(selection.avatar),
    posX: clampPercent(selection.posX, 50),
    posY: clampPercent(selection.posY, 50),
    scale: clampScaleValue(selection.scale, 1),
  };
}

/** Maps player id -> avatar display for everyone with a valid selection. */
export function getAvatarMap(state: AppState): Record<string, AvatarDisplay> {
  const available = new Set(getAvatarOptions());
  const map: Record<string, AvatarDisplay> = {};
  for (const selection of state.avatarSelections ?? []) {
    if (!available.has(selection.avatar)) continue;
    map[selection.playerId] = {
      src: avatarSrc(selection.avatar),
      posX: clampPercent(selection.posX, 50),
      posY: clampPercent(selection.posY, 50),
      scale: clampScaleValue(selection.scale, 1),
    };
  }
  return map;
}

export function clampPercent(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(100, Math.max(0, num));
}

export function clampScaleValue(value: unknown, fallback: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(3, Math.max(1, num));
}

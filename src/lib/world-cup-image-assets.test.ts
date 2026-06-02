import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { chooseFreshWorldCupImage } from "@/lib/world-cup-image-freshness";
import {
  getApprovedWorldCupImages,
  getHomeWorldCupImages,
  getRelevantWorldCupImages,
  isAllowedWorldCupImageLicense,
  isHomeEligibleWorldCupImage,
  scoreWorldCupImage,
  worldCupImageAssets,
} from "@/lib/world-cup-image-assets";

describe("world-cup image assets", () => {
  it("keeps a large approved local Commons image bank", () => {
    const approved = getApprovedWorldCupImages({ includeFallback: false });
    const ids = new Set(approved.map((asset) => asset.id));

    expect(approved.length).toBeGreaterThanOrEqual(100);
    expect(ids.size).toBe(approved.length);

    for (const asset of approved) {
      expect(asset.src).toMatch(/^\/daily-images\/commons\//);
      expect(existsSync(join(process.cwd(), "public", asset.src))).toBe(true);
      expect(asset.alt.trim().length).toBeGreaterThan(20);
      expect(asset.caption.trim().length).toBeGreaterThan(20);
      expect(asset.context.trim().length).toBeGreaterThan(40);
      expect(asset.facts.length).toBeGreaterThanOrEqual(1);
      expect(asset.facts.length).toBeLessThanOrEqual(3);
      expect(asset.credit.trim().length).toBeGreaterThan(3);
      expect(isAllowedWorldCupImageLicense(asset.license)).toBe(true);
      expect(asset.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(asset.tags.length).toBeGreaterThan(0);
      expect(["contain", "cover"]).toContain(asset.displayMode);
      expect(typeof asset.cropSafe).toBe("boolean");
      expect(typeof asset.homeEligible).toBe("boolean");
      expect(`${asset.title} ${asset.tags.join(" ")}`).not.toMatch(/logo|wordmark|emblem|mascot|trophy/i);
    }
  });

  it("keeps home images full-frame and filters weak front-page assets", () => {
    const homeImages = getHomeWorldCupImages({ surface: "home" }, 100);
    const norwayHomeImages = getHomeWorldCupImages({ teams: ["Norge"], momentId: "norway-return-2026", tags: ["diagram"] }, 5);

    expect(homeImages.length).toBeGreaterThanOrEqual(40);
    expect(homeImages.every(isHomeEligibleWorldCupImage)).toBe(true);
    expect(homeImages.every((asset) => asset.displayMode === "contain")).toBe(true);
    expect(homeImages.some((asset) => /federal interagency|coordination plan|octopus/i.test(`${asset.title} ${asset.tags.join(" ")}`))).toBe(false);
    expect(norwayHomeImages[0]?.id).toBe("flopass3-e5ebe8bf");
    expect(norwayHomeImages[0]?.displayMode).toBe("contain");
  });

  it("scores Norway and final contexts toward relevant assets", () => {
    const norway = getRelevantWorldCupImages({ teams: ["Norge"], momentId: "norway-return-2026", tags: ["diagram"] }, 3);
    expect(norway[0]?.id).toBe("flopass3-e5ebe8bf");

    const brazilFinal = getRelevantWorldCupImages({ teams: ["Brasil", "Italia"], stage: "final", tags: ["1970"] }, 5);
    expect(brazilFinal.some((asset) => asset.tags.includes("1970"))).toBe(true);
    expect(scoreWorldCupImage(brazilFinal[0], { stage: "final" })).toBeGreaterThan(0);

    const argentina = getRelevantWorldCupImages({ teams: ["Argentina"], momentId: "maradona-1986", tags: ["1986"] }, 5);
    expect(argentina.some((asset) => asset.teams.includes("Argentina") || asset.tags.includes("argentina"))).toBe(true);

    const franceSenegal = getRelevantWorldCupImages({ teams: ["Frankrike", "Senegal"], tags: ["2002"] }, 5);
    expect(franceSenegal.some((asset) => asset.tags.includes("senegal") || asset.tags.includes("france"))).toBe(true);

    const englandCroatia = getRelevantWorldCupImages({ teams: ["England", "Kroatia"], tags: ["2018"], stage: "semifinal" }, 5);
    expect(englandCroatia.some((asset) => asset.teams.includes("England") || asset.teams.includes("Croatia"))).toBe(true);
  });

  it("falls back to approved VM images when the daily context has no obvious hook", () => {
    const fallback = getRelevantWorldCupImages({ teams: ["Atlantis"], tags: ["fictional-context"], seed: "fallback" }, 5);

    expect(fallback).toHaveLength(5);
    expect(fallback.every((asset) => getApprovedWorldCupImages({ includeFallback: false }).some((approved) => approved.id === asset.id))).toBe(true);
  });

  it("selects fresh images outside recent global and surface history", () => {
    const pool = worldCupImageAssets.slice(0, 5);
    const next = chooseFreshWorldCupImage({
      pool,
      currentId: pool[0].id,
      seen: { global: [pool[1].id], surfaces: { home: [pool[2].id] } },
      surfaceKey: "home",
      seed: "freshness-test",
    });

    expect([pool[0].id, pool[1].id, pool[2].id]).not.toContain(next.id);
  });
});

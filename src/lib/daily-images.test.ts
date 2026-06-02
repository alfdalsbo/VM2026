import { describe, expect, it } from "vitest";

import { dailyImageAssets, getDailyImages } from "@/lib/daily-images";
import { isAllowedWorldCupImageLicense } from "@/lib/world-cup-image-assets";

describe("daily image manifest", () => {
  it("requires context and license metadata for every approved photo", () => {
    const approvedPhotos = dailyImageAssets.filter((asset) => asset.approved);

    expect(approvedPhotos.length).toBeGreaterThanOrEqual(100);
    for (const asset of approvedPhotos) {
      expect(asset.src).toMatch(/^\/daily-images\//);
      expect(asset.alt.trim().length).toBeGreaterThan(20);
      expect(asset.caption.trim().length).toBeGreaterThan(20);
      expect(asset.context.trim().length).toBeGreaterThan(40);
      expect(asset.facts.length).toBeGreaterThanOrEqual(1);
      expect(asset.credit.trim().length).toBeGreaterThanOrEqual(3);
      expect(isAllowedWorldCupImageLicense(asset.license)).toBe(true);
      expect(asset.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  });

  it("does not return unclear local photos in the production image bank", () => {
    const productionImages = getDailyImages();
    const allManifestImages = getDailyImages({ includeUnapproved: true });

    expect(productionImages.some((asset) => !asset.approved)).toBe(false);
    expect(allManifestImages.some((asset) => !asset.approved)).toBe(true);
  });

  it("returns a typographic fallback if no approved image is available", () => {
    const unapproved = dailyImageAssets.find((asset) => !asset.approved);
    if (!unapproved) throw new Error("Missing unapproved fixture image");

    const images = getDailyImages({ assets: [unapproved] });

    expect(images).toHaveLength(1);
    expect(images[0]?.id).toBe("typographic-archive-fallback");
    expect(images[0]?.src).toBe("/daily-images/fallback.svg");
  });
});

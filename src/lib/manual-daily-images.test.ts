import { describe, expect, it } from "vitest";

import { getManualDailyImages, pickRandomManualDailyImage } from "@/lib/manual-daily-images";

describe("manual daily images", () => {
  it("uses Vegard's local top-gallery files only", () => {
    const images = getManualDailyImages();

    expect(images).toHaveLength(35);
    expect(images).not.toContain("/daily-images/fallback.svg");
    expect(images.every((image) => image.startsWith("/daily-images/"))).toBe(true);
    expect(images.every((image) => !image.includes("/commons/"))).toBe(true);
  });

  it("picks a manual image from the same pool", () => {
    const images = getManualDailyImages();
    const picked = pickRandomManualDailyImage();

    expect(picked).not.toBeNull();
    expect(images).toContain(picked);
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("sync schedules", () => {
  it("uses GitHub Actions for 15-minute polling and Vercel Cron only as a daily fallback", () => {
    const root = process.cwd();
    const workflow = readFileSync(path.join(root, ".github", "workflows", "sync-world-cup.yml"), "utf8");
    const vercel = JSON.parse(readFileSync(path.join(root, "vercel.json"), "utf8")) as { crons: Array<{ schedule: string }> };

    expect(workflow).toContain('cron: "3,18,33,48 * * 6,7 *"');
    expect(vercel.crons[0]?.schedule).toBe("11 4 * 6,7 *");
  });
});

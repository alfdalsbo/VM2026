import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("sync schedules", () => {
  it("keeps post-tournament sync manual while preserving daily Vercel fallback and deploy-stille arbeidsgrener", () => {
    const root = process.cwd();
    const workflow = readFileSync(path.join(root, ".github", "workflows", "sync-world-cup.yml"), "utf8");
    const vercel = JSON.parse(readFileSync(path.join(root, "vercel.json"), "utf8")) as {
      crons: Array<{ schedule: string }>;
      git: { deploymentEnabled: Record<string, boolean> };
    };

    expect(workflow).not.toContain("schedule:");
    expect(workflow).toContain("workflow_dispatch:");
    expect(vercel.crons[0]?.schedule).toBe("11 4 * 6,7 *");
    expect(vercel.git.deploymentEnabled).toEqual({ "**": false, main: true });
  });
});

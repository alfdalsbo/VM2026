import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/sync/world-cup/route";

describe("/api/sync/world-cup", () => {
  it("rejects requests without the cron secret", async () => {
    const response = await GET(new Request("https://tippekjelleren.test/api/sync/world-cup"));
    expect(response.status).toBe(401);
  });
});

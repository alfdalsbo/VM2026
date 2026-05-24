import { describe, expect, it } from "vitest";

import { createShareToken, parseShareToken } from "@/lib/share-card";

describe("share-card tokens", () => {
  it("round-trips a signed share card", () => {
    const token = createShareToken({ playerId: "alf", matchId: "m001", issuedAt: 1 });
    expect(parseShareToken(token)).toEqual({ playerId: "alf", matchId: "m001", issuedAt: 1 });
  });

  it("rejects tampered tokens", () => {
    const token = createShareToken({ playerId: "alf", matchId: "m001", issuedAt: 1 });
    const [payload, signature] = token.split(".");
    const tampered = `${payload.replace(/.$/, "x")}.${signature}`;
    expect(parseShareToken(tampered)).toBeNull();
  });
});

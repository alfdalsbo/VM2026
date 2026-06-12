import { describe, expect, it, vi } from "vitest";

const blobMock = vi.hoisted(() => {
  class BlobPreconditionFailedError extends Error {
    constructor() {
      super("Precondition failed: ETag mismatch.");
      this.name = "BlobPreconditionFailedError";
    }
  }

  return {
    get: vi.fn(),
    put: vi.fn(),
    BlobPreconditionFailedError,
  };
});

vi.mock("@vercel/blob", () => blobMock);

import { defaultPrediction, savePredictionInState } from "@/lib/scoring";
import { initialState, mutateAppState } from "@/lib/state";
import type { AppState } from "@/lib/types";

const beforeVm = new Date("2026-06-01T10:00:00Z");

function blobResult(state: AppState, etag: string) {
  return {
    statusCode: 200,
    stream: new Response(JSON.stringify(state)).body,
    headers: new Headers(),
    blob: {
      url: "https://blob.test/state.json",
      downloadUrl: "https://blob.test/state.json?download=1",
      pathname: "state/tippekjelleren-vm2026.json",
      contentDisposition: "inline",
      cacheControl: "max-age=60",
      uploadedAt: new Date("2026-06-01T10:00:00Z"),
      etag,
      contentType: "application/json",
      size: 123,
    },
  };
}

describe("mutateAppState", () => {
  it("retries Vercel Blob mutations when another write changed the ETag", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.DATABASE_URL;
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_store_secret";
    blobMock.get.mockReset();
    blobMock.put.mockReset();

    try {
      const initial = initialState();
      const dannyTip = {
        ...defaultPrediction("danny", "m001"),
        homeGoals: 1,
        awayGoals: 0,
        updatedAt: "2026-06-01T10:01:00Z",
      };
      const concurrentState = { ...initial, predictions: [dannyTip] };
      const written = { state: null as AppState | null };

      blobMock.get
        .mockResolvedValueOnce(blobResult(initial, "etag-1"))
        .mockResolvedValueOnce(blobResult(concurrentState, "etag-2"));
      blobMock.put
        .mockRejectedValueOnce(new blobMock.BlobPreconditionFailedError())
        .mockImplementationOnce(async (_pathname, body) => {
          written.state = JSON.parse(String(body)) as AppState;
          return {};
        });

      const next = await mutateAppState((current) =>
        savePredictionInState(
          current,
          {
            ...defaultPrediction("steinar", "m001"),
            homeGoals: 2,
            awayGoals: 1,
            updatedAt: "2026-06-01T10:02:00Z",
          },
          beforeVm,
        ),
      );

      expect(blobMock.get).toHaveBeenCalledTimes(2);
      expect(blobMock.put).toHaveBeenNthCalledWith(
        1,
        "state/tippekjelleren-vm2026.json",
        expect.any(String),
        expect.objectContaining({ ifMatch: "etag-1" }),
      );
      expect(blobMock.put).toHaveBeenNthCalledWith(
        2,
        "state/tippekjelleren-vm2026.json",
        expect.any(String),
        expect.objectContaining({ ifMatch: "etag-2" }),
      );
      expect(next.predictions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ playerId: "danny", matchId: "m001" }),
          expect.objectContaining({ playerId: "steinar", matchId: "m001" }),
        ]),
      );
      expect(written.state).not.toBeNull();
      expect(written.state?.predictions).toEqual(next.predictions);
    } finally {
      if (originalDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = originalDatabaseUrl;
      }
      if (originalBlobToken === undefined) {
        delete process.env.BLOB_READ_WRITE_TOKEN;
      } else {
        process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
      }
    }
  });
});

declare const Deno: {
  test(name: string, testFunction: () => void | Promise<void>): void;
};

import type { DiagnosticsResponse } from "../../../shared/diagnostics.ts";
import { updateDiagnosticsHistory } from "./diagnostics-history.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertExists<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function createDiagnosticsResponse(
  generatedAt: string,
  roomId = "dots",
): DiagnosticsResponse {
  return {
    generatedAt,
    rooms: [
      {
        id: roomId,
        name: "Dot Arena",
        active: true,
        playerCount: 2,
        socketCount: 2,
        bulletCount: 3,
        rockCount: 25,
        cactusCount: 30,
        tickCount: 42,
        tickDurationMilliseconds: {
          lastMilliseconds: 1,
          averageMilliseconds: 2,
          maxMilliseconds: 3,
        },
        network: {
          lastGameStateBytes: 400,
          totalGameStateBytes: 800,
          lastGameStateRecipientCount: 2,
          skippedGameStateCount: 1,
          lastMaxBufferedBytes: 16,
          maxBufferedBytes: 32,
        },
      },
    ],
  };
}

Deno.test("diagnostics history appends samples for active rooms", () => {
  const history = updateDiagnosticsHistory(
    new Map(),
    createDiagnosticsResponse("2026-05-18T10:00:00.000Z"),
  );

  const samples = assertExists(history.get("dots"), "room should have history");

  assert(samples.length === 1, "room should have one sample");
  assert(
    samples[0].averageTickMilliseconds === 2,
    "average tick should be copied into history",
  );
  assert(samples[0].payloadBytes === 400, "payload should be copied");
});

Deno.test("diagnostics history removes rooms missing from new responses", () => {
  const firstHistory = updateDiagnosticsHistory(
    new Map(),
    createDiagnosticsResponse("2026-05-18T10:00:00.000Z", "dots"),
  );

  const nextHistory = updateDiagnosticsHistory(firstHistory, {
    generatedAt: "2026-05-18T10:00:01.000Z",
    rooms: [],
  });

  assert(!nextHistory.has("dots"), "missing rooms should be removed");
});

Deno.test("diagnostics history prunes samples outside the one-hour window", () => {
  const oldHistory = updateDiagnosticsHistory(
    new Map(),
    createDiagnosticsResponse("2026-05-18T10:00:00.000Z"),
  );

  const nextHistory = updateDiagnosticsHistory(
    oldHistory,
    createDiagnosticsResponse("2026-05-18T11:00:01.000Z"),
  );

  const samples = assertExists(
    nextHistory.get("dots"),
    "room should have history",
  );

  assert(samples.length === 1, "old samples should be pruned");
  assert(
    samples[0].sampledAtMilliseconds ===
      new Date("2026-05-18T11:00:01.000Z").getTime(),
    "remaining sample should be the newest one",
  );
});

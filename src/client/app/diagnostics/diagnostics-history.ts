import type { DiagnosticsResponse } from "../../../shared/diagnostics.ts";

export interface RoomHistorySample {
  sampledAtMilliseconds: number;
  averageTickMilliseconds: number;
  payloadBytes: number;
  bufferedBytes: number;
  skippedSnapshots: number;
  playerCount: number;
  bulletCount: number;
}

export type RoomHistoryById = Map<string, RoomHistorySample[]>;

const historyWindowMilliseconds = 60 * 60 * 1000;

export function updateDiagnosticsHistory(
  currentHistory: RoomHistoryById,
  diagnostics: DiagnosticsResponse,
): RoomHistoryById {
  const nextHistory: RoomHistoryById = new Map(currentHistory);
  const sampledAtMilliseconds = new Date(diagnostics.generatedAt).getTime();
  const minimumSampleTime = sampledAtMilliseconds - historyWindowMilliseconds;
  const activeRoomIds = new Set(diagnostics.rooms.map((room) => room.id));

  for (const room of diagnostics.rooms) {
    const samples = [...(nextHistory.get(room.id) ?? [])];
    samples.push({
      sampledAtMilliseconds,
      averageTickMilliseconds:
        room.tickDurationMilliseconds.averageMilliseconds,
      payloadBytes: room.network.lastGameStateBytes,
      bufferedBytes: room.network.lastMaxBufferedBytes,
      skippedSnapshots: room.network.skippedGameStateCount,
      playerCount: room.playerCount,
      bulletCount: room.bulletCount,
    });

    while (
      samples.length > 0 &&
      samples[0].sampledAtMilliseconds < minimumSampleTime
    ) {
      samples.shift();
    }

    nextHistory.set(room.id, samples);
  }

  for (const roomId of nextHistory.keys()) {
    if (!activeRoomIds.has(roomId)) nextHistory.delete(roomId);
  }

  return nextHistory;
}

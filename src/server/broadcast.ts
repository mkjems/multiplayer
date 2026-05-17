import {
  MAX_SOCKET_BUFFERED_BYTES,
  METRICS_AVERAGE_WEIGHT,
} from "./game-constants.ts";
import type { BroadcastResult, GameRoom } from "./game-types.ts";

const textEncoder = new TextEncoder();

export function getPayloadByteLength(payload: string): number {
  return textEncoder.encode(payload).length;
}

export function broadcast(
  room: GameRoom,
  msg: string,
  options: { dropIfBackedUp?: boolean } = {},
): BroadcastResult {
  let sentCount = 0;
  let skippedCount = 0;
  let maxBufferedBytes = 0;

  for (const [id, socket] of room.sockets) {
    try {
      if (socket.readyState !== WebSocket.OPEN) continue;
      maxBufferedBytes = Math.max(maxBufferedBytes, socket.bufferedAmount);
      if (
        options.dropIfBackedUp &&
        socket.bufferedAmount > MAX_SOCKET_BUFFERED_BYTES
      ) {
        skippedCount++;
        continue;
      }
      socket.send(msg);
      sentCount++;
    } catch {
      room.handleSocketError(id);
    }
  }

  return { sentCount, skippedCount, maxBufferedBytes };
}

export function recordTickDuration(
  room: GameRoom,
  durationMilliseconds: number,
): void {
  const tickDuration = room.metrics.tickDuration;
  room.metrics.tickCount++;
  tickDuration.lastMilliseconds = durationMilliseconds;
  tickDuration.maxMilliseconds = Math.max(
    tickDuration.maxMilliseconds,
    durationMilliseconds,
  );
  tickDuration.averageMilliseconds = tickDuration.averageMilliseconds === 0
    ? durationMilliseconds
    : tickDuration.averageMilliseconds * (1 - METRICS_AVERAGE_WEIGHT) +
      durationMilliseconds * METRICS_AVERAGE_WEIGHT;
}

export function recordGameStateBroadcast(
  room: GameRoom,
  payloadBytes: number,
  broadcastResult: BroadcastResult,
): void {
  const network = room.metrics.network;
  network.lastGameStateBytes = payloadBytes;
  network.totalGameStateBytes += payloadBytes * broadcastResult.sentCount;
  network.lastGameStateRecipientCount = broadcastResult.sentCount;
  network.skippedGameStateCount += broadcastResult.skippedCount;
  network.lastMaxBufferedBytes = broadcastResult.maxBufferedBytes;
  network.maxBufferedBytes = Math.max(
    network.maxBufferedBytes,
    broadcastResult.maxBufferedBytes,
  );
}

import type { GameInfo } from "../shared/protocol.ts";
import type { RoomDiagnostics } from "../shared/diagnostics.ts";
import { findSafeSpawnPosition, generateArena } from "./arena.ts";
import { TICK_MS } from "./game-constants.ts";
import type { GameRoom, RoomPerformanceMetrics } from "./game-types.ts";
import { createPlayer } from "./player.ts";
import { tick } from "./simulation.ts";

const rooms = new Map<string, GameRoom>();

function createRoomPerformanceMetrics(): RoomPerformanceMetrics {
  return {
    tickCount: 0,
    tickDuration: {
      lastMilliseconds: 0,
      averageMilliseconds: 0,
      maxMilliseconds: 0,
    },
    network: {
      lastGameStateBytes: 0,
      totalGameStateBytes: 0,
      lastGameStateRecipientCount: 0,
      skippedGameStateCount: 0,
      lastMaxBufferedBytes: 0,
      maxBufferedBytes: 0,
    },
  };
}

export function createRoom(
  id: string,
  name: string,
  maxPlayers = 8,
): GameRoom {
  const { rocks, cacti } = generateArena();
  const room: GameRoom = {
    id,
    name,
    maxPlayers,
    players: new Map(),
    sockets: new Map(),
    bullets: [],
    rocks,
    cacti,
    gameOver: false,
    interval: null,
    metrics: createRoomPerformanceMetrics(),
    handleSocketError: (playerId) => leaveRoom(room, playerId),
  };
  rooms.set(id, room);
  return room;
}

function startRoomInterval(room: GameRoom): void {
  if (room.interval !== null) return;
  room.interval = setInterval(() => tick(room), TICK_MS);
}

function stopRoomInterval(room: GameRoom): void {
  if (room.interval === null) return;
  clearInterval(room.interval);
  room.interval = null;
}

function resetRoomArena(room: GameRoom): void {
  room.gameOver = false;
  const { rocks, cacti } = generateArena();
  room.rocks = rocks;
  room.cacti = cacti;
  room.bullets = [];
}

export function getRoom(id: string): GameRoom | undefined {
  return rooms.get(id);
}

export function listRooms(): GameInfo[] {
  return [...rooms.values()].map((r) => ({
    id: r.id,
    name: r.name,
    playerCount: r.players.size,
    maxPlayers: r.maxPlayers,
    status: r.players.size > 0 ? "playing" : "waiting",
  }));
}

export function getRoomDiagnostics(): RoomDiagnostics[] {
  return [...rooms.values()].map((room) => ({
    id: room.id,
    name: room.name,
    active: room.interval !== null,
    playerCount: room.players.size,
    socketCount: room.sockets.size,
    bulletCount: room.bullets.length,
    rockCount: room.rocks.length,
    cactusCount: room.cacti.length,
    tickCount: room.metrics.tickCount,
    tickDurationMilliseconds: { ...room.metrics.tickDuration },
    network: { ...room.metrics.network },
  }));
}

export function joinRoom(
  room: GameRoom,
  playerId: string,
  playerName: string,
  socket: WebSocket,
): void {
  const wasEmpty = room.players.size === 0;
  const player = createPlayer(playerId, playerName);
  const spawn = findSafeSpawnPosition(room);
  player.x = spawn.x;
  player.y = spawn.y;
  room.players.set(playerId, player);
  room.sockets.set(playerId, socket);
  if (wasEmpty) startRoomInterval(room);
}

export function leaveRoom(room: GameRoom, playerId: string): void {
  room.players.delete(playerId);
  room.sockets.delete(playerId);
  if (room.players.size === 0) {
    stopRoomInterval(room);
    resetRoomArena(room);
  }
}

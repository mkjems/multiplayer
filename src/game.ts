import { createPlayer, toSnapshot, type Player } from "./player.ts";
import type { GameInfo, PlayerSnapshot } from "./protocol.ts";

const SPEED = 3;
const TICK_MS = 50;

export interface GameRoom {
  id: string;
  name: string;
  maxPlayers: number;
  players: Map<string, Player>;
  sockets: Map<string, WebSocket>;
  interval: number | null;
}

const rooms = new Map<string, GameRoom>();

export function createRoom(id: string, name: string, maxPlayers = 8): GameRoom {
  const room: GameRoom = {
    id,
    name,
    maxPlayers,
    players: new Map(),
    sockets: new Map(),
    interval: null,
  };
  rooms.set(id, room);
  room.interval = setInterval(() => tick(room), TICK_MS);
  return room;
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

export function joinRoom(
  room: GameRoom,
  playerId: string,
  playerName: string,
  socket: WebSocket,
) {
  room.players.set(playerId, createPlayer(playerId, playerName));
  room.sockets.set(playerId, socket);
}

export function leaveRoom(room: GameRoom, playerId: string) {
  room.players.delete(playerId);
  room.sockets.delete(playerId);
}

export function applyInput(room: GameRoom, playerId: string, dx: number, dy: number) {
  const player = room.players.get(playerId);
  if (!player) return;
  player.dx = dx;
  player.dy = dy;
}

function tick(room: GameRoom) {
  if (room.players.size === 0) return;

  for (const player of room.players.values()) {
    player.x = Math.max(10, Math.min(990, player.x + player.dx * SPEED));
    player.y = Math.max(10, Math.min(590, player.y + player.dy * SPEED));
  }

  const snapshot: PlayerSnapshot[] = [...room.players.values()].map(toSnapshot);
  const msg = JSON.stringify({ type: "game_state", players: snapshot });

  for (const [id, socket] of room.sockets) {
    try {
      if (socket.readyState === WebSocket.OPEN) socket.send(msg);
    } catch {
      leaveRoom(room, id);
    }
  }
}

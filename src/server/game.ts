import {
  createPlayer,
  type Player,
  toPlayerInfo,
  toSnapshot,
} from "./player.ts";
import type {
  ArenaConfig,
  BulletSnapshot,
  CactusData,
  GameInfo,
  PlayerInfo,
  PlayerStateSnapshot,
  RockData,
  ServerMessage,
} from "../shared/protocol.ts";
import type {
  NetworkMetrics,
  RoomDiagnostics,
  TickDurationMetrics,
} from "../shared/diagnostics.ts";

const MAX_SPEED = 10;
const ACCELERATION = 1;
const IDLE_DRAG = 0;
const STOP_SPEED = 0.05;
const BULLET_SPEED = 22;
const TICK_MS = 50;
const MAX_SOCKET_BUFFERED_BYTES = 256 * 1024;
const METRICS_AVERAGE_WEIGHT = 0.12;
const PLAYER_RADIUS = 16;
const BULLET_RADIUS = 4;
const SHOOT_COOL_DOWN = 400;
const RELOAD_TIME = 2000;
const ARENA_W = 2000;
const ARENA_H = 1500;
const ARM_MAX = Math.PI / 3;
const ARM_LENGTH = 20;
const MAX_ENERGY = 100;
const RATE_OF_ENERGY_LOSS_PR_DISTANCE = 0.12;
const RATE_OF_ENERGY_REGAIN_PR_TIME = 18;

// Arena generation — rock placement
const ROCK_COUNT = 25;
const ROCK_MIN_SIDES = 6;
const ROCK_EXTRA_SIDES = 5;
const ROCK_MIN_RADIUS = 20;
const ROCK_MAX_RADIUS = 95;
const FALLBACK_ROCK_COLS = 5;
const FALLBACK_ROCK_ORIGIN_X = 200;
const FALLBACK_ROCK_COL_STEP = 600;
const FALLBACK_ROCK_ORIGIN_Y = 300;
const FALLBACK_ROCK_ROW_STEP = 700;
const FALLBACK_ROCK_MAX_RADIUS = 35;
const FALLBACK_ROCK_SIDES = 5;

// Arena generation — cactus placement
const CACTUS_COUNT = 30;
const CACTUS_PLACEMENT_RADIUS = 18;
const CACTUS_PLACEMENT_MARGIN_Y = 60;
const FALLBACK_CACTUS_COLS = 5;
const FALLBACK_CACTUS_ORIGIN_X = 300;
const FALLBACK_CACTUS_COL_STEP = 500;
const FALLBACK_CACTUS_ORIGIN_Y = 400;
const FALLBACK_CACTUS_ROW_STEP = 800;

// Arena generation — shared
const PLACEMENT_MAX_ATTEMPTS = 60;
const OBJECT_MIN_SPACING = 40;
const ARENA_PLACEMENT_MARGIN = 120;

// Cactus segment geometry (used for collision and rendering)
export const CACTUS_SEGMENT_COUNT = 5;
export const CACTUS_HALF_WIDTH = 8;
export const CACTUS_SEGMENT_STRIDE = 14;
export const CACTUS_SEGMENT_WIDTH = 16;
export const CACTUS_SEGMENT_HEIGHT = 14;

interface Bullet {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  bounces: number;
}

interface Rock {
  id: string;
  x: number;
  y: number;
  boundingRadius: number;
  vertices: { x: number; y: number }[];
}

interface Cactus {
  id: string;
  x: number;
  y: number;
  segments: boolean[];
}

interface Vector {
  x: number;
  y: number;
}

interface CactusSegmentHit {
  cactus: Cactus;
  segmentIndex: number;
  t: number;
}

interface RoomPerformanceMetrics {
  tickCount: number;
  tickDuration: TickDurationMetrics;
  network: NetworkMetrics;
}

interface BroadcastResult {
  sentCount: number;
  skippedCount: number;
  maxBufferedBytes: number;
}

type CactusDamagedMessage = Extract<
  ServerMessage,
  { type: "cactus_damaged" }
>;

export interface GameRoom {
  id: string;
  name: string;
  maxPlayers: number;
  players: Map<string, Player>;
  sockets: Map<string, WebSocket>;
  bullets: Bullet[];
  rocks: Rock[];
  cacti: Cactus[];
  gameOver: boolean;
  interval: number | null;
  metrics: RoomPerformanceMetrics;
}

const rooms = new Map<string, GameRoom>();
const textEncoder = new TextEncoder();

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

function getPayloadByteLength(payload: string): number {
  return textEncoder.encode(payload).length;
}

function generatePolygonVertices(
  cx: number,
  cy: number,
  minR: number,
  maxR: number,
  sides: number,
): { x: number; y: number }[] {
  const angles = Array.from(
    { length: sides },
    () => Math.random() * Math.PI * 2,
  )
    .sort((a, b) => a - b);
  return angles.map((a) => {
    const r = minR + Math.random() * (maxR - minR);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

function generateArena(): { rocks: Rock[]; cacti: Cactus[] } {
  const placed: Array<{ x: number; y: number; r: number }> = [];
  const rocks: Rock[] = [];
  const cacti: Cactus[] = [];

  function tooClose(x: number, y: number, r: number): boolean {
    for (const o of placed) {
      if (Math.hypot(x - o.x, y - o.y) < r + o.r + OBJECT_MIN_SPACING) {
        return true;
      }
    }
    return false;
  }

  for (let i = 0; i < ROCK_COUNT; i++) {
    let rock: Rock | null = null;
    for (let t = 0; t < PLACEMENT_MAX_ATTEMPTS; t++) {
      const sides = ROCK_MIN_SIDES +
        Math.floor(Math.random() * ROCK_EXTRA_SIDES);
      const cx = ARENA_PLACEMENT_MARGIN +
        Math.random() * (ARENA_W - ARENA_PLACEMENT_MARGIN * 2);
      const cy = ARENA_PLACEMENT_MARGIN +
        Math.random() * (ARENA_H - ARENA_PLACEMENT_MARGIN * 2);
      const vertices = generatePolygonVertices(
        cx,
        cy,
        ROCK_MIN_RADIUS,
        ROCK_MAX_RADIUS,
        sides,
      );
      const br = Math.max(
        ...vertices.map((v) => Math.hypot(v.x - cx, v.y - cy)),
      );
      if (!tooClose(cx, cy, br)) {
        rock = { id: `rock_${i}`, x: cx, y: cy, boundingRadius: br, vertices };
        placed.push({ x: cx, y: cy, r: br });
        break;
      }
    }
    if (!rock) {
      const cx = FALLBACK_ROCK_ORIGIN_X +
        (i % FALLBACK_ROCK_COLS) * FALLBACK_ROCK_COL_STEP;
      const cy = FALLBACK_ROCK_ORIGIN_Y +
        Math.floor(i / FALLBACK_ROCK_COLS) * FALLBACK_ROCK_ROW_STEP;
      const vertices = generatePolygonVertices(
        cx,
        cy,
        ROCK_MIN_RADIUS,
        FALLBACK_ROCK_MAX_RADIUS,
        FALLBACK_ROCK_SIDES,
      );
      const br = Math.max(
        ...vertices.map((v) => Math.hypot(v.x - cx, v.y - cy)),
      );
      rock = { id: `rock_${i}`, x: cx, y: cy, boundingRadius: br, vertices };
      placed.push({ x: cx, y: cy, r: br });
    }
    rocks.push(rock);
  }

  for (let i = 0; i < CACTUS_COUNT; i++) {
    let cactus: Cactus | null = null;
    for (let t = 0; t < PLACEMENT_MAX_ATTEMPTS; t++) {
      const x = ARENA_PLACEMENT_MARGIN +
        Math.random() * (ARENA_W - ARENA_PLACEMENT_MARGIN * 2);
      const y = CACTUS_PLACEMENT_MARGIN_Y +
        Math.random() * (ARENA_H - ARENA_PLACEMENT_MARGIN * 2);
      if (!tooClose(x, y, CACTUS_PLACEMENT_RADIUS)) {
        cactus = {
          id: `cactus_${i}`,
          x,
          y,
          segments: Array(CACTUS_SEGMENT_COUNT).fill(true),
        };
        placed.push({ x, y, r: CACTUS_PLACEMENT_RADIUS });
        break;
      }
    }
    if (!cactus) {
      const x = FALLBACK_CACTUS_ORIGIN_X +
        (i % FALLBACK_CACTUS_COLS) * FALLBACK_CACTUS_COL_STEP;
      const y = FALLBACK_CACTUS_ORIGIN_Y +
        Math.floor(i / FALLBACK_CACTUS_COLS) * FALLBACK_CACTUS_ROW_STEP;
      cactus = {
        id: `cactus_${i}`,
        x,
        y,
        segments: Array(CACTUS_SEGMENT_COUNT).fill(true),
      };
      placed.push({ x, y, r: CACTUS_PLACEMENT_RADIUS });
    }
    cacti.push(cactus);
  }

  return { rocks, cacti };
}

export function getRockData(room: GameRoom): RockData[] {
  return room.rocks.map((r) => ({
    id: r.id,
    x: r.x,
    y: r.y,
    vertices: r.vertices,
  }));
}

export function getCactiData(room: GameRoom): CactusData[] {
  return room.cacti.map((c) => ({
    id: c.id,
    x: c.x,
    y: c.y,
    segments: [...c.segments],
  }));
}

export function getPlayerInfos(room: GameRoom): PlayerInfo[] {
  return [...room.players.values()].map(toPlayerInfo);
}

export function getArenaConfig(): ArenaConfig {
  return {
    arenaWidth: ARENA_W,
    arenaHeight: ARENA_H,
    armMax: ARM_MAX,
    armLength: ARM_LENGTH,
    cactusHalfWidth: CACTUS_HALF_WIDTH,
    cactusSegmentStride: CACTUS_SEGMENT_STRIDE,
    cactusSegmentWidth: CACTUS_SEGMENT_WIDTH,
    cactusSegmentHeight: CACTUS_SEGMENT_HEIGHT,
  };
}

export function createRoom(id: string, name: string, maxPlayers = 8): GameRoom {
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

function findSafeSpawnPosition(room: GameRoom): { x: number; y: number } {
  for (let attempt = 0; attempt < PLACEMENT_MAX_ATTEMPTS; attempt++) {
    const x = ARENA_PLACEMENT_MARGIN +
      Math.random() * (ARENA_W - ARENA_PLACEMENT_MARGIN * 2);
    const y = ARENA_PLACEMENT_MARGIN +
      Math.random() * (ARENA_H - ARENA_PLACEMENT_MARGIN * 2);

    let safe = true;
    for (const rock of room.rocks) {
      if (
        Math.hypot(x - rock.x, y - rock.y) <
          rock.boundingRadius + PLAYER_RADIUS + OBJECT_MIN_SPACING
      ) {
        safe = false;
        break;
      }
    }
    if (!safe) continue;

    for (const cactus of room.cacti) {
      if (
        Math.hypot(x - cactus.x, y - cactus.y) <
          CACTUS_PLACEMENT_RADIUS + PLAYER_RADIUS + OBJECT_MIN_SPACING
      ) {
        safe = false;
        break;
      }
    }
    if (safe) return { x, y };
  }
  return { x: PLAYER_RADIUS * 3, y: PLAYER_RADIUS * 3 };
}

export function joinRoom(
  room: GameRoom,
  playerId: string,
  playerName: string,
  socket: WebSocket,
) {
  const wasEmpty = room.players.size === 0;
  const player = createPlayer(playerId, playerName);
  const spawn = findSafeSpawnPosition(room);
  player.x = spawn.x;
  player.y = spawn.y;
  room.players.set(playerId, player);
  room.sockets.set(playerId, socket);
  if (wasEmpty) startRoomInterval(room);
}

export function leaveRoom(room: GameRoom, playerId: string) {
  room.players.delete(playerId);
  room.sockets.delete(playerId);
  if (room.players.size === 0) {
    stopRoomInterval(room);
    resetRoomArena(room);
  }
}

export function applyInput(
  room: GameRoom,
  playerId: string,
  dx: number,
  dy: number,
) {
  const player = room.players.get(playerId);
  if (!player || !player.alive) return;
  player.dx = dx;
  player.dy = dy;
  if (dx > 0) player.facing = "right";
  else if (dx < 0) player.facing = "left";
}

export function setArmAngle(room: GameRoom, playerId: string, angle: number) {
  const player = room.players.get(playerId);
  if (!player || !player.alive) return;
  player.armAngle = Math.max(-ARM_MAX, Math.min(ARM_MAX, angle));
}

export function shoot(room: GameRoom, playerId: string) {
  const player = room.players.get(playerId);
  if (!player || !player.alive || player.reloading || player.ammo <= 0) return;
  const now = Date.now();
  if (now - player.lastShot < SHOOT_COOL_DOWN) return;

  player.ammo--;
  player.lastShot = now;

  const dir = player.facing === "right" ? 1 : -1;
  const vx = dir * BULLET_SPEED * Math.cos(player.armAngle);
  const vy = -BULLET_SPEED * Math.sin(player.armAngle);

  room.bullets.push({
    id: crypto.randomUUID(),
    ownerId: playerId,
    x: player.x + dir * ARM_LENGTH * Math.cos(player.armAngle),
    y: player.y - ARM_LENGTH * Math.sin(player.armAngle),
    vx,
    vy,
    born: now,
    bounces: 0,
  });
}

export function reloadPlayer(room: GameRoom, playerId: string) {
  const player = room.players.get(playerId);
  if (!player || !player.alive || player.reloading || player.ammo >= 6) return;
  player.reloading = true;
  player.reloadStart = Date.now();
}

function broadcast(
  room: GameRoom,
  msg: string,
  options: { dropIfBackedUp: boolean } = { dropIfBackedUp: false },
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
      leaveRoom(room, id);
    }
  }

  return { sentCount, skippedCount, maxBufferedBytes };
}

function recordTickDuration(
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

function recordGameStateBroadcast(
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

function closestPointOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { x: number; y: number } {
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return { x: ax + t * dx, y: ay + t * dy };
}

function segmentIntersectT(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number | null {
  const dx = p2x - p1x, dy = p2y - p1y;
  const ex = bx - ax, ey = by - ay;
  const denom = dx * ey - dy * ex;
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((ax - p1x) * ey - (ay - p1y) * ex) / denom;
  const s = ((ax - p1x) * dy - (ay - p1y) * dx) / denom;
  if (t < 0 || t > 1 || s < 0 || s > 1) return null;
  return t;
}

function sweepBulletRock(
  prevX: number,
  prevY: number,
  newX: number,
  newY: number,
  rock: Rock,
): { t: number; nx: number; ny: number } | null {
  const pathDx = newX - prevX, pathDy = newY - prevY;
  const lenSq = pathDx * pathDx + pathDy * pathDy;
  const tClamped = lenSq < 1e-10 ? 0 : Math.max(
    0,
    Math.min(
      1,
      ((rock.x - prevX) * pathDx + (rock.y - prevY) * pathDy) / lenSq,
    ),
  );
  const closestDist = Math.hypot(
    rock.x - (prevX + tClamped * pathDx),
    rock.y - (prevY + tClamped * pathDy),
  );
  if (closestDist > rock.boundingRadius + BULLET_RADIUS) return null;

  let earliest: { t: number; nx: number; ny: number } | null = null;
  const vertices = rock.vertices;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    const t = segmentIntersectT(prevX, prevY, newX, newY, a.x, a.y, b.x, b.y);
    if (t !== null && (earliest === null || t < earliest.t)) {
      const ex = b.x - a.x, ey = b.y - a.y, el = Math.hypot(ex, ey);
      let nx = -ey / el, ny = ex / el;
      // Orient normal toward bullet's incoming direction, not the polygon center
      // (centroid-based orientation is unreliable for non-convex polygons)
      if (nx * (prevX - a.x) + ny * (prevY - a.y) < 0) {
        nx = -nx;
        ny = -ny;
      }
      earliest = { t, nx, ny };
    }
  }
  return earliest;
}

function segmentRectIntersectT(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
): number | null {
  const dx = toX - fromX;
  const dy = toY - fromY;
  let tMin = 0;
  let tMax = 1;

  if (Math.abs(dx) < 1e-10) {
    if (fromX < rectX || fromX > rectX + rectWidth) return null;
  } else {
    const invDx = 1 / dx;
    let tx1 = (rectX - fromX) * invDx;
    let tx2 = (rectX + rectWidth - fromX) * invDx;
    if (tx1 > tx2) [tx1, tx2] = [tx2, tx1];
    tMin = Math.max(tMin, tx1);
    tMax = Math.min(tMax, tx2);
    if (tMin > tMax) return null;
  }

  if (Math.abs(dy) < 1e-10) {
    if (fromY < rectY || fromY > rectY + rectHeight) return null;
  } else {
    const invDy = 1 / dy;
    let ty1 = (rectY - fromY) * invDy;
    let ty2 = (rectY + rectHeight - fromY) * invDy;
    if (ty1 > ty2) [ty1, ty2] = [ty2, ty1];
    tMin = Math.max(tMin, ty1);
    tMax = Math.min(tMax, ty2);
    if (tMin > tMax) return null;
  }

  return tMin;
}

function sweepBulletCacti(
  prevX: number,
  prevY: number,
  newX: number,
  newY: number,
  cacti: Cactus[],
): CactusSegmentHit | null {
  let earliestHit: CactusSegmentHit | null = null;

  for (const cactus of cacti) {
    for (let i = 0; i < cactus.segments.length; i++) {
      if (!cactus.segments[i]) continue;

      const segmentX = cactus.x - CACTUS_HALF_WIDTH;
      const segmentY = cactus.y + i * CACTUS_SEGMENT_STRIDE;
      const t = segmentRectIntersectT(
        prevX,
        prevY,
        newX,
        newY,
        segmentX - BULLET_RADIUS,
        segmentY - BULLET_RADIUS,
        CACTUS_SEGMENT_WIDTH + BULLET_RADIUS * 2,
        CACTUS_SEGMENT_HEIGHT + BULLET_RADIUS * 2,
      );

      if (t !== null && (earliestHit === null || t < earliestHit.t)) {
        earliestHit = { cactus, segmentIndex: i, t };
      }
    }
  }

  return earliestHit;
}

function reflect(
  vx: number,
  vy: number,
  nx: number,
  ny: number,
): [number, number] {
  const dot = vx * nx + vy * ny;
  return [vx - 2 * dot * nx, vy - 2 * dot * ny];
}

function resolvePlayerRockCollision(player: Player, rock: Rock): void {
  if (
    Math.hypot(player.x - rock.x, player.y - rock.y) >
      rock.boundingRadius + PLAYER_RADIUS
  ) return;

  const vertices = rock.vertices;
  const n = vertices.length;
  let minDist = Infinity;
  let pushX = 0, pushY = 0;

  for (let i = 0; i < n; i++) {
    const a = vertices[i], b = vertices[(i + 1) % n];
    const cp = closestPointOnSegment(player.x, player.y, a.x, a.y, b.x, b.y);
    const dx = player.x - cp.x, dy = player.y - cp.y;
    const dist = Math.hypot(dx, dy);
    if (dist < PLAYER_RADIUS && dist < minDist) {
      minDist = dist;
      if (dist > 0) {
        const overlap = PLAYER_RADIUS - dist;
        pushX = (dx / dist) * overlap;
        pushY = (dy / dist) * overlap;
      } else {
        const ex = b.x - a.x, ey = b.y - a.y, el = Math.hypot(ex, ey);
        pushX = (-ey / el) * PLAYER_RADIUS;
        pushY = (ex / el) * PLAYER_RADIUS;
      }
    }
  }

  if (minDist < Infinity) {
    player.x += pushX;
    player.y += pushY;
  }
}

function resolvePlayerCactusCollision(player: Player, cactus: Cactus): void {
  for (let i = 0; i < cactus.segments.length; i++) {
    if (!cactus.segments[i]) continue;
    const rx = cactus.x - CACTUS_HALF_WIDTH;
    const ry = cactus.y + i * CACTUS_SEGMENT_STRIDE;
    const cx = Math.max(rx, Math.min(rx + CACTUS_SEGMENT_WIDTH, player.x));
    const cy = Math.max(ry, Math.min(ry + CACTUS_SEGMENT_HEIGHT, player.y));
    const dx = player.x - cx, dy = player.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < PLAYER_RADIUS && dist > 0) {
      const overlap = PLAYER_RADIUS - dist;
      player.x += (dx / dist) * overlap;
      player.y += (dy / dist) * overlap;
    }
  }
}

function resolvePlayerPlayerCollision(playerA: Player, playerB: Player): void {
  const dx = playerA.x - playerB.x;
  const dy = playerA.y - playerB.y;
  const dist = Math.hypot(dx, dy);
  const minDist = PLAYER_RADIUS * 2;
  if (dist >= minDist) return;
  const overlap = (minDist - dist) / 2;
  if (dist > 0) {
    const nx = dx / dist, ny = dy / dist;
    playerA.x += nx * overlap;
    playerA.y += ny * overlap;
    playerB.x -= nx * overlap;
    playerB.y -= ny * overlap;
  } else {
    playerA.x += overlap;
    playerB.x -= overlap;
  }
}

function normalizeInput(dx: number, dy: number): Vector {
  const length = Math.hypot(dx, dy);
  if (length <= 1) return { x: dx, y: dy };
  return { x: dx / length, y: dy / length };
}

function approachVelocity(current: number, target: number): number {
  return current + (target - current) * ACCELERATION;
}

function applyIdleDrag(velocity: number): number {
  const nextVelocity = velocity * IDLE_DRAG;
  return Math.abs(nextVelocity) < STOP_SPEED ? 0 : nextVelocity;
}

function updatePlayerVelocity(player: Player): void {
  const input = normalizeInput(player.dx, player.dy);

  if (player.energy <= 0 && (input.x !== 0 || input.y !== 0)) {
    player.vx = 0;
    player.vy = 0;
    return;
  }

  player.vx = input.x !== 0
    ? approachVelocity(player.vx, input.x * MAX_SPEED)
    : applyIdleDrag(player.vx);
  player.vy = input.y !== 0
    ? approachVelocity(player.vy, input.y * MAX_SPEED)
    : applyIdleDrag(player.vy);
}

function movePlayer(player: Player): number {
  const previousX = player.x;
  const previousY = player.y;
  const nextX = player.x + player.vx;
  const nextY = player.y + player.vy;

  player.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, nextX));
  player.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, nextY));

  if (player.x !== nextX) player.vx = 0;
  if (player.y !== nextY) player.vy = 0;

  return Math.hypot(player.x - previousX, player.y - previousY);
}

function updatePlayerEnergy(player: Player, movedDistance: number): void {
  const input = normalizeInput(player.dx, player.dy);
  const hasMovementInput = input.x !== 0 || input.y !== 0;

  if (hasMovementInput && movedDistance > 0) {
    player.energy = Math.max(
      0,
      player.energy - movedDistance * RATE_OF_ENERGY_LOSS_PR_DISTANCE,
    );
    return;
  }

  if (!hasMovementInput) {
    player.energy = Math.min(
      MAX_ENERGY,
      player.energy + RATE_OF_ENERGY_REGAIN_PR_TIME * (TICK_MS / 1000),
    );
  }
}

function tick(room: GameRoom) {
  const tickStartedAt = performance.now();
  const now = Date.now();
  const cactusDamagedMessages: CactusDamagedMessage[] = [];

  // Move alive players
  for (const player of room.players.values()) {
    if (!player.alive) continue;

    updatePlayerVelocity(player);
    const movedDistance = movePlayer(player);
    updatePlayerEnergy(player, movedDistance);

    for (const rock of room.rocks) resolvePlayerRockCollision(player, rock);
    for (const cactus of room.cacti) {
      resolvePlayerCactusCollision(player, cactus);
    }
    player.x = Math.max(
      PLAYER_RADIUS,
      Math.min(ARENA_W - PLAYER_RADIUS, player.x),
    );
    player.y = Math.max(
      PLAYER_RADIUS,
      Math.min(ARENA_H - PLAYER_RADIUS, player.y),
    );

    // Complete reload
    if (player.reloading && now - player.reloadStart >= RELOAD_TIME) {
      player.ammo = 6;
      player.reloading = false;
    }
  }

  // Player-player collision (pair-wise, both pushed equally)
  const alivePlayers = [...room.players.values()].filter((p) => p.alive);
  for (let i = 0; i < alivePlayers.length; i++) {
    for (let j = i + 1; j < alivePlayers.length; j++) {
      resolvePlayerPlayerCollision(alivePlayers[i], alivePlayers[j]);
    }
  }
  for (const player of alivePlayers) {
    player.x = Math.max(
      PLAYER_RADIUS,
      Math.min(ARENA_W - PLAYER_RADIUS, player.x),
    );
    player.y = Math.max(
      PLAYER_RADIUS,
      Math.min(ARENA_H - PLAYER_RADIUS, player.y),
    );
  }

  // Bullet physics
  const surviving: Bullet[] = [];

  for (const bullet of room.bullets) {
    const prevX = bullet.x;
    const prevY = bullet.y;
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    if (
      bullet.x < 0 || bullet.x > ARENA_W || bullet.y < 0 || bullet.y > ARENA_H
    ) continue;

    let alive = true;

    // Rock ricochet — sweep-based to prevent bullet tunneling through thin edges
    let earliestHit: { t: number; nx: number; ny: number } | null = null;
    for (const rock of room.rocks) {
      const hit = sweepBulletRock(prevX, prevY, bullet.x, bullet.y, rock);
      if (hit && (earliestHit === null || hit.t < earliestHit.t)) {
        earliestHit = hit;
      }
    }
    if (earliestHit !== null) {
      bullet.x = prevX + earliestHit.t * (bullet.x - prevX) +
        earliestHit.nx * (BULLET_RADIUS + 2);
      bullet.y = prevY + earliestHit.t * (bullet.y - prevY) +
        earliestHit.ny * (BULLET_RADIUS + 2);
      [bullet.vx, bullet.vy] = reflect(
        bullet.vx,
        bullet.vy,
        earliestHit.nx,
        earliestHit.ny,
      );
      bullet.bounces++;
    }

    // Cactus hit
    if (alive) {
      const cactusHit = sweepBulletCacti(
        prevX,
        prevY,
        bullet.x,
        bullet.y,
        room.cacti,
      );
      if (cactusHit !== null) {
        cactusHit.cactus.segments[cactusHit.segmentIndex] = false;
        cactusDamagedMessages.push({
          type: "cactus_damaged",
          cactusId: cactusHit.cactus.id,
          segmentIndex: cactusHit.segmentIndex,
        });
        alive = false;
      }
    }

    // Player hit
    if (alive) {
      for (const player of room.players.values()) {
        if (!player.alive) continue;
        if (player.id === bullet.ownerId && now - bullet.born < 200) continue;
        if (
          Math.hypot(bullet.x - player.x, bullet.y - player.y) <
            PLAYER_RADIUS + BULLET_RADIUS
        ) {
          player.health = Math.max(0, player.health - 20);
          if (player.health <= 0) {
            player.alive = false;
            const killer = room.players.get(bullet.ownerId);
            if (killer && killer.id !== player.id) killer.kills++;
          }
          alive = false;
          break;
        }
      }
    }

    if (alive) surviving.push(bullet);
  }

  room.bullets = surviving;

  if (room.sockets.size === 0) {
    recordTickDuration(room, performance.now() - tickStartedAt);
    return;
  }

  // Win condition: 1 alive, 1+ dead
  if (!room.gameOver) {
    const allPlayers = [...room.players.values()];
    const alivePlayers = allPlayers.filter((p) => p.alive);
    const deadPlayers = allPlayers.filter((p) => !p.alive);
    if (alivePlayers.length === 1 && deadPlayers.length >= 1) {
      room.gameOver = true;
      const winnerName = alivePlayers[0].name;
      setTimeout(() => {
        broadcast(room, JSON.stringify({ type: "game_over", winnerName }));
      }, 1800);
    }
  }

  const players: PlayerStateSnapshot[] = [...room.players.values()].map(
    toSnapshot,
  );
  const bullets: BulletSnapshot[] = room.bullets.map((b) => ({
    id: b.id,
    x: b.x,
    y: b.y,
    bounces: b.bounces,
  }));
  for (const cactusDamagedMessage of cactusDamagedMessages) {
    broadcast(room, JSON.stringify(cactusDamagedMessage));
  }
  const gameStateMessage = JSON.stringify({
    type: "game_state",
    players,
    bullets,
  });
  const gameStateBroadcast = broadcast(
    room,
    gameStateMessage,
    { dropIfBackedUp: true },
  );
  recordGameStateBroadcast(
    room,
    getPayloadByteLength(gameStateMessage),
    gameStateBroadcast,
  );
  recordTickDuration(room, performance.now() - tickStartedAt);
}

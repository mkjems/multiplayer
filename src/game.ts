import { createPlayer, toSnapshot, type Player } from "./player.ts";
import type { GameInfo, PlayerSnapshot, BulletSnapshot, RockData, CactusData } from "./protocol.ts";

const MAX_SPEED = 4;
const ACCELERATION = 0.35;
const FRICTION = 0.75;
const BULLET_SPEED = 12;
const TICK_MS = 50;
const PLAYER_RADIUS = 16;
const BULLET_RADIUS = 4;
const SHOOT_COOL_DOWN = 400;
const RELOAD_TIME = 2000;
const ARENA_W = 1000;
const ARENA_H = 650;
const ARM_MAX = Math.PI / 3;
const ARM_LENGTH = 20;

// Arena generation — rock placement
const ROCK_COUNT = 6;
const ROCK_MIN_SIDES = 6;
const ROCK_EXTRA_SIDES = 5;
const ROCK_MIN_RADIUS = 20;
const ROCK_MAX_RADIUS = 85;
const FALLBACK_ROCK_COLS = 3;
const FALLBACK_ROCK_ORIGIN_X = 120;
const FALLBACK_ROCK_COL_STEP = 230;
const FALLBACK_ROCK_ORIGIN_Y = 150;
const FALLBACK_ROCK_ROW_STEP = 200;
const FALLBACK_ROCK_MAX_RADIUS = 35;
const FALLBACK_ROCK_SIDES = 5;

// Arena generation — cactus placement
const CACTUS_COUNT = 4;
const CACTUS_PLACEMENT_RADIUS = 18;
const CACTUS_PLACEMENT_MARGIN_Y = 60;
const FALLBACK_CACTUS_COLS = 2;
const FALLBACK_CACTUS_ORIGIN_X = 200;
const FALLBACK_CACTUS_COL_STEP = 380;
const FALLBACK_CACTUS_ORIGIN_Y = 180;
const FALLBACK_CACTUS_ROW_STEP = 140;

// Arena generation — shared
const PLACEMENT_MAX_ATTEMPTS = 60;
const OBJECT_MIN_SPACING = 40;
const ARENA_PLACEMENT_MARGIN = 80;

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
}

const rooms = new Map<string, GameRoom>();

function generatePolygonVertices(
  cx: number, cy: number, minR: number, maxR: number, sides: number
): { x: number; y: number }[] {
  const angles = Array.from({ length: sides }, () => Math.random() * Math.PI * 2)
    .sort((a, b) => a - b);
  return angles.map(a => {
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
      if (Math.hypot(x - o.x, y - o.y) < r + o.r + OBJECT_MIN_SPACING) return true;
    }
    return false;
  }

  for (let i = 0; i < ROCK_COUNT; i++) {
    let rock: Rock | null = null;
    for (let t = 0; t < PLACEMENT_MAX_ATTEMPTS; t++) {
      const sides = ROCK_MIN_SIDES + Math.floor(Math.random() * ROCK_EXTRA_SIDES);
      const cx = ARENA_PLACEMENT_MARGIN + Math.random() * (ARENA_W - ARENA_PLACEMENT_MARGIN * 2);
      const cy = ARENA_PLACEMENT_MARGIN + Math.random() * (ARENA_H - ARENA_PLACEMENT_MARGIN * 2);
      const vertices = generatePolygonVertices(cx, cy, ROCK_MIN_RADIUS, ROCK_MAX_RADIUS, sides);
      const br = Math.max(...vertices.map(v => Math.hypot(v.x - cx, v.y - cy)));
      if (!tooClose(cx, cy, br)) {
        rock = { id: `rock_${i}`, x: cx, y: cy, boundingRadius: br, vertices };
        placed.push({ x: cx, y: cy, r: br });
        break;
      }
    }
    if (!rock) {
      const cx = FALLBACK_ROCK_ORIGIN_X + (i % FALLBACK_ROCK_COLS) * FALLBACK_ROCK_COL_STEP;
      const cy = FALLBACK_ROCK_ORIGIN_Y + Math.floor(i / FALLBACK_ROCK_COLS) * FALLBACK_ROCK_ROW_STEP;
      const vertices = generatePolygonVertices(cx, cy, ROCK_MIN_RADIUS, FALLBACK_ROCK_MAX_RADIUS, FALLBACK_ROCK_SIDES);
      const br = Math.max(...vertices.map(v => Math.hypot(v.x - cx, v.y - cy)));
      rock = { id: `rock_${i}`, x: cx, y: cy, boundingRadius: br, vertices };
      placed.push({ x: cx, y: cy, r: br });
    }
    rocks.push(rock);
  }

  for (let i = 0; i < CACTUS_COUNT; i++) {
    let cactus: Cactus | null = null;
    for (let t = 0; t < PLACEMENT_MAX_ATTEMPTS; t++) {
      const x = ARENA_PLACEMENT_MARGIN + Math.random() * (ARENA_W - ARENA_PLACEMENT_MARGIN * 2);
      const y = CACTUS_PLACEMENT_MARGIN_Y + Math.random() * (ARENA_H - ARENA_PLACEMENT_MARGIN * 2);
      if (!tooClose(x, y, CACTUS_PLACEMENT_RADIUS)) {
        cactus = { id: `cactus_${i}`, x, y, segments: Array(CACTUS_SEGMENT_COUNT).fill(true) };
        placed.push({ x, y, r: CACTUS_PLACEMENT_RADIUS });
        break;
      }
    }
    if (!cactus) {
      const x = FALLBACK_CACTUS_ORIGIN_X + (i % FALLBACK_CACTUS_COLS) * FALLBACK_CACTUS_COL_STEP;
      const y = FALLBACK_CACTUS_ORIGIN_Y + Math.floor(i / FALLBACK_CACTUS_COLS) * FALLBACK_CACTUS_ROW_STEP;
      cactus = { id: `cactus_${i}`, x, y, segments: Array(CACTUS_SEGMENT_COUNT).fill(true) };
      placed.push({ x, y, r: CACTUS_PLACEMENT_RADIUS });
    }
    cacti.push(cactus);
  }

  return { rocks, cacti };
}

export function getRockData(room: GameRoom): RockData[] {
  return room.rocks.map(r => ({ id: r.id, x: r.x, y: r.y, vertices: r.vertices }));
}

export function getCactiData(room: GameRoom): CactusData[] {
  return room.cacti.map(c => ({ id: c.id, x: c.x, y: c.y, segments: [...c.segments] }));
}

export function createRoom(id: string, name: string, maxPlayers = 8): GameRoom {
  const { rocks, cacti } = generateArena();
  const room: GameRoom = {
    id, name, maxPlayers,
    players: new Map(),
    sockets: new Map(),
    bullets: [],
    rocks,
    cacti,
    gameOver: false,
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

function findSafeSpawnPosition(room: GameRoom): { x: number; y: number } {
  for (let attempt = 0; attempt < PLACEMENT_MAX_ATTEMPTS; attempt++) {
    const x = ARENA_PLACEMENT_MARGIN + Math.random() * (ARENA_W - ARENA_PLACEMENT_MARGIN * 2);
    const y = ARENA_PLACEMENT_MARGIN + Math.random() * (ARENA_H - ARENA_PLACEMENT_MARGIN * 2);

    let safe = true;
    for (const rock of room.rocks) {
      if (Math.hypot(x - rock.x, y - rock.y) < rock.boundingRadius + PLAYER_RADIUS + OBJECT_MIN_SPACING) {
        safe = false;
        break;
      }
    }
    if (!safe) continue;

    for (const cactus of room.cacti) {
      if (Math.hypot(x - cactus.x, y - cactus.y) < CACTUS_PLACEMENT_RADIUS + PLAYER_RADIUS + OBJECT_MIN_SPACING) {
        safe = false;
        break;
      }
    }
    if (safe) return { x, y };
  }
  return { x: PLAYER_RADIUS * 3, y: PLAYER_RADIUS * 3 };
}

export function joinRoom(room: GameRoom, playerId: string, playerName: string, socket: WebSocket) {
  const player = createPlayer(playerId, playerName);
  const spawn = findSafeSpawnPosition(room);
  player.x = spawn.x;
  player.y = spawn.y;
  room.players.set(playerId, player);
  room.sockets.set(playerId, socket);
}

export function leaveRoom(room: GameRoom, playerId: string) {
  room.players.delete(playerId);
  room.sockets.delete(playerId);
  if (room.players.size === 0) room.gameOver = false;
}

export function applyInput(room: GameRoom, playerId: string, dx: number, dy: number) {
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
    vx, vy,
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

function broadcast(room: GameRoom, msg: string) {
  for (const [id, socket] of room.sockets) {
    try {
      if (socket.readyState === WebSocket.OPEN) socket.send(msg);
    } catch {
      leaveRoom(room, id);
    }
  }
}

function closestPointOnSegment(
  px: number, py: number, ax: number, ay: number, bx: number, by: number
): { x: number; y: number } {
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return { x: ax + t * dx, y: ay + t * dy };
}

function bulletPolygonNormal(
  bx: number, by: number, rock: Rock
): { nx: number; ny: number } | null {
  if (Math.hypot(bx - rock.x, by - rock.y) > rock.boundingRadius + BULLET_RADIUS) return null;
  const vertices = rock.vertices, n = vertices.length;
  let bestDist = Infinity, bestNx = 0, bestNy = 0;
  for (let i = 0; i < n; i++) {
    const a = vertices[i], b = vertices[(i + 1) % n];
    const cp = closestPointOnSegment(bx, by, a.x, a.y, b.x, b.y);
    const dist = Math.hypot(bx - cp.x, by - cp.y);
    if (dist < BULLET_RADIUS && dist < bestDist) {
      bestDist = dist;
      const ex = b.x - a.x, ey = b.y - a.y, el = Math.hypot(ex, ey);
      let nx = -ey / el, ny = ex / el;
      if (nx * (bx - rock.x) + ny * (by - rock.y) < 0) { nx = -nx; ny = -ny; }
      bestNx = nx; bestNy = ny;
    }
  }
  return bestDist < Infinity ? { nx: bestNx, ny: bestNy } : null;
}

function reflect(vx: number, vy: number, nx: number, ny: number): [number, number] {
  const dot = vx * nx + vy * ny;
  return [vx - 2 * dot * nx, vy - 2 * dot * ny];
}

function resolvePlayerRockCollision(player: Player, rock: Rock): void {
  if (Math.hypot(player.x - rock.x, player.y - rock.y) > rock.boundingRadius + PLAYER_RADIUS) return;

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

function tick(room: GameRoom) {
  const now = Date.now();

  // Move alive players
  for (const player of room.players.values()) {
    if (!player.alive) continue;

    player.vx = player.dx !== 0 ? player.vx + (player.dx * MAX_SPEED - player.vx) * ACCELERATION : player.vx * FRICTION;
    player.vy = player.dy !== 0 ? player.vy + (player.dy * MAX_SPEED - player.vy) * ACCELERATION : player.vy * FRICTION;
    if (Math.abs(player.vx) < 0.05) player.vx = 0;
    if (Math.abs(player.vy) < 0.05) player.vy = 0;

    player.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, player.x + player.vx));
    player.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, player.y + player.vy));

    for (const rock of room.rocks) resolvePlayerRockCollision(player, rock);
    for (const cactus of room.cacti) resolvePlayerCactusCollision(player, cactus);
    player.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, player.x));
    player.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, player.y));

    // Complete reload
    if (player.reloading && now - player.reloadStart >= RELOAD_TIME) {
      player.ammo = 6;
      player.reloading = false;
    }
  }

  // Bullet physics
  const surviving: Bullet[] = [];

  for (const bullet of room.bullets) {
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;

    if (bullet.x < 0 || bullet.x > ARENA_W || bullet.y < 0 || bullet.y > ARENA_H) continue;

    let alive = true;

    // Rock ricochet
    for (const rock of room.rocks) {
      const hit = bulletPolygonNormal(bullet.x, bullet.y, rock);
      if (hit) {
        [bullet.vx, bullet.vy] = reflect(bullet.vx, bullet.vy, hit.nx, hit.ny);
        bullet.x += hit.nx * (BULLET_RADIUS + 2);
        bullet.y += hit.ny * (BULLET_RADIUS + 2);
        bullet.bounces++;
        break;
      }
    }

    // Cactus hit
    if (alive) {
      outer: for (const cactus of room.cacti) {
        for (let i = 0; i < cactus.segments.length; i++) {
          if (!cactus.segments[i]) continue;
          const sx = cactus.x - CACTUS_HALF_WIDTH, sy = cactus.y + i * CACTUS_SEGMENT_STRIDE;
          if (bullet.x >= sx && bullet.x <= sx + CACTUS_SEGMENT_WIDTH && bullet.y >= sy && bullet.y <= sy + CACTUS_SEGMENT_HEIGHT) {
            cactus.segments[i] = false;
            alive = false;
            break outer;
          }
        }
      }
    }

    // Player hit
    if (alive) {
      for (const player of room.players.values()) {
        if (!player.alive) continue;
        if (player.id === bullet.ownerId && now - bullet.born < 200) continue;
        if (Math.hypot(bullet.x - player.x, bullet.y - player.y) < PLAYER_RADIUS + BULLET_RADIUS) {
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

  if (room.sockets.size === 0) return;

  // Win condition: 1 alive, 1+ dead
  if (!room.gameOver) {
    const allPlayers = [...room.players.values()];
    const alivePlayers = allPlayers.filter(p => p.alive);
    const deadPlayers = allPlayers.filter(p => !p.alive);
    if (alivePlayers.length === 1 && deadPlayers.length >= 1) {
      room.gameOver = true;
      const winnerName = alivePlayers[0].name;
      setTimeout(() => {
        broadcast(room, JSON.stringify({ type: "game_over", winnerName }));
      }, 1800);
    }
  }

  const players: PlayerSnapshot[] = [...room.players.values()].map(toSnapshot);
  const bullets: BulletSnapshot[] = room.bullets.map(b => ({ id: b.id, x: b.x, y: b.y, bounces: b.bounces }));
  const cacti: CactusData[] = room.cacti.map(c => ({ id: c.id, x: c.x, y: c.y, segments: [...c.segments] }));
  broadcast(room, JSON.stringify({ type: "game_state", players, bullets, cacti }));
}

import { createPlayer, toSnapshot, type Player } from "./player.ts";
import type { GameInfo, PlayerSnapshot, BulletSnapshot, RockData, CactusData } from "./protocol.ts";

const SPEED = 3;
const BULLET_SPEED = 8;
const TICK_MS = 50;
const PLAYER_RADIUS = 16;
const BULLET_RADIUS = 3;
const SHOOT_COOLDOWN = 400;
const RELOAD_TIME = 2000;
const ARENA_W = 800;
const ARENA_H = 500;
const ARM_MAX = Math.PI / 3;

interface Bullet {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
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
      if (Math.hypot(x - o.x, y - o.y) < r + o.r + 40) return true;
    }
    return false;
  }

  for (let i = 0; i < 5; i++) {
    let rock: Rock | null = null;
    for (let t = 0; t < 60; t++) {
      const sides = 3 + Math.floor(Math.random() * 5);
      const cx = 80 + Math.random() * (ARENA_W - 160);
      const cy = 80 + Math.random() * (ARENA_H - 160);
      const vertices = generatePolygonVertices(cx, cy, 20, 45, sides);
      const br = Math.max(...vertices.map(v => Math.hypot(v.x - cx, v.y - cy)));
      if (!tooClose(cx, cy, br)) {
        rock = { id: `rock_${i}`, x: cx, y: cy, boundingRadius: br, vertices };
        placed.push({ x: cx, y: cy, r: br });
        break;
      }
    }
    if (!rock) {
      const cx = 120 + (i % 3) * 230;
      const cy = 150 + Math.floor(i / 3) * 200;
      const vertices = generatePolygonVertices(cx, cy, 20, 35, 5);
      const br = Math.max(...vertices.map(v => Math.hypot(v.x - cx, v.y - cy)));
      rock = { id: `rock_${i}`, x: cx, y: cy, boundingRadius: br, vertices };
      placed.push({ x: cx, y: cy, r: br });
    }
    rocks.push(rock);
  }

  for (let i = 0; i < 4; i++) {
    let cactus: Cactus | null = null;
    for (let t = 0; t < 60; t++) {
      const x = 80 + Math.random() * (ARENA_W - 160);
      const y = 60 + Math.random() * (ARENA_H - 160);
      if (!tooClose(x, y, 18)) {
        cactus = { id: `cactus_${i}`, x, y, segments: [true, true, true, true, true] };
        placed.push({ x, y, r: 18 });
        break;
      }
    }
    if (!cactus) {
      const x = 200 + (i % 2) * 380;
      const y = 180 + Math.floor(i / 2) * 140;
      cactus = { id: `cactus_${i}`, x, y, segments: [true, true, true, true, true] };
      placed.push({ x, y, r: 18 });
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

export function joinRoom(room: GameRoom, playerId: string, playerName: string, socket: WebSocket) {
  room.players.set(playerId, createPlayer(playerId, playerName));
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
  if (now - player.lastShot < SHOOT_COOLDOWN) return;

  player.ammo--;
  player.lastShot = now;

  const dir = player.facing === "right" ? 1 : -1;
  const vx = dir * BULLET_SPEED * Math.cos(player.armAngle);
  const vy = -BULLET_SPEED * Math.sin(player.armAngle);

  room.bullets.push({
    id: crypto.randomUUID(),
    ownerId: playerId,
    x: player.x + dir * (PLAYER_RADIUS + 2),
    y: player.y,
    vx, vy,
    born: now,
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

function tick(room: GameRoom) {
  const now = Date.now();

  // Move alive players
  for (const player of room.players.values()) {
    if (!player.alive) continue;

    player.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, player.x + player.dx * SPEED));
    player.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, player.y + player.dy * SPEED));

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
        break;
      }
    }

    // Cactus hit
    if (alive) {
      outer: for (const cactus of room.cacti) {
        for (let i = 0; i < cactus.segments.length; i++) {
          if (!cactus.segments[i]) continue;
          const sx = cactus.x - 8, sy = cactus.y + i * 14;
          if (bullet.x >= sx && bullet.x <= sx + 16 && bullet.y >= sy && bullet.y <= sy + 12) {
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
  const bullets: BulletSnapshot[] = room.bullets.map(b => ({ id: b.id, x: b.x, y: b.y }));
  const cacti: CactusData[] = room.cacti.map(c => ({ id: c.id, x: c.x, y: c.y, segments: [...c.segments] }));
  broadcast(room, JSON.stringify({ type: "game_state", players, bullets, cacti }));
}

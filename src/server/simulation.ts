import type {
  BulletSnapshot,
  PlayerStateSnapshot,
  ServerMessage,
} from "../shared/protocol.ts";
import {
  ACCELERATION,
  ARENA_H,
  ARENA_W,
  ARM_LENGTH,
  ARM_MAX,
  BULLET_RADIUS,
  BULLET_SPEED,
  IDLE_DRAG,
  MAX_ENERGY,
  MAX_SPEED,
  PLAYER_RADIUS,
  RATE_OF_ENERGY_LOSS_PR_DISTANCE,
  RATE_OF_ENERGY_REGAIN_PR_TIME,
  RELOAD_TIME,
  SHOOT_COOL_DOWN,
  STOP_SPEED,
  TICK_MS,
} from "./game-constants.ts";
import type { Bullet, GameRoom, Vector } from "./game-types.ts";
import {
  reflect,
  resolvePlayerCactusCollision,
  resolvePlayerPlayerCollision,
  resolvePlayerRockCollision,
  sweepBulletCacti,
  sweepBulletRock,
} from "./collision.ts";
import type { Player } from "./player.ts";
import { toSnapshot } from "./player.ts";
import {
  broadcast,
  getPayloadByteLength,
  recordGameStateBroadcast,
  recordTickDuration,
} from "./broadcast.ts";

type CactusDamagedMessage = Extract<
  ServerMessage,
  { type: "cactus_damaged" }
>;

export function applyInput(
  room: GameRoom,
  playerId: string,
  dx: number,
  dy: number,
): void {
  const player = room.players.get(playerId);
  if (!player || !player.alive) return;
  player.dx = dx;
  player.dy = dy;
  if (dx > 0) player.facing = "right";
  else if (dx < 0) player.facing = "left";
}

export function setArmAngle(
  room: GameRoom,
  playerId: string,
  angle: number,
): void {
  const player = room.players.get(playerId);
  if (!player || !player.alive) return;
  player.armAngle = Math.max(-ARM_MAX, Math.min(ARM_MAX, angle));
}

export function shoot(room: GameRoom, playerId: string): void {
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

export function reloadPlayer(room: GameRoom, playerId: string): void {
  const player = room.players.get(playerId);
  if (!player || !player.alive || player.reloading || player.ammo >= 6) return;
  player.reloading = true;
  player.reloadStart = Date.now();
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

export function tick(room: GameRoom): void {
  const tickStartedAt = performance.now();
  const now = Date.now();
  const cactusDamagedMessages: CactusDamagedMessage[] = [];

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

    if (player.reloading && now - player.reloadStart >= RELOAD_TIME) {
      player.ammo = 6;
      player.reloading = false;
    }
  }

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

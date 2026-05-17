import { lerpColor } from "./utils.ts";
import type {
  BulletSnapshot,
  CactusData,
  PlayerSnapshot,
  RockData,
} from "../../shared/protocol";
import type { GameState } from "./state.ts";
import type * as ConstantsModule from "./constants.ts";
import type { Bounds } from "./render-types.ts";

function intersectsViewport(bounds: Bounds, viewport: Bounds): boolean {
  return bounds.right >= viewport.left &&
    bounds.left <= viewport.right &&
    bounds.bottom >= viewport.top &&
    bounds.top <= viewport.bottom;
}

function getRockBounds(rock: RockData): Bounds {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const vertex of rock.vertices) {
    left = Math.min(left, vertex.x);
    top = Math.min(top, vertex.y);
    right = Math.max(right, vertex.x);
    bottom = Math.max(bottom, vertex.y);
  }
  return { left, top, right, bottom };
}

function getCactusBounds(cactus: CactusData, gameState: GameState): Bounds {
  const {
    cactusHalfWidth,
    cactusSegmentStride,
    cactusSegmentWidth,
    cactusSegmentHeight,
  } = gameState.arenaConfig;
  return {
    left: cactus.x - cactusHalfWidth,
    top: cactus.y,
    right: cactus.x - cactusHalfWidth + cactusSegmentWidth,
    bottom: cactus.y +
      (cactus.segments.length - 1) * cactusSegmentStride +
      cactusSegmentHeight,
  };
}

function getBulletBounds(bullet: BulletSnapshot): Bounds {
  const radius = 12;
  return {
    left: bullet.x - radius,
    top: bullet.y - radius,
    right: bullet.x + radius,
    bottom: bullet.y + radius,
  };
}

function getPlayerBounds(player: PlayerSnapshot): Bounds {
  const radius = 48;
  return {
    left: player.x - radius,
    top: player.y - radius,
    right: player.x + radius,
    bottom: player.y + radius,
  };
}

function drawRock(
  ctx: CanvasRenderingContext2D,
  rock: RockData,
  constants: typeof ConstantsModule,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(rock.vertices[0].x, rock.vertices[0].y);
  for (let i = 1; i < rock.vertices.length; i++) {
    ctx.lineTo(rock.vertices[i].x, rock.vertices[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = constants.COLOR_ROCK_FILL;
  ctx.fill();
  ctx.strokeStyle = constants.COLOR_ROCK_STROKE;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

function drawCactus(
  ctx: CanvasRenderingContext2D,
  cactus: CactusData,
  gameState: GameState,
  constants: typeof ConstantsModule,
): void {
  const {
    cactusHalfWidth,
    cactusSegmentStride,
    cactusSegmentWidth,
    cactusSegmentHeight,
  } = gameState.arenaConfig;
  for (let i = 0; i < cactus.segments.length; i++) {
    if (!cactus.segments[i]) continue;
    const sx = cactus.x - cactusHalfWidth;
    const sy = cactus.y + i * cactusSegmentStride;
    ctx.fillStyle = constants.COLOR_CACTUS_FILL;
    ctx.fillRect(sx, sy, cactusSegmentWidth, cactusSegmentHeight);
    ctx.strokeStyle = constants.COLOR_CACTUS_STROKE;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, cactusSegmentWidth, cactusSegmentHeight);
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerSnapshot,
  gameState: GameState,
  constants: typeof ConstantsModule,
): void {
  if (!player.alive) {
    const deathTime = gameState.deathTimes.get(player.id) ?? Date.now();
    const t = Math.min(1, (Date.now() - deathTime) / 1500);
    const radius = 14 - t * 6;
    const color = lerpColor(player.color, constants.COLOR_PLAYER_DEAD, t);
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.4 + 0.6 * (1 - t * 0.5);
    ctx.fillStyle = constants.COLOR_PLAYER_DEAD_NAME;
    ctx.fillText(player.name, player.x, player.y + 20);
    ctx.globalAlpha = 1;
    return;
  }

  const isLocalPlayer = player.id === gameState.myId;
  const angle = isLocalPlayer ? gameState.localArmAngle : player.armAngle;
  const facing = isLocalPlayer ? gameState.localFacing : player.facing;
  const direction = facing === "right" ? 1 : -1;
  const { armLength } = gameState.arenaConfig;

  if (isLocalPlayer) {
    ctx.save();
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 14;
  }

  ctx.beginPath();
  ctx.arc(player.x, player.y, 14, 0, Math.PI * 2);
  ctx.fillStyle = player.color;
  ctx.fill();

  if (isLocalPlayer) ctx.restore();

  const hitTime = gameState.hitTimes.get(player.id);
  if (hitTime) {
    const flashT = (Date.now() - hitTime) / constants.HIT_FLASH_DURATION;
    if (flashT < 1) {
      ctx.beginPath();
      ctx.arc(player.x, player.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = constants.COLOR_HIT_FLASH;
      ctx.globalAlpha = (1 - flashT) * 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  if (!player.reloading) {
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(
      player.x + direction * armLength * Math.cos(angle),
      player.y - armLength * Math.sin(angle),
    );
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  const barWidth = 36;
  const barHeight = 4;
  const barX = player.x - 18;
  const healthY = player.y - 26;
  const energyY = healthY - 6;
  ctx.fillStyle = constants.COLOR_ENERGY_BG;
  ctx.fillRect(barX, energyY, barWidth, barHeight);
  ctx.fillStyle = constants.COLOR_ENERGY_FILL;
  ctx.fillRect(barX, energyY, barWidth * (player.energy / 100), barHeight);

  ctx.fillStyle = constants.COLOR_HEALTH_BG;
  ctx.fillRect(barX, healthY, barWidth, barHeight);
  ctx.fillStyle = player.health > 60
    ? constants.COLOR_HEALTH_HIGH
    : player.health > 30
    ? constants.COLOR_HEALTH_MID
    : constants.COLOR_HEALTH_LOW;
  ctx.fillRect(barX, healthY, barWidth * (player.health / 100), barHeight);

  ctx.fillStyle = constants.COLOR_PLAYER_NAME;
  ctx.font = "bold 11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(player.name, player.x, player.y + 26);
  if (player.kills > 0) {
    ctx.fillStyle = constants.COLOR_PLAYER_KILLS;
    ctx.font = "9px system-ui";
    ctx.fillText(`★ ${player.kills}`, player.x, player.y + 37);
  }
}

function drawBulletTrail(
  ctx: CanvasRenderingContext2D,
  bullet: BulletSnapshot,
  gameState: GameState,
): void {
  const trail = gameState.bulletTrails.get(bullet.id);
  if (!trail || trail.length < 2) return;

  const segmentCount = trail.length - 1;
  for (let i = 0; i < segmentCount; i++) {
    const from = trail[i];
    const to = trail[i + 1];
    const progress = (i + 1) / segmentCount;

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineCap = "round";
    ctx.lineWidth = 7 * progress;
    ctx.strokeStyle = `rgba(249, 202, 36, ${0.15 * progress})`;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.lineCap = "round";
    ctx.lineWidth = 2.5 * progress;
    ctx.strokeStyle = `rgba(240, 147, 43, ${0.7 * progress})`;
    ctx.stroke();
  }
}

function drawBullet(
  ctx: CanvasRenderingContext2D,
  bullet: BulletSnapshot,
  constants: typeof ConstantsModule,
): void {
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = constants.COLOR_BULLET_FILL;
  ctx.fill();
  ctx.strokeStyle = constants.COLOR_BULLET_STROKE;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  gameState: GameState,
  constants: typeof ConstantsModule,
  worldViewport: Bounds,
): void {
  for (const rock of gameState.rocks) {
    if (intersectsViewport(getRockBounds(rock), worldViewport)) {
      drawRock(ctx, rock, constants);
    }
  }
  for (const cactus of gameState.cacti) {
    if (intersectsViewport(getCactusBounds(cactus, gameState), worldViewport)) {
      drawCactus(ctx, cactus, gameState, constants);
    }
  }
  for (const bullet of gameState.bullets) {
    if (intersectsViewport(getBulletBounds(bullet), worldViewport)) {
      drawBulletTrail(ctx, bullet, gameState);
    }
  }
  for (const bullet of gameState.bullets) {
    if (intersectsViewport(getBulletBounds(bullet), worldViewport)) {
      drawBullet(ctx, bullet, constants);
    }
  }
  for (const player of gameState.players) {
    if (intersectsViewport(getPlayerBounds(player), worldViewport)) {
      drawPlayer(ctx, player, gameState, constants);
    }
  }
}

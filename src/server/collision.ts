import type { Player } from "./player.ts";
import {
  BULLET_RADIUS,
  CACTUS_HALF_WIDTH,
  CACTUS_SEGMENT_HEIGHT,
  CACTUS_SEGMENT_STRIDE,
  CACTUS_SEGMENT_WIDTH,
  PLAYER_RADIUS,
} from "./game-constants.ts";
import type { Cactus, CactusSegmentHit, Rock } from "./game-types.ts";

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

export function sweepBulletRock(
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

export function sweepBulletCacti(
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

export function reflect(
  vx: number,
  vy: number,
  nx: number,
  ny: number,
): [number, number] {
  const dot = vx * nx + vy * ny;
  return [vx - 2 * dot * nx, vy - 2 * dot * ny];
}

export function resolvePlayerRockCollision(player: Player, rock: Rock): void {
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

export function resolvePlayerCactusCollision(
  player: Player,
  cactus: Cactus,
): void {
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

export function resolvePlayerPlayerCollision(
  playerA: Player,
  playerB: Player,
): void {
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

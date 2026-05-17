import type {
  ArenaConfig,
  CactusData,
  PlayerInfo,
  RockData,
} from "../shared/protocol.ts";
import {
  ARENA_H,
  ARENA_PLACEMENT_MARGIN,
  ARENA_W,
  ARM_LENGTH,
  ARM_MAX,
  CACTUS_COUNT,
  CACTUS_HALF_WIDTH,
  CACTUS_PLACEMENT_MARGIN_Y,
  CACTUS_PLACEMENT_RADIUS,
  CACTUS_SEGMENT_COUNT,
  CACTUS_SEGMENT_HEIGHT,
  CACTUS_SEGMENT_STRIDE,
  CACTUS_SEGMENT_WIDTH,
  FALLBACK_CACTUS_COL_STEP,
  FALLBACK_CACTUS_COLS,
  FALLBACK_CACTUS_ORIGIN_X,
  FALLBACK_CACTUS_ORIGIN_Y,
  FALLBACK_CACTUS_ROW_STEP,
  FALLBACK_ROCK_COL_STEP,
  FALLBACK_ROCK_COLS,
  FALLBACK_ROCK_MAX_RADIUS,
  FALLBACK_ROCK_ORIGIN_X,
  FALLBACK_ROCK_ORIGIN_Y,
  FALLBACK_ROCK_ROW_STEP,
  FALLBACK_ROCK_SIDES,
  OBJECT_MIN_SPACING,
  PLACEMENT_MAX_ATTEMPTS,
  PLAYER_RADIUS,
  ROCK_COUNT,
  ROCK_EXTRA_SIDES,
  ROCK_MAX_RADIUS,
  ROCK_MIN_RADIUS,
  ROCK_MIN_SIDES,
} from "./game-constants.ts";
import type { Cactus, GameRoom, Rock } from "./game-types.ts";
import { toPlayerInfo } from "./player.ts";

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

export function generateArena(): { rocks: Rock[]; cacti: Cactus[] } {
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

export function findSafeSpawnPosition(
  room: GameRoom,
): { x: number; y: number } {
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

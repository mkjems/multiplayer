import type {
  ArenaConfig,
  BulletSnapshot,
  CactusData,
  ClientMessage,
  GameInfo,
  PlayerInfo,
  PlayerStateSnapshot,
  RockData,
  ServerMessage,
} from "./protocol.ts";

type JsonObject = Record<string, unknown>;

export function parseClientMessage(payload: unknown): ClientMessage | null {
  const parsed = parseJsonPayload(payload);
  return isClientMessage(parsed) ? parsed : null;
}

export function parseServerMessage(payload: unknown): ServerMessage | null {
  const parsed = parseJsonPayload(payload);
  return isServerMessage(parsed) ? parsed : null;
}

function parseJsonPayload(payload: unknown): unknown {
  if (typeof payload !== "string") return null;

  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return null;
  }
}

function isClientMessage(value: unknown): value is ClientMessage {
  if (!isObject(value) || typeof value.type !== "string") return false;

  switch (value.type) {
    case "join_lobby":
    case "leave_game":
    case "shoot":
    case "reload":
    case "ping":
      return true;
    case "join_game":
      return typeof value.gameId === "string" &&
        typeof value.playerName === "string";
    case "move":
      return isFiniteNumber(value.dx) && isFiniteNumber(value.dy);
    case "arm_angle":
      return isFiniteNumber(value.angle);
    default:
      return false;
  }
}

function isServerMessage(value: unknown): value is ServerMessage {
  if (!isObject(value) || typeof value.type !== "string") return false;

  switch (value.type) {
    case "lobby_state":
      return isGameInfoArray(value.games) &&
        isNonNegativeInteger(value.lobbyCount);
    case "game_joined":
      return typeof value.playerId === "string" &&
        typeof value.gameId === "string";
    case "player_joined":
      return isPlayerInfo(value.player);
    case "player_left":
      return typeof value.playerId === "string";
    case "arena":
      return isRockDataArray(value.rocks) &&
        isCactusDataArray(value.cacti) &&
        isArenaConfig(value.config);
    case "game_state":
      return isPlayerStateSnapshotArray(value.players) &&
        isBulletSnapshotArray(value.bullets);
    case "cactus_damaged":
      return typeof value.cactusId === "string" &&
        isNonNegativeInteger(value.segmentIndex);
    case "game_over":
      return typeof value.winnerName === "string";
    case "error":
      return typeof value.message === "string";
    default:
      return false;
  }
}

function isGameInfoArray(value: unknown): value is GameInfo[] {
  return Array.isArray(value) && value.every(isGameInfo);
}

function isGameInfo(value: unknown): value is GameInfo {
  if (!isObject(value)) return false;
  return typeof value.id === "string" &&
    typeof value.name === "string" &&
    isNonNegativeInteger(value.playerCount) &&
    isNonNegativeInteger(value.maxPlayers) &&
    (value.status === "waiting" || value.status === "playing");
}

function isPlayerInfo(value: unknown): value is PlayerInfo {
  if (!isObject(value)) return false;
  return typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.color === "string";
}

function isPlayerStateSnapshotArray(
  value: unknown,
): value is PlayerStateSnapshot[] {
  return Array.isArray(value) && value.every(isPlayerStateSnapshot);
}

function isPlayerStateSnapshot(value: unknown): value is PlayerStateSnapshot {
  if (!isObject(value)) return false;
  return typeof value.id === "string" &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.health) &&
    isFiniteNumber(value.energy) &&
    Number.isInteger(value.ammo) &&
    isFiniteNumber(value.armAngle) &&
    (value.facing === "left" || value.facing === "right") &&
    typeof value.alive === "boolean" &&
    typeof value.reloading === "boolean" &&
    Number.isInteger(value.kills);
}

function isBulletSnapshotArray(value: unknown): value is BulletSnapshot[] {
  return Array.isArray(value) && value.every(isBulletSnapshot);
}

function isBulletSnapshot(value: unknown): value is BulletSnapshot {
  if (!isObject(value)) return false;
  return typeof value.id === "string" &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isNonNegativeInteger(value.bounces);
}

function isRockDataArray(value: unknown): value is RockData[] {
  return Array.isArray(value) && value.every(isRockData);
}

function isRockData(value: unknown): value is RockData {
  if (!isObject(value)) return false;
  return typeof value.id === "string" &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    Array.isArray(value.vertices) &&
    value.vertices.length >= 3 &&
    value.vertices.every(isVector);
}

function isCactusDataArray(value: unknown): value is CactusData[] {
  return Array.isArray(value) && value.every(isCactusData);
}

function isCactusData(value: unknown): value is CactusData {
  if (!isObject(value)) return false;
  return typeof value.id === "string" &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    Array.isArray(value.segments) &&
    value.segments.every((segment) => typeof segment === "boolean");
}

function isArenaConfig(value: unknown): value is ArenaConfig {
  if (!isObject(value)) return false;
  return isPositiveFiniteNumber(value.arenaWidth) &&
    isPositiveFiniteNumber(value.arenaHeight) &&
    isFiniteNumber(value.armMax) &&
    isPositiveFiniteNumber(value.armLength) &&
    isPositiveFiniteNumber(value.cactusHalfWidth) &&
    isPositiveFiniteNumber(value.cactusSegmentStride) &&
    isPositiveFiniteNumber(value.cactusSegmentWidth) &&
    isPositiveFiniteNumber(value.cactusSegmentHeight);
}

function isVector(value: unknown): value is { x: number; y: number } {
  if (!isObject(value)) return false;
  return isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

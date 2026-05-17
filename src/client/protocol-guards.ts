import type { GameInfo, ServerMessage } from "../shared/protocol";

type JsonObject = Record<string, unknown>;

export function parseServerMessage(payload: unknown): ServerMessage | null {
  if (typeof payload !== "string") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }

  return isServerMessage(parsed) ? parsed : null;
}

function isServerMessage(value: unknown): value is ServerMessage {
  if (!isObject(value) || typeof value.type !== "string") return false;

  switch (value.type) {
    case "lobby_state":
      return isGameInfoArray(value.games) &&
        typeof value.lobbyCount === "number";
    case "game_joined":
      return typeof value.playerId === "string" &&
        typeof value.gameId === "string";
    case "arena":
      return Array.isArray(value.rocks) &&
        Array.isArray(value.cacti) &&
        isObject(value.config);
    case "game_state":
      return Array.isArray(value.players) &&
        Array.isArray(value.bullets);
    case "cactus_damaged":
      return typeof value.cactusId === "string" &&
        typeof value.segmentIndex === "number";
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
    typeof value.playerCount === "number" &&
    typeof value.maxPlayers === "number" &&
    (value.status === "waiting" || value.status === "playing");
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

// ═════════════════════════════════════════════════════════════════════════════
// Network Management
// ═════════════════════════════════════════════════════════════════════════════

import { safeParseJson } from "./utils.js";
import type { ClientMessage, ServerMessage } from "../../shared/protocol.ts";

export interface NetworkManager {
  connection: WebSocket;
  send(msg: ClientMessage): void;
  close(): void;
}

/**
 * Factory function to create network manager.
 * Handles WebSocket connection and message routing.
 *
 * @param {string} gameId - Game room ID
 * @param {string} playerName - Player name
 * @param {Function} onStateUpdate - Callback for game state updates
 * @param {Function} onGameOver - Callback for game over event
 * @param {Function} onDisconnect - Callback for connection lost (for rendering)
 * @returns {object} Network manager with send() and close() methods
 */
export function createNetworkManager(
  gameId: string,
  playerName: string,
  onStateUpdate: (msg: ServerMessage) => void,
  onGameOver: (msg: Extract<ServerMessage, { type: "game_over" }>) => void,
  onDisconnect: () => void,
): NetworkManager {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${location.host}/ws/game/${gameId}`);
  let isClosedByClient = false;

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join_game", gameId, playerName }));
  };

  ws.onmessage = (e) => {
    const msg = safeParseJson(e.data) as ServerMessage | null;
    if (!msg) return;
    onStateUpdate(msg);
    if (msg.type === "game_over") {
      onGameOver(msg);
    }
  };

  ws.onclose = () => {
    if (!isClosedByClient) onDisconnect();
  };

  return {
    connection: ws,

    send(msg: ClientMessage) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    },

    close() {
      isClosedByClient = true;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.close();
    },
  };
}

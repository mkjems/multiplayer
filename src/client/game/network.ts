// ═════════════════════════════════════════════════════════════════════════════
// Network Management
// ═════════════════════════════════════════════════════════════════════════════

import { parseServerMessage } from "../protocol-guards.ts";
import type { ClientMessage, ServerMessage } from "../../shared/protocol";

export interface NetworkManager {
  connection: WebSocket;
  send(msg: ClientMessage): void;
  close(): void;
}

export type StateUpdateHandler = (msg: ServerMessage) => void;
export type GameOverHandler = (
  msg: Extract<ServerMessage, { type: "game_over" }>,
) => void;
export type DisconnectHandler = () => void;

/**
 * Factory function to create network manager.
 * Handles WebSocket connection and message routing.
 */
export function createNetworkManager(
  gameId: string,
  playerName: string,
  onStateUpdate: StateUpdateHandler,
  onGameOver: GameOverHandler,
  onDisconnect: DisconnectHandler,
): NetworkManager {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${location.host}/ws/game/${gameId}`);
  let isClosedByClient = false;

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "join_game", gameId, playerName }));
  };

  ws.onmessage = (e) => {
    const msg = parseServerMessage(e.data);
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

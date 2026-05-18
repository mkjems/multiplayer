import { useEffect, useState } from "react";
import type { ClientMessage, GameInfo } from "../../../shared/protocol";
import { parseServerMessage } from "../../../shared/protocol-guards";

const heartbeatIntervalMs = 15000;

export type LobbyConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected";

export interface LobbyState {
  status: LobbyConnectionStatus;
  games: GameInfo[];
  lobbyCount: number;
}

function createLobbyWebSocket(): WebSocket {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  return new WebSocket(`${protocol}://${location.host}/ws/lobby`);
}

function sendClientMessage(
  webSocket: WebSocket,
  message: ClientMessage,
): void {
  if (webSocket.readyState === WebSocket.OPEN) {
    webSocket.send(JSON.stringify(message));
  }
}

export function useLobbyConnection(): LobbyState {
  const [lobbyState, setLobbyState] = useState<LobbyState>({
    status: "connecting",
    games: [],
    lobbyCount: 0,
  });

  useEffect(() => {
    const webSocket = createLobbyWebSocket();
    let heartbeat: number | undefined;

    webSocket.onopen = () => {
      setLobbyState((currentState) => ({
        ...currentState,
        status: "connected",
      }));
      sendClientMessage(webSocket, { type: "join_lobby" });

      heartbeat = globalThis.setInterval(() => {
        sendClientMessage(webSocket, { type: "ping" });
      }, heartbeatIntervalMs);
    };

    webSocket.onmessage = (event) => {
      const message = parseServerMessage(event.data);
      if (message?.type !== "lobby_state") return;

      setLobbyState({
        status: "connected",
        games: message.games,
        lobbyCount: message.lobbyCount,
      });
    };

    webSocket.onclose = () => {
      if (heartbeat !== undefined) {
        globalThis.clearInterval(heartbeat);
      }

      setLobbyState((currentState) => ({
        ...currentState,
        status: "disconnected",
      }));
    };

    webSocket.onerror = () => {
      setLobbyState((currentState) => ({
        ...currentState,
        status: "disconnected",
      }));
    };

    return () => {
      if (heartbeat !== undefined) {
        globalThis.clearInterval(heartbeat);
      }

      webSocket.onopen = null;
      webSocket.onmessage = null;
      webSocket.onclose = null;
      webSocket.onerror = null;
      webSocket.close();
    };
  }, []);

  return lobbyState;
}

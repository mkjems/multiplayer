import { createRoom, getRoom, joinRoom, leaveRoom, applyInput, listRooms } from "./src/game.ts";
import type { ClientMessage } from "./src/protocol.ts";

// Seed some default rooms
createRoom("dots", "Dot Arena", 8);
createRoom("race", "Speed Race", 4);

const lobbyClients = new Set<WebSocket>();

export function broadcastLobby() {
  const msg = JSON.stringify({ type: "lobby_state", games: listRooms() });
  for (const ws of lobbyClients) {
    try {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    } catch {
      lobbyClients.delete(ws);
    }
  }
}

function sendLobbyState(ws: WebSocket) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "lobby_state", games: listRooms() }));
    }
  } catch { /* ignore */ }
}

function handleLobbySocket(ws: WebSocket) {
  const id = crypto.randomUUID().slice(0, 8);
  console.log(`[lobby:${id}] connection received, readyState=${ws.readyState}`);
  lobbyClients.add(ws);

  sendLobbyState(ws);

  ws.onopen = () => {
    console.log(`[lobby:${id}] onopen fired, readyState=${ws.readyState}`);
    sendLobbyState(ws);
  };

  ws.onmessage = (e) => {
    console.log(`[lobby:${id}] message received: ${e.data}`);
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === "ping") {
        console.log(`[lobby:${id}] sending pong`);
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch { /* ignore */ }
  };

  ws.onerror = (e) => {
    console.error(`[lobby:${id}] error:`, e);
    lobbyClients.delete(ws);
  };

  ws.onclose = (e) => {
    console.log(`[lobby:${id}] closed — code=${e.code} reason="${e.reason}" wasClean=${e.wasClean}`);
    lobbyClients.delete(ws);
  };
}

function handleGameSocket(ws: WebSocket, roomId: string) {
  const room = getRoom(roomId);
  if (!room) {
    console.warn(`[game] room "${roomId}" not found, closing`);
    ws.close(1008, "Room not found");
    return;
  }

  let playerId: string | null = null;
  console.log(`[game:${roomId}] connection received, readyState=${ws.readyState}`);

  ws.onopen = () => {
    console.log(`[game:${roomId}] onopen fired`);
  };

  ws.onmessage = (e) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }

    if (msg.type === "join_game") {
      playerId = crypto.randomUUID();
      console.log(`[game:${roomId}] player joined name="${msg.playerName}" id=${playerId}`);
      joinRoom(room, playerId, msg.playerName, ws);
      ws.send(JSON.stringify({ type: "game_joined", playerId, gameId: roomId }));
      broadcastLobby();
    } else if (msg.type === "move" && playerId) {
      applyInput(room, playerId, msg.dx, msg.dy);
    } else if (msg.type === "leave_game" && playerId) {
      console.log(`[game:${roomId}] player left id=${playerId}`);
      leaveRoom(room, playerId);
      broadcastLobby();
      playerId = null;
    }
  };

  ws.onerror = (e) => {
    console.error(`[game:${roomId}] error:`, e);
  };

  ws.onclose = (e) => {
    console.log(`[game:${roomId}] closed — code=${e.code} reason="${e.reason}" wasClean=${e.wasClean} playerId=${playerId}`);
    if (playerId) {
      leaveRoom(room, playerId);
      broadcastLobby();
    }
  };
}

async function serveFile(path: string): Promise<Response> {
  try {
    const file = await Deno.readFile(path);
    const ext = path.split(".").pop();
    const types: Record<string, string> = {
      html: "text/html",
      js: "application/javascript",
      css: "text/css",
    };
    return new Response(file, {
      headers: { "Content-Type": types[ext ?? ""] ?? "text/plain" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function tryUpgrade(req: Request): { socket: WebSocket; response: Response } | null {
  if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") return null;
  try {
    return Deno.upgradeWebSocket(req);
  } catch (e) {
    console.error("[upgrade] failed:", e);
    return null;
  }
}

Deno.serve((req) => {
  const url = new URL(req.url);
  console.log(`[http] ${req.method} ${url.pathname} upgrade=${req.headers.get("upgrade") ?? "none"}`);

  if (url.pathname === "/ws/lobby") {
    const upgrade = tryUpgrade(req);
    if (!upgrade) {
      console.warn("[http] /ws/lobby — not a WebSocket upgrade, returning 426");
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    handleLobbySocket(upgrade.socket);
    return upgrade.response;
  }

  const gameMatch = url.pathname.match(/^\/ws\/game\/(.+)$/);
  if (gameMatch) {
    const upgrade = tryUpgrade(req);
    if (!upgrade) {
      console.warn(`[http] /ws/game/${gameMatch[1]} — not a WebSocket upgrade, returning 426`);
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    handleGameSocket(upgrade.socket, gameMatch[1]);
    return upgrade.response;
  }

  // Static file serving
  let filePath = `public${url.pathname}`;
  if (url.pathname === "/" || url.pathname === "") filePath = "public/index.html";

  return serveFile(filePath);
});

console.log("Server ready");

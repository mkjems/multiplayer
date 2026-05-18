import {
  applyInput,
  createRoom,
  getArenaConfig,
  getCactiData,
  getPlayerInfos,
  getRockData,
  getRoom,
  getRoomDiagnostics,
  joinRoom,
  leaveRoom,
  listRooms,
  reloadPlayer,
  setArmAngle,
  shoot,
} from "./game.ts";
import type { ServerMessage } from "../shared/protocol.ts";
import { parseClientMessage } from "../shared/protocol-guards.ts";
import { handleVisitorRequest } from "./visitor.ts";

// Seed some default rooms
createRoom("dots", "Dot Arena", 8);
createRoom("race", "Speed Race", 8);

const lobbyClients = new Set<WebSocket>();

export function broadcastLobby() {
  const msg = JSON.stringify({
    type: "lobby_state",
    games: listRooms(),
    lobbyCount: lobbyClients.size,
  });
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
      ws.send(
        JSON.stringify({
          type: "lobby_state",
          games: listRooms(),
          lobbyCount: lobbyClients.size,
        }),
      );
    }
  } catch { /* ignore */ }
}

function sendError(ws: WebSocket, message: string): void {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "error", message }));
    }
  } catch { /* ignore */ }
}

function sendJson(ws: WebSocket, message: ServerMessage): void {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  } catch { /* ignore */ }
}

function broadcastGameRoom(
  roomSockets: Iterable<WebSocket>,
  message: ServerMessage,
  exceptSocket?: WebSocket,
): void {
  const payload = JSON.stringify(message);
  for (const socket of roomSockets) {
    if (socket === exceptSocket) continue;
    try {
      if (socket.readyState === WebSocket.OPEN) socket.send(payload);
    } catch { /* ignore */ }
  }
}

function handleLobbySocket(ws: WebSocket) {
  lobbyClients.add(ws);

  sendLobbyState(ws);
  ws.onopen = () => sendLobbyState(ws);
  broadcastLobby();

  ws.onmessage = (e) => {
    const msg = parseClientMessage(e.data);
    if (msg?.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
  };

  ws.onerror = () => {
    lobbyClients.delete(ws);
    broadcastLobby();
  };
  ws.onclose = () => {
    lobbyClients.delete(ws);
    broadcastLobby();
  };
}

function handleGameSocket(ws: WebSocket, roomId: string) {
  const room = getRoom(roomId);
  if (!room) {
    ws.close(1008, "Room not found");
    return;
  }
  const gameRoom = room;

  let playerId: string | null = null;

  function leaveJoinedPlayer(): void {
    if (!playerId) return;
    leaveRoom(gameRoom, playerId);
    playerId = null;
    broadcastLobby();
  }

  ws.onmessage = (e) => {
    const msg = parseClientMessage(e.data);
    if (!msg) return;

    if (msg.type === "join_game") {
      if (playerId) {
        sendError(ws, "Socket has already joined this game");
        return;
      }
      if (msg.gameId !== roomId) {
        sendError(ws, "Joined game id does not match WebSocket room");
        return;
      }
      playerId = crypto.randomUUID();
      joinRoom(gameRoom, playerId, msg.playerName, ws);
      sendJson(ws, { type: "game_joined", playerId, gameId: roomId });
      sendJson(ws, {
        type: "arena",
        rocks: getRockData(gameRoom),
        cacti: getCactiData(gameRoom),
        config: getArenaConfig(),
      });
      const players = getPlayerInfos(gameRoom);
      for (const player of players) {
        sendJson(ws, { type: "player_joined", player });
      }
      const joinedPlayer = players.find((player) => player.id === playerId);
      if (joinedPlayer) {
        broadcastGameRoom(gameRoom.sockets.values(), {
          type: "player_joined",
          player: joinedPlayer,
        }, ws);
      }
      broadcastLobby();
    } else if (msg.type === "move" && playerId) {
      applyInput(gameRoom, playerId, msg.dx, msg.dy);
    } else if (msg.type === "arm_angle" && playerId) {
      setArmAngle(gameRoom, playerId, msg.angle);
    } else if (msg.type === "shoot" && playerId) {
      shoot(gameRoom, playerId);
    } else if (msg.type === "reload" && playerId) {
      reloadPlayer(gameRoom, playerId);
    } else if (msg.type === "leave_game" && playerId) {
      broadcastGameRoom(gameRoom.sockets.values(), {
        type: "player_left",
        playerId,
      }, ws);
      leaveJoinedPlayer();
    }
  };

  ws.onerror = () => {/* ignore */};

  ws.onclose = () => {
    if (playerId) {
      broadcastGameRoom(gameRoom.sockets.values(), {
        type: "player_left",
        playerId,
      }, ws);
    }
    leaveJoinedPlayer();
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
      json: "application/json",
      map: "application/json",
      png: "image/png",
      ico: "image/x-icon",
      svg: "image/svg+xml",
    };
    return new Response(file, {
      headers: { "Content-Type": types[ext ?? ""] ?? "text/plain" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

function tryUpgrade(
  req: Request,
): { socket: WebSocket; response: Response } | null {
  if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") return null;
  try {
    return Deno.upgradeWebSocket(req);
  } catch {
    return null;
  }
}

function isSpaRoute(pathname: string): boolean {
  return pathname === "/" ||
    pathname === "/lobby" ||
    pathname === "/diagnostics" ||
    /^\/game\/[^/]+\/?$/.test(pathname);
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/api/visitor") {
    return await handleVisitorRequest(req);
  }

  if (url.pathname === "/api/diagnostics/rooms") {
    return Response.json(
      {
        generatedAt: new Date().toISOString(),
        rooms: getRoomDiagnostics(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (url.pathname === "/ws/lobby") {
    const upgrade = tryUpgrade(req);
    if (!upgrade) {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    handleLobbySocket(upgrade.socket);
    return upgrade.response;
  }

  const gameMatch = url.pathname.match(/^\/ws\/game\/(.+)$/);
  if (gameMatch) {
    const upgrade = tryUpgrade(req);
    if (!upgrade) {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    handleGameSocket(upgrade.socket, gameMatch[1]);
    return upgrade.response;
  }

  if (url.pathname === "/" || url.pathname === "" || isSpaRoute(url.pathname)) {
    return serveFile("public/index.html");
  }

  return serveFile(`public${url.pathname}`);
});

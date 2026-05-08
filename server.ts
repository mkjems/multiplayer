import { createRoom, getRoom, joinRoom, leaveRoom, applyInput, listRooms } from "./src/game.ts";
import type { ClientMessage } from "./src/protocol.ts";

// Seed some default rooms
createRoom("dots", "Dot Arena", 8);
createRoom("race", "Speed Race", 4);

const lobbyClients = new Set<WebSocket>();

function broadcastLobby() {
  const msg = JSON.stringify({ type: "lobby_state", games: listRooms() });
  for (const ws of lobbyClients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

setInterval(broadcastLobby, 2000);

function handleLobbySocket(ws: WebSocket) {
  lobbyClients.add(ws);
  ws.onopen = () => ws.send(JSON.stringify({ type: "lobby_state", games: listRooms() }));
  ws.onclose = () => lobbyClients.delete(ws);
}

function handleGameSocket(ws: WebSocket, roomId: string) {
  const room = getRoom(roomId);
  if (!room) {
    ws.close(1008, "Room not found");
    return;
  }

  let playerId: string | null = null;

  ws.onmessage = (e) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }

    if (msg.type === "join_game") {
      playerId = crypto.randomUUID();
      joinRoom(room, playerId, msg.playerName, ws);
      ws.send(JSON.stringify({ type: "game_joined", playerId, gameId: roomId }));
      broadcastLobby();
    } else if (msg.type === "move" && playerId) {
      applyInput(room, playerId, msg.dx, msg.dy);
    } else if (msg.type === "leave_game" && playerId) {
      leaveRoom(room, playerId);
      broadcastLobby();
      playerId = null;
    }
  };

  ws.onclose = () => {
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

Deno.serve({ port: 8000 }, (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/ws/lobby") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    handleLobbySocket(socket);
    return response;
  }

  const gameMatch = url.pathname.match(/^\/ws\/game\/(.+)$/);
  if (gameMatch) {
    const { socket, response } = Deno.upgradeWebSocket(req);
    handleGameSocket(socket, gameMatch[1]);
    return response;
  }

  // Static file serving
  let filePath = `public${url.pathname}`;
  if (url.pathname === "/" || url.pathname === "") filePath = "public/index.html";

  return serveFile(filePath);
});

console.log("Server running at http://localhost:8000");

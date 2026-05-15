import type {
  ClientMessage,
  GameInfo,
  ServerMessage,
} from "../shared/protocol.ts";

const playerName = sessionStorage.getItem("playerName");
if (!playerName) {
  globalThis.location.href = "/";
}

const displayNameEl = document.getElementById("display-name");
if (!displayNameEl) {
  throw new Error("Missing required element: #display-name");
}
displayNameEl.textContent = playerName;

const protocol = location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(`${protocol}://${location.host}/ws/lobby`);

ws.onopen = () => {
  ws.send(JSON.stringify({ type: "join_lobby" } satisfies ClientMessage));
};

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data) as ServerMessage;
  if (msg.type === "lobby_state") {
    renderGames(msg.games);
    const countEl = document.getElementById("lobby-count");
    const numberEl = document.getElementById("lobby-count-number");
    if (!countEl || !numberEl) {
      throw new Error("Missing required lobby count elements");
    }
    numberEl.textContent = String(msg.lobbyCount);
    countEl.style.display = "";
  }
};

// Keep connection alive on Deploy (edge isolates drop idle WS connections)
const heartbeat = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ping" } satisfies ClientMessage));
  }
}, 15000);

ws.onclose = () => {
  clearInterval(heartbeat);
  const gamesEl = document.getElementById("games");
  if (!gamesEl) {
    throw new Error("Missing required element: #games");
  }
  gamesEl.innerHTML =
    '<div class="loading">Lost connection to lobby. Refresh to reconnect.</div>';
};

function renderGames(games: GameInfo[]): void {
  const container = document.getElementById("games");
  if (!container) {
    throw new Error("Missing required element: #games");
  }
  if (!games.length) {
    container.innerHTML = '<div class="loading">No games available.</div>';
    return;
  }

  container.innerHTML = games.map((g) => {
    const full = g.playerCount >= g.maxPlayers;
    const statusClass = g.status === "waiting" ? "waiting" : "";
    return `
      <div class="game-card ${full ? "full" : ""}" data-id="${g.id}" ${
      full ? "" : 'role="button" tabindex="0"'
    }>
        <div class="game-name">${escHtml(g.name)}</div>
        <div class="game-meta">
          <span class="status-dot ${statusClass}"></span>
          <span>${
      full
        ? "Full"
        : g.status === "waiting"
        ? "Waiting for players"
        : "In progress"
    }</span>
          <span class="player-count">${g.playerCount} / ${g.maxPlayers}</span>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll<HTMLElement>(".game-card:not(.full)").forEach(
    (card) => {
      card.addEventListener("click", () => joinGame(card.dataset.id!));
      card.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") joinGame(card.dataset.id!);
      });
    },
  );
}

function joinGame(gameId: string) {
  sessionStorage.setItem("gameId", gameId);
  globalThis.location.href = `/game.html`;
}

function escHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const playerName = sessionStorage.getItem("playerName");
if (!playerName) {
  globalThis.location.href = "/";
}

document.getElementById("display-name").textContent = playerName;

const protocol = location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(`${protocol}://${location.host}/ws/lobby`);

ws.onopen = () => {
  ws.send(JSON.stringify({ type: "join_lobby" }));
};

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "lobby_state") {
    renderGames(msg.games);
    const countEl = document.getElementById("lobby-count");
    const numberEl = document.getElementById("lobby-count-number");
    numberEl.textContent = msg.lobbyCount;
    countEl.style.display = "";
  }
};

// Keep connection alive on Deploy (edge isolates drop idle WS connections)
const heartbeat = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
}, 15000);

ws.onclose = () => {
  clearInterval(heartbeat);
  document.getElementById("games").innerHTML =
    '<div class="loading">Lost connection to lobby. Refresh to reconnect.</div>';
};

function renderGames(games) {
  const container = document.getElementById("games");
  if (!games.length) {
    container.innerHTML = '<div class="loading">No games available.</div>';
    return;
  }

  container.innerHTML = games.map((g) => {
    const full = g.playerCount >= g.maxPlayers;
    const statusClass = g.status === "waiting" ? "waiting" : "";
    return `
      <div class="game-card ${full ? "full" : ""}" data-id="${g.id}" ${full ? "" : 'role="button" tabindex="0"'}>
        <div class="game-name">${escHtml(g.name)}</div>
        <div class="game-meta">
          <span class="status-dot ${statusClass}"></span>
          <span>${full ? "Full" : g.status === "waiting" ? "Waiting for players" : "In progress"}</span>
          <span class="player-count">${g.playerCount} / ${g.maxPlayers}</span>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll(".game-card:not(.full)").forEach((card) => {
    card.addEventListener("click", () => joinGame(card.dataset.id));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") joinGame(card.dataset.id);
    });
  });
}

function joinGame(gameId) {
  sessionStorage.setItem("gameId", gameId);
  globalThis.location.href = `/game.html`;
}

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

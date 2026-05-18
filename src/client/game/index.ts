// ═════════════════════════════════════════════════════════════════════════════
// Game Entry Point
// ═════════════════════════════════════════════════════════════════════════════

import {
  createGameSession,
  type GameSession,
  type GameUiEvent,
} from "./game-session.ts";
import { requireCanvas, requireElement } from "./utils.ts";

const playerName = sessionStorage.getItem("playerName");
const gameId = sessionStorage.getItem("gameId");
if (!playerName || !gameId) {
  globalThis.location.href = "/";
  throw new Error("Missing session data");
}

const canvas = requireCanvas("canvas");
const playerCountElement = requireElement("player-count");
const muteButton = requireElement("mute-btn");
const backToLobbyLink = requireElement("back-to-lobby");
const overlay = requireElement("overlay");
const winnerText = requireElement("winner-text");
const countdownText = requireElement("countdown-text");

let gameSession: GameSession | null = null;

function handleUiEvent(event: GameUiEvent): void {
  if (event.type === "player_count_changed") {
    playerCountElement.textContent = `${event.playerCount} player${
      event.playerCount !== 1 ? "s" : ""
    }`;
    return;
  }

  if (event.type === "muted_changed") {
    muteButton.textContent = event.isMuted ? "🔇" : "🔊";
    return;
  }

  if (event.type === "game_over") {
    winnerText.textContent = `🏆 ${event.winnerName} wins!`;
    overlay.classList.add("visible");
    return;
  }

  if (event.type === "return_countdown_changed") {
    countdownText.textContent =
      `Returning to lobby in ${event.remainingSeconds}s…`;
  }
}

gameSession = createGameSession({
  canvas,
  gameId,
  playerName,
  onUiEvent: handleUiEvent,
  onReturnToLobby() {
    globalThis.location.href = "/lobby";
  },
});

muteButton.addEventListener("click", () => {
  gameSession?.toggleMuted();
});

backToLobbyLink.addEventListener("click", (event) => {
  event.preventDefault();
  gameSession?.leaveGame();
  globalThis.location.href = "/lobby";
});

gameSession.start();

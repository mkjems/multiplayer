// ═════════════════════════════════════════════════════════════════════════════
// Game Entry Point
// ═════════════════════════════════════════════════════════════════════════════

import { createSounds } from "../sounds.js";
import * as CONSTANTS from "./constants.js";
import { createGameState } from "./state.js";
import { createEffects } from "./effects.js";
import { createNetworkManager } from "./network.js";
import { setupInputHandler } from "./input.js";
import { createRenderer } from "./render.js";
import { requireCanvas, requireElement } from "./utils.js";

// ─────────────────────────────────────────────────────────────────────────────
// Initialize Game
// ─────────────────────────────────────────────────────────────────────────────

const playerName = sessionStorage.getItem("playerName");
const gameId = sessionStorage.getItem("gameId");
if (!playerName || !gameId) globalThis.location.href = "/";

// Update page title
requireElement("game-title").textContent =
  gameId.charAt(0).toUpperCase() + gameId.slice(1);

// Initialize systems
const sounds = createSounds();
const gameState = createGameState();
const effects = createEffects(CONSTANTS);
const canvas = requireCanvas("canvas");
const countEl = requireElement("player-count");
const overlay = requireElement("overlay");
const winnerText = requireElement("winner-text");
const countdownText = requireElement("countdown-text");

// ─────────────────────────────────────────────────────────────────────────────
// Network Message Handlers
// ─────────────────────────────────────────────────────────────────────────────

function handleGameJoined(msg) {
  gameState.myId = msg.playerId;
}

function handleArena(msg) {
  gameState.rocks = msg.rocks;
  gameState.cacti = msg.cacti;
  gameState.arenaConfig = { ...msg.config };
}

function handleGameState(msg) {
  const now = Date.now();

  for (const p of msg.players) {
    if (!p.alive && !gameState.deathTimes.has(p.id)) {
      gameState.deathTimes.set(p.id, now);
      sounds.playDeath();
    }
    const prev = gameState.previousHealth.get(p.id) ?? p.health;
    if (p.health < prev) {
      gameState.hitTimes.set(p.id, now);
      if (p.id === gameState.myId) {
        effects.trigger();
        sounds.playHit(true);
      } else {
        sounds.playHit(false);
      }
    }
    gameState.previousHealth.set(p.id, p.health);
  }

  gameState.players = msg.players;
  gameState.bullets = msg.bullets;

  for (const b of msg.bullets) {
    const prev = gameState.previousBounces.get(b.id) ?? 0;
    if (b.bounces > prev) sounds.playRicochet();
    gameState.previousBounces.set(b.id, b.bounces);
  }
  for (const id of gameState.previousBounces.keys()) {
    if (!msg.bullets.some((b) => b.id === id)) gameState.previousBounces.delete(id);
  }

  for (const b of msg.bullets) {
    const prevBounces = gameState.previousBounces.get(b.id) ?? 0;
    const trail = gameState.bulletTrails.get(b.id) ?? [];
    if (b.bounces > prevBounces) {
      gameState.bulletTrails.set(b.id, [{ x: b.x, y: b.y }]);
    } else {
      trail.push({ x: b.x, y: b.y });
      if (trail.length > CONSTANTS.TRAIL_MAX_POSITIONS) trail.shift();
      gameState.bulletTrails.set(b.id, trail);
    }
  }
  for (const id of gameState.bulletTrails.keys()) {
    if (!msg.bullets.some((b) => b.id === id)) gameState.bulletTrails.delete(id);
  }

  for (const cactus of msg.cacti) {
    const prev = gameState.previousCactiSegments.get(cactus.id);
    if (prev) {
      for (let i = 0; i < cactus.segments.length; i++) {
        if (prev[i] && !cactus.segments[i]) {
          sounds.playCactusHit();
          break;
        }
      }
    }
    gameState.previousCactiSegments.set(cactus.id, [...cactus.segments]);
  }
  gameState.cacti = msg.cacti;

  countEl.textContent = `${gameState.players.length} player${
    gameState.players.length !== 1 ? "s" : ""
  }`;

  const me = gameState.getLocalPlayer();
  if (me) gameState.localFacing = me.facing;
}

function handleStateUpdate(msg) {
  if (msg.type === "game_joined") {
    handleGameJoined(msg);
    return;
  }
  if (msg.type === "arena") {
    handleArena(msg);
    return;
  }
  if (msg.type === "game_state") {
    handleGameState(msg);
  }
}

function handleGameOver(msg) {
  gameState.gameOverAt = Date.now();
  winnerText.textContent = `🏆 ${msg.winnerName} wins!`;
  overlay.classList.add("visible");

  let remaining = 5;
  countdownText.textContent = `Returning to lobby in ${remaining}s…`;
  const interval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(interval);
      globalThis.location.href = "/lobby.html";
    } else {
      countdownText.textContent = `Returning to lobby in ${remaining}s…`;
    }
  }, 1000);
}

function handleDisconnect() {
  if (gameState.gameOverAt) return; // Already handled
  renderer.drawDisconnected();
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup Systems
// ─────────────────────────────────────────────────────────────────────────────

const network = createNetworkManager(
  gameId,
  playerName,
  handleStateUpdate,
  handleGameOver,
  handleDisconnect,
);

const inputHandler = setupInputHandler(network, sounds, gameState, CONSTANTS);

const renderer = createRenderer(canvas, gameState, effects, CONSTANTS);
let hasCleanedUp = false;

function cleanupSession() {
  if (hasCleanedUp) return;
  hasCleanedUp = true;
  inputHandler.dispose();
  network.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// Start Game Loop
// ─────────────────────────────────────────────────────────────────────────────

requestAnimationFrame(() => renderer.render(inputHandler));

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup on Page Unload
// ─────────────────────────────────────────────────────────────────────────────

globalThis.addEventListener("beforeunload", () => {
  network.send({ type: "leave_game" });
  cleanupSession();
});

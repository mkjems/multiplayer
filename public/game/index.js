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

// ─────────────────────────────────────────────────────────────────────────────
// Initialize Game
// ─────────────────────────────────────────────────────────────────────────────

const playerName = sessionStorage.getItem("playerName");
const gameId = sessionStorage.getItem("gameId");
if (!playerName || !gameId) globalThis.location.href = "/";

// Update page title
document.getElementById("game-title").textContent =
  gameId.charAt(0).toUpperCase() + gameId.slice(1);

// Initialize systems
const sounds = createSounds();
const gameState = createGameState();
const effects = createEffects(CONSTANTS);
const canvas = document.getElementById("canvas");
const countEl = document.getElementById("player-count");
const overlay = document.getElementById("overlay");
const winnerText = document.getElementById("winner-text");
const countdownText = document.getElementById("countdown-text");

// ─────────────────────────────────────────────────────────────────────────────
// Network Message Handlers
// ─────────────────────────────────────────────────────────────────────────────

function handleStateUpdate(msg, sounds) {
  if (msg.type === "game_joined") {
    gameState.myId = msg.playerId;
  } else if (msg.type === "arena") {
    gameState.rocks = msg.rocks;
    gameState.cacti = msg.cacti;
  } else if (msg.type === "game_state") {
    const now = Date.now();

    // Track player deaths and hits for sound/animation
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

    // Track bullet bounces
    for (const b of msg.bullets) {
      const prev = gameState.previousBounces.get(b.id) ?? 0;
      if (b.bounces > prev) sounds.playRicochet();
      gameState.previousBounces.set(b.id, b.bounces);
    }
    for (const id of gameState.previousBounces.keys()) {
      if (!msg.bullets.some((b) => b.id === id)) gameState.previousBounces.delete(id);
    }

    // Track bullet trails
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

    // Track cactus destruction
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

    // Update player count
    countEl.textContent = `${gameState.players.length} player${
      gameState.players.length !== 1 ? "s" : ""
    }`;

    // Update local facing
    const me = gameState.getLocalPlayer();
    if (me) gameState.localFacing = me.facing;
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
  sounds,
  handleStateUpdate,
  handleGameOver,
  handleDisconnect,
);

const inputHandler = setupInputHandler(network, sounds, gameState, CONSTANTS);

const renderer = createRenderer(canvas, gameState, effects, CONSTANTS);

// ─────────────────────────────────────────────────────────────────────────────
// Start Game Loop
// ─────────────────────────────────────────────────────────────────────────────

requestAnimationFrame(() => renderer.render(inputHandler));

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup on Page Unload
// ─────────────────────────────────────────────────────────────────────────────

globalThis.addEventListener("beforeunload", () => {
  network.send({ type: "leave_game" });
});

// ═════════════════════════════════════════════════════════════════════════════
// Game Entry Point
// ═════════════════════════════════════════════════════════════════════════════

import { createSounds } from "../sounds.ts";
import * as CONSTANTS from "./constants.ts";
import { createGameState } from "./state.ts";
import { createEffects } from "./effects.ts";
import { createNetworkManager } from "./network.ts";
import { setupInputHandler } from "./input.ts";
import { setupTouchControls } from "./touch-controls.ts";
import { createRenderer } from "./render.ts";
import { requireCanvas, requireElement } from "./utils.ts";
import type { ServerMessage } from "../../shared/protocol";

// ─────────────────────────────────────────────────────────────────────────────
// Initialize Game
// ─────────────────────────────────────────────────────────────────────────────

const playerName = sessionStorage.getItem("playerName");
const gameId = sessionStorage.getItem("gameId");
if (!playerName || !gameId) {
  globalThis.location.href = "/";
  throw new Error("Missing session data");
}

// Initialize systems
const sounds = createSounds();
const gameState = createGameState();
const effects = createEffects(CONSTANTS);
const canvas = requireCanvas("canvas");
const countEl = requireElement("player-count");
const overlay = requireElement("overlay");
const winnerText = requireElement("winner-text");
const countdownText = requireElement("countdown-text");

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
}
resizeCanvas();
globalThis.addEventListener("resize", resizeCanvas);

// ─────────────────────────────────────────────────────────────────────────────
// Network Message Handlers
// ─────────────────────────────────────────────────────────────────────────────

function handleGameJoined(
  msg: Extract<ServerMessage, { type: "game_joined" }>,
): void {
  gameState.myId = msg.playerId;
}

function handleArena(msg: Extract<ServerMessage, { type: "arena" }>): void {
  gameState.rocks = msg.rocks;
  gameState.cacti = msg.cacti;
  gameState.arenaConfig = { ...msg.config };
  gameState.previousCactiSegments.clear();
  for (const cactus of msg.cacti) {
    gameState.previousCactiSegments.set(cactus.id, [...cactus.segments]);
  }
}

function handlePlayerJoined(
  msg: Extract<ServerMessage, { type: "player_joined" }>,
): void {
  gameState.playerInfos.set(msg.player.id, msg.player);
}

function handlePlayerLeft(
  msg: Extract<ServerMessage, { type: "player_left" }>,
): void {
  gameState.playerInfos.delete(msg.playerId);
  gameState.players = gameState.players.filter((player) =>
    player.id !== msg.playerId
  );
  gameState.deathTimes.delete(msg.playerId);
  gameState.hitTimes.delete(msg.playerId);
  gameState.previousHealth.delete(msg.playerId);
}

function handleGameState(
  msg: Extract<ServerMessage, { type: "game_state" }>,
): void {
  const now = Date.now();

  for (const playerState of msg.players) {
    if (!playerState.alive && !gameState.deathTimes.has(playerState.id)) {
      gameState.deathTimes.set(playerState.id, now);
      sounds.playDeath();
    }
    const previousHealth = gameState.previousHealth.get(playerState.id) ??
      playerState.health;
    if (playerState.health < previousHealth) {
      gameState.hitTimes.set(playerState.id, now);
      if (playerState.id === gameState.myId) {
        effects.trigger();
        sounds.playHit(true);
      } else {
        sounds.playHit(false);
      }
    }
    gameState.previousHealth.set(playerState.id, playerState.health);
  }

  gameState.applyPlayerStates(msg.players);
  gameState.bullets = msg.bullets;
  const liveBulletIds = new Set(msg.bullets.map((bullet) => bullet.id));

  for (const b of msg.bullets) {
    const previousBounceCount = gameState.previousBounces.get(b.id) ?? 0;
    if (b.bounces > previousBounceCount) sounds.playRicochet();
    gameState.previousBounces.set(b.id, b.bounces);

    const trail = gameState.bulletTrails.get(b.id) ?? [];
    if (b.bounces > previousBounceCount) {
      gameState.bulletTrails.set(b.id, [{ x: b.x, y: b.y }]);
    } else {
      trail.push({ x: b.x, y: b.y });
      if (trail.length > CONSTANTS.TRAIL_MAX_POSITIONS) trail.shift();
      gameState.bulletTrails.set(b.id, trail);
    }
  }

  for (const id of gameState.previousBounces.keys()) {
    if (!liveBulletIds.has(id)) {
      gameState.previousBounces.delete(id);
    }
  }
  for (const id of gameState.bulletTrails.keys()) {
    if (!liveBulletIds.has(id)) {
      gameState.bulletTrails.delete(id);
    }
  }

  countEl.textContent = `${gameState.players.length} player${
    gameState.players.length !== 1 ? "s" : ""
  }`;

  const me = gameState.getLocalPlayer();
  if (me) gameState.localFacing = me.facing;
}

function handleCactusDamaged(
  msg: Extract<ServerMessage, { type: "cactus_damaged" }>,
): void {
  const cactus = gameState.cacti.find((candidate) =>
    candidate.id === msg.cactusId
  );
  if (
    !cactus ||
    msg.segmentIndex < 0 ||
    msg.segmentIndex >= cactus.segments.length
  ) {
    return;
  }

  if (cactus.segments[msg.segmentIndex]) {
    cactus.segments[msg.segmentIndex] = false;
    gameState.previousCactiSegments.set(cactus.id, [...cactus.segments]);
    sounds.playCactusHit();
  }
}

function handleStateUpdate(msg: ServerMessage): void {
  if (msg.type === "game_joined") {
    handleGameJoined(msg);
    return;
  }
  if (msg.type === "arena") {
    handleArena(msg);
    return;
  }
  if (msg.type === "player_joined") {
    handlePlayerJoined(msg);
    return;
  }
  if (msg.type === "player_left") {
    handlePlayerLeft(msg);
    return;
  }
  if (msg.type === "game_state") {
    handleGameState(msg);
    return;
  }
  if (msg.type === "cactus_damaged") {
    handleCactusDamaged(msg);
  }
}

function handleGameOver(
  msg: Extract<ServerMessage, { type: "game_over" }>,
): void {
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

function handleDisconnect(): void {
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

const touchControlsDispose = navigator.maxTouchPoints > 0
  ? setupTouchControls(inputHandler, gameState)
  : null;

const renderer = createRenderer(canvas, gameState, effects, CONSTANTS);
let hasCleanedUp = false;

function cleanupSession(): void {
  if (hasCleanedUp) return;
  hasCleanedUp = true;
  inputHandler.dispose();
  touchControlsDispose?.();
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

import type { ClientMessage, ServerMessage } from "../../shared/protocol";
import { createSounds, type Sounds } from "../sounds.ts";
import * as CONSTANTS from "./constants.ts";
import { createEffects } from "./effects.ts";
import { type InputHandler, setupInputHandler } from "./input.ts";
import { createNetworkManager, type NetworkManager } from "./network.ts";
import { createRenderer } from "./render.ts";
import { createGameState, type GameState } from "./state.ts";
import { setupTouchControls } from "./touch-controls.ts";

const gameOverReturnDelayMs = 5000;

export type GameConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected";

export type GameUiEvent =
  | { type: "connection_changed"; status: GameConnectionStatus }
  | { type: "player_count_changed"; playerCount: number }
  | { type: "local_player_hud_changed"; hud: LocalPlayerHudSnapshot | null }
  | { type: "muted_changed"; isMuted: boolean }
  | {
    type: "game_over";
    winnerName: string;
    returnToLobbyAt: number;
  }
  | { type: "return_countdown_changed"; remainingSeconds: number }
  | { type: "disconnected" };

export type GameUiEventListener = (event: GameUiEvent) => void;

export interface LocalPlayerHudSnapshot {
  health: number;
  energy: number;
  ammo: number;
  kills: number;
  reloading: boolean;
  alive: boolean;
}

export interface CreateGameSessionOptions {
  canvas: HTMLCanvasElement;
  gameId: string;
  playerName: string;
  initialMuted?: boolean;
  onUiEvent?: GameUiEventListener;
  onReturnToLobby?: () => void;
}

export interface GameSession {
  start(): void;
  dispose(): void;
  leaveGame(): void;
  setMuted(isMuted: boolean): void;
  toggleMuted(): boolean;
  setTouchMove(dx: number, dy: number): void;
  clearTouchMove(): void;
  setTouchArmAngle(angle: number): void;
  shoot(): void;
  reload(): void;
}

// React and DOM adapters should use GameSession instead of reaching into the
// renderer, network manager, or mutable game state directly.
function resizeCanvas(canvas: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
}

function sendMessage(
  network: NetworkManager | null,
  message: ClientMessage,
): void {
  network?.send(message);
}

function handleGameJoined(
  gameState: GameState,
  emitUiEvent: GameUiEventListener,
  message: Extract<ServerMessage, { type: "game_joined" }>,
): void {
  gameState.setLocalPlayerId(message.playerId);
  emitUiEvent({ type: "connection_changed", status: "connected" });
}

function handleArena(
  gameState: GameState,
  message: Extract<ServerMessage, { type: "arena" }>,
): void {
  gameState.applyArena(message.rocks, message.cacti, message.config);
}

function handlePlayerJoined(
  gameState: GameState,
  message: Extract<ServerMessage, { type: "player_joined" }>,
): void {
  gameState.setPlayerInfo(message.player);
}

function handlePlayerLeft(
  gameState: GameState,
  message: Extract<ServerMessage, { type: "player_left" }>,
): void {
  gameState.removePlayer(message.playerId);
}

function handleGameState(
  gameState: GameState,
  sounds: Sounds,
  effects: ReturnType<typeof createEffects>,
  emitGameStateUi: () => void,
  message: Extract<ServerMessage, { type: "game_state" }>,
): void {
  const now = Date.now();

  for (const playerState of message.players) {
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

  gameState.applyPlayerStates(message.players);
  gameState.setBullets(message.bullets);
  const liveBulletIds = new Set(message.bullets.map((bullet) => bullet.id));

  for (const bullet of message.bullets) {
    const previousBounceCount = gameState.previousBounces.get(bullet.id) ?? 0;
    if (bullet.bounces > previousBounceCount) sounds.playRicochet();
    gameState.previousBounces.set(bullet.id, bullet.bounces);

    const trail = gameState.bulletTrails.get(bullet.id) ?? [];
    if (bullet.bounces > previousBounceCount) {
      gameState.bulletTrails.set(bullet.id, [{ x: bullet.x, y: bullet.y }]);
    } else {
      trail.push({ x: bullet.x, y: bullet.y });
      if (trail.length > CONSTANTS.TRAIL_MAX_POSITIONS) trail.shift();
      gameState.bulletTrails.set(bullet.id, trail);
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

  const localPlayer = gameState.getLocalPlayer();
  if (localPlayer) gameState.localFacing = localPlayer.facing;

  emitGameStateUi();
}

function handleCactusDamaged(
  gameState: GameState,
  sounds: Sounds,
  message: Extract<ServerMessage, { type: "cactus_damaged" }>,
): void {
  if (gameState.damageCactusSegment(message.cactusId, message.segmentIndex)) {
    sounds.playCactusHit();
  }
}

export function createGameSession(
  options: CreateGameSessionOptions,
): GameSession {
  const gameState = createGameState();
  const sounds = createSounds();
  const effects = createEffects(CONSTANTS);
  const renderer = createRenderer(
    options.canvas,
    gameState,
    effects,
    CONSTANTS,
  );

  let network: NetworkManager | null = null;
  let inputHandler: InputHandler | null = null;
  let touchControlsDispose: (() => void) | null = null;
  let returnCountdownInterval: number | null = null;
  let returnToLobbyTimeout: number | null = null;
  let lastPlayerCount: number | null = null;
  let lastLocalPlayerHudSnapshot: LocalPlayerHudSnapshot | null = null;
  let hasStarted = false;
  let hasDisposed = false;

  if (options.initialMuted !== undefined) {
    sounds.setMuted(options.initialMuted);
  }

  function emitUiEvent(event: GameUiEvent): void {
    options.onUiEvent?.(event);
  }

  function toLocalPlayerHudSnapshot(): LocalPlayerHudSnapshot | null {
    const localPlayer = gameState.getLocalPlayer();
    if (!localPlayer) return null;

    return {
      health: localPlayer.health,
      energy: localPlayer.energy,
      ammo: localPlayer.ammo,
      kills: localPlayer.kills,
      reloading: localPlayer.reloading,
      alive: localPlayer.alive,
    };
  }

  function hasSameLocalPlayerHudSnapshot(
    left: LocalPlayerHudSnapshot | null,
    right: LocalPlayerHudSnapshot | null,
  ): boolean {
    if (left === null || right === null) return left === right;

    return left.health === right.health &&
      left.energy === right.energy &&
      left.ammo === right.ammo &&
      left.kills === right.kills &&
      left.reloading === right.reloading &&
      left.alive === right.alive;
  }

  function emitGameStateUi(): void {
    const playerCount = gameState.players.length;
    if (playerCount !== lastPlayerCount) {
      lastPlayerCount = playerCount;
      emitUiEvent({ type: "player_count_changed", playerCount });
    }

    const localPlayerHudSnapshot = toLocalPlayerHudSnapshot();
    if (
      !hasSameLocalPlayerHudSnapshot(
        localPlayerHudSnapshot,
        lastLocalPlayerHudSnapshot,
      )
    ) {
      lastLocalPlayerHudSnapshot = localPlayerHudSnapshot;
      emitUiEvent({
        type: "local_player_hud_changed",
        hud: localPlayerHudSnapshot,
      });
    }
  }

  function clearGameOverTimers(): void {
    if (returnCountdownInterval !== null) {
      globalThis.clearInterval(returnCountdownInterval);
      returnCountdownInterval = null;
    }
    if (returnToLobbyTimeout !== null) {
      globalThis.clearTimeout(returnToLobbyTimeout);
      returnToLobbyTimeout = null;
    }
  }

  function scheduleReturnToLobby(returnToLobbyAt: number): void {
    clearGameOverTimers();

    emitUiEvent({
      type: "return_countdown_changed",
      remainingSeconds: Math.ceil((returnToLobbyAt - Date.now()) / 1000),
    });

    returnCountdownInterval = globalThis.setInterval(() => {
      const remainingSeconds = Math.max(
        0,
        Math.ceil((returnToLobbyAt - Date.now()) / 1000),
      );
      emitUiEvent({ type: "return_countdown_changed", remainingSeconds });
    }, 1000);

    returnToLobbyTimeout = globalThis.setTimeout(() => {
      clearGameOverTimers();
      options.onReturnToLobby?.();
    }, gameOverReturnDelayMs);
  }

  function handleStateUpdate(message: ServerMessage): void {
    if (message.type === "game_joined") {
      handleGameJoined(gameState, emitUiEvent, message);
      return;
    }
    if (message.type === "arena") {
      handleArena(gameState, message);
      return;
    }
    if (message.type === "player_joined") {
      handlePlayerJoined(gameState, message);
      return;
    }
    if (message.type === "player_left") {
      handlePlayerLeft(gameState, message);
      return;
    }
    if (message.type === "game_state") {
      handleGameState(gameState, sounds, effects, emitGameStateUi, message);
      return;
    }
    if (message.type === "cactus_damaged") {
      handleCactusDamaged(gameState, sounds, message);
    }
  }

  function handleGameOver(
    message: Extract<ServerMessage, { type: "game_over" }>,
  ): void {
    gameState.gameOverAt = Date.now();
    const returnToLobbyAt = Date.now() + gameOverReturnDelayMs;
    emitUiEvent({
      type: "game_over",
      winnerName: message.winnerName,
      returnToLobbyAt,
    });
    scheduleReturnToLobby(returnToLobbyAt);
  }

  function handleDisconnect(): void {
    if (gameState.gameOverAt) return;
    emitUiEvent({ type: "connection_changed", status: "disconnected" });
    emitUiEvent({ type: "disconnected" });
    renderer.drawDisconnected();
  }

  function beforeUnload(): void {
    sendMessage(network, { type: "leave_game" });
    dispose();
  }

  function resizeCanvasToViewport(): void {
    resizeCanvas(options.canvas);
  }

  function start(): void {
    if (hasStarted) return;
    hasStarted = true;
    hasDisposed = false;

    resizeCanvasToViewport();
    globalThis.addEventListener("resize", resizeCanvasToViewport);
    globalThis.addEventListener("beforeunload", beforeUnload);

    emitUiEvent({ type: "connection_changed", status: "connecting" });
    emitUiEvent({ type: "muted_changed", isMuted: sounds.isMuted() });
    emitUiEvent({ type: "local_player_hud_changed", hud: null });

    network = createNetworkManager(
      options.gameId,
      options.playerName,
      handleStateUpdate,
      handleGameOver,
      handleDisconnect,
    );

    inputHandler = setupInputHandler(network, sounds, gameState, CONSTANTS);
    touchControlsDispose = navigator.maxTouchPoints > 0
      ? setupTouchControls(inputHandler, gameState)
      : null;

    renderer.start(inputHandler);
  }

  function dispose(): void {
    if (hasDisposed) return;
    hasDisposed = true;
    hasStarted = false;

    clearGameOverTimers();
    renderer.dispose();
    inputHandler?.dispose();
    touchControlsDispose?.();
    network?.close();

    inputHandler = null;
    touchControlsDispose = null;
    network = null;
    globalThis.removeEventListener("beforeunload", beforeUnload);
    globalThis.removeEventListener("resize", resizeCanvasToViewport);
  }

  function leaveGame(): void {
    sendMessage(network, { type: "leave_game" });
    dispose();
  }

  return {
    start,
    dispose,
    leaveGame,
    setMuted(isMuted: boolean): void {
      sounds.setMuted(isMuted);
      emitUiEvent({ type: "muted_changed", isMuted: sounds.isMuted() });
    },
    toggleMuted(): boolean {
      const isMuted = sounds.toggleMute();
      emitUiEvent({ type: "muted_changed", isMuted });
      return isMuted;
    },
    setTouchMove(dx: number, dy: number): void {
      inputHandler?.setTouchMove(dx, dy);
    },
    clearTouchMove(): void {
      inputHandler?.clearTouchMove();
    },
    setTouchArmAngle(angle: number): void {
      inputHandler?.setTouchArmAngle(angle);
    },
    shoot(): void {
      inputHandler?.fireTouchShoot();
    },
    reload(): void {
      inputHandler?.fireTouchReload();
    },
  };
}

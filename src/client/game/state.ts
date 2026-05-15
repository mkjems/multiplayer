// ═════════════════════════════════════════════════════════════════════════════
// Game State Management
// ═════════════════════════════════════════════════════════════════════════════

import {
  DEFAULT_ARM_LENGTH,
  DEFAULT_ARM_MAX,
  DEFAULT_CACTUS_HALF_WIDTH,
  DEFAULT_CACTUS_SEGMENT_HEIGHT,
  DEFAULT_CACTUS_SEGMENT_STRIDE,
  DEFAULT_CACTUS_SEGMENT_WIDTH,
  DEFAULT_WORLD_HEIGHT,
  DEFAULT_WORLD_WIDTH,
} from "./constants";
import type {
  ArenaConfig,
  BulletSnapshot,
  CactusData,
  PlayerSnapshot,
  RockData,
  ServerMessage,
} from "../../shared/protocol";

export interface GameState {
  myId: string | null;
  players: PlayerSnapshot[];
  bullets: BulletSnapshot[];
  rocks: RockData[];
  cacti: CactusData[];
  gameOverAt: number | null;
  localArmAngle: number;
  localFacing: "left" | "right";
  arenaConfig: ArenaConfig;
  deathTimes: Map<string, number>;
  hitTimes: Map<string, number>;
  previousHealth: Map<string, number>;
  previousBounces: Map<string, number>;
  bulletTrails: Map<string, { x: number; y: number }[]>;
  previousCactiSegments: Map<string, boolean[]>;
  updateFromServerMessage(msg: ServerMessage): void;
  getLocalPlayer(): PlayerSnapshot | undefined;
  reset(): void;
}

/**
 * Factory function to create game state object.
 * Encapsulates all mutable game data and provides methods to update it.
 */
export function createGameState(): GameState {
  return {
    // Player and entity data
    myId: null,
    players: [],
    bullets: [],
    rocks: [],
    cacti: [],
    gameOverAt: null,

    // Local input state
    localArmAngle: 0,
    localFacing: "right",

    // Server-authoritative arena config (defaults used until arena message arrives)
    arenaConfig: {
      arenaWidth: DEFAULT_WORLD_WIDTH,
      arenaHeight: DEFAULT_WORLD_HEIGHT,
      armMax: DEFAULT_ARM_MAX,
      armLength: DEFAULT_ARM_LENGTH,
      cactusHalfWidth: DEFAULT_CACTUS_HALF_WIDTH,
      cactusSegmentStride: DEFAULT_CACTUS_SEGMENT_STRIDE,
      cactusSegmentWidth: DEFAULT_CACTUS_SEGMENT_WIDTH,
      cactusSegmentHeight: DEFAULT_CACTUS_SEGMENT_HEIGHT,
    },

    // Tracking for visual effects and state changes
    deathTimes: new Map<string, number>(),
    hitTimes: new Map<string, number>(),
    previousHealth: new Map<string, number>(),
    previousBounces: new Map<string, number>(),
    bulletTrails: new Map<string, { x: number; y: number }[]>(),
    previousCactiSegments: new Map<string, boolean[]>(),

    // Apply server state update to game state
    updateFromServerMessage(msg: ServerMessage): void {
      if (msg.type === "game_state") {
        this.players = msg.players;
        this.bullets = msg.bullets;
        this.cacti = msg.cacti;
      } else if (msg.type === "arena") {
        this.rocks = msg.rocks;
        this.cacti = msg.cacti;
        if (msg.config) this.arenaConfig = { ...msg.config };
      }
    },

    // Get current player
    getLocalPlayer(): PlayerSnapshot | undefined {
      return this.players.find((p) => p.id === this.myId);
    },

    // Reset state for new game
    reset(): void {
      this.myId = null;
      this.players = [];
      this.bullets = [];
      this.rocks = [];
      this.cacti = [];
      this.gameOverAt = null;
      this.localArmAngle = 0;
      this.localFacing = "right";
      this.arenaConfig = {
        arenaWidth: DEFAULT_WORLD_WIDTH,
        arenaHeight: DEFAULT_WORLD_HEIGHT,
        armMax: DEFAULT_ARM_MAX,
        armLength: DEFAULT_ARM_LENGTH,
        cactusHalfWidth: DEFAULT_CACTUS_HALF_WIDTH,
        cactusSegmentStride: DEFAULT_CACTUS_SEGMENT_STRIDE,
        cactusSegmentWidth: DEFAULT_CACTUS_SEGMENT_WIDTH,
        cactusSegmentHeight: DEFAULT_CACTUS_SEGMENT_HEIGHT,
      };
      this.deathTimes.clear();
      this.hitTimes.clear();
      this.previousHealth.clear();
      this.previousBounces.clear();
      this.bulletTrails.clear();
      this.previousCactiSegments.clear();
    },
  };
}

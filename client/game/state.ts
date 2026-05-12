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
} from "./constants.js";
import type {
  ArenaConfig,
  BulletSnapshot,
  CactusData,
  PlayerSnapshot,
  RockData,
  ServerMessage,
} from "../../shared/protocol.ts";

/**
 * Factory function to create game state object.
 * Encapsulates all mutable game data and provides methods to update it.
 */
export function createGameState() {
  return {
    // Player and entity data
    myId: null as string | null,
    players: [] as PlayerSnapshot[],
    bullets: [] as BulletSnapshot[],
    rocks: [] as RockData[],
    cacti: [] as CactusData[],
    gameOverAt: null,

    // Local input state
    localArmAngle: 0,
    localFacing: "right",

    // Server-authoritative arena config (defaults used until arena message arrives)
    arenaConfig: {
      armMax: DEFAULT_ARM_MAX,
      armLength: DEFAULT_ARM_LENGTH,
      cactusHalfWidth: DEFAULT_CACTUS_HALF_WIDTH,
      cactusSegmentStride: DEFAULT_CACTUS_SEGMENT_STRIDE,
      cactusSegmentWidth: DEFAULT_CACTUS_SEGMENT_WIDTH,
      cactusSegmentHeight: DEFAULT_CACTUS_SEGMENT_HEIGHT,
    } as ArenaConfig,

    // Tracking for visual effects and state changes
    deathTimes: new Map(), // playerId → timestamp when alive went false
    hitTimes: new Map(), // playerId → timestamp of last hit
    previousHealth: new Map(), // playerId → last known health
    previousBounces: new Map(), // bulletId → last known bounce count
    bulletTrails: new Map(), // bulletId → [{x, y}, …] (oldest first)
    previousCactiSegments: new Map(), // cactusId → segments boolean[]

    // Apply server state update to game state
    updateFromServerMessage(msg: ServerMessage) {
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
    getLocalPlayer() {
      return this.players.find((p) => p.id === this.myId);
    },

    // Reset state for new game
    reset() {
      this.myId = null;
      this.players = [];
      this.bullets = [];
      this.rocks = [];
      this.cacti = [];
      this.gameOverAt = null;
      this.localArmAngle = 0;
      this.localFacing = "right";
      this.arenaConfig = {
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

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
} from "./constants.ts";
import type {
  ArenaConfig,
  BulletSnapshot,
  CactusData,
  PlayerInfo,
  PlayerSnapshot,
  PlayerStateSnapshot,
  RockData,
} from "../../shared/protocol";

export interface GameState {
  myId: string | null;
  players: PlayerSnapshot[];
  playerInfos: Map<string, PlayerInfo>;
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
  setLocalPlayerId(playerId: string): void;
  applyArena(rocks: RockData[], cacti: CactusData[], config: ArenaConfig): void;
  setPlayerInfo(playerInfo: PlayerInfo): void;
  removePlayer(playerId: string): void;
  applyPlayerStates(playerStates: PlayerStateSnapshot[]): void;
  setBullets(bullets: BulletSnapshot[]): void;
  damageCactusSegment(cactusId: string, segmentIndex: number): boolean;
  getLocalPlayer(): PlayerSnapshot | undefined;
  reset(): void;
}

const UNKNOWN_PLAYER_NAME = "Unknown";
const UNKNOWN_PLAYER_COLOR = "#ffffff";

function mergePlayerState(
  playerInfo: PlayerInfo | undefined,
  playerState: PlayerStateSnapshot,
): PlayerSnapshot {
  return {
    ...(playerInfo ?? {
      id: playerState.id,
      name: UNKNOWN_PLAYER_NAME,
      color: UNKNOWN_PLAYER_COLOR,
    }),
    ...playerState,
  };
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
    playerInfos: new Map<string, PlayerInfo>(),
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

    setLocalPlayerId(playerId: string): void {
      this.myId = playerId;
    },

    applyArena(
      rocks: RockData[],
      cacti: CactusData[],
      config: ArenaConfig,
    ): void {
      this.rocks = rocks;
      this.cacti = cacti;
      this.arenaConfig = { ...config };
    },

    setPlayerInfo(playerInfo: PlayerInfo): void {
      this.playerInfos.set(playerInfo.id, playerInfo);
    },

    removePlayer(playerId: string): void {
      this.playerInfos.delete(playerId);
      this.players = this.players.filter((player) => player.id !== playerId);
      this.deathTimes.delete(playerId);
      this.hitTimes.delete(playerId);
      this.previousHealth.delete(playerId);
    },

    applyPlayerStates(playerStates: PlayerStateSnapshot[]): void {
      this.players = playerStates.map((playerState) =>
        mergePlayerState(this.playerInfos.get(playerState.id), playerState)
      );
    },

    setBullets(bullets: BulletSnapshot[]): void {
      this.bullets = bullets;
    },

    damageCactusSegment(cactusId: string, segmentIndex: number): boolean {
      const cactus = this.cacti.find((candidate) => candidate.id === cactusId);
      if (
        !cactus ||
        segmentIndex < 0 ||
        segmentIndex >= cactus.segments.length ||
        !cactus.segments[segmentIndex]
      ) {
        return false;
      }

      cactus.segments[segmentIndex] = false;
      return true;
    },

    // Get current player
    getLocalPlayer(): PlayerSnapshot | undefined {
      return this.players.find((p) => p.id === this.myId);
    },

    // Reset state for new game
    reset(): void {
      this.myId = null;
      this.players = [];
      this.playerInfos.clear();
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
    },
  };
}

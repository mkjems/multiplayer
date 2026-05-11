// ═════════════════════════════════════════════════════════════════════════════
// Game State Management
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Factory function to create game state object.
 * Encapsulates all mutable game data and provides methods to update it.
 */
export function createGameState() {
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

    // Tracking for visual effects and state changes
    deathTimes: new Map(), // playerId → timestamp when alive went false
    hitTimes: new Map(), // playerId → timestamp of last hit
    previousHealth: new Map(), // playerId → last known health
    previousBounces: new Map(), // bulletId → last known bounce count
    bulletTrails: new Map(), // bulletId → [{x, y}, …] (oldest first)
    previousCactiSegments: new Map(), // cactusId → segments boolean[]

    // Apply server state update to game state
    updateFromServerMessage(msg) {
      if (msg.type === "game_state") {
        this.players = msg.players;
        this.bullets = msg.bullets;
        this.cacti = msg.cacti;
      } else if (msg.type === "arena") {
        this.rocks = msg.rocks;
        this.cacti = msg.cacti;
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
      this.deathTimes.clear();
      this.hitTimes.clear();
      this.previousHealth.clear();
      this.previousBounces.clear();
      this.bulletTrails.clear();
      this.previousCactiSegments.clear();
    },
  };
}

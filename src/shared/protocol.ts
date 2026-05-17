export type ClientMessage =
  | { type: "join_lobby" }
  | { type: "join_game"; gameId: string; playerName: string }
  | { type: "leave_game" }
  | { type: "move"; dx: number; dy: number }
  | { type: "arm_angle"; angle: number }
  | { type: "shoot" }
  | { type: "reload" }
  | { type: "ping" };

export type ServerMessage =
  | { type: "lobby_state"; games: GameInfo[]; lobbyCount: number }
  | { type: "game_joined"; playerId: string; gameId: string }
  | { type: "player_joined"; player: PlayerInfo }
  | { type: "player_left"; playerId: string }
  | {
    type: "arena";
    rocks: RockData[];
    cacti: CactusData[];
    config: ArenaConfig;
  }
  | {
    type: "game_state";
    players: PlayerStateSnapshot[];
    bullets: BulletSnapshot[];
  }
  | { type: "cactus_damaged"; cactusId: string; segmentIndex: number }
  | { type: "game_over"; winnerName: string }
  | { type: "error"; message: string };

export interface GameInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: "waiting" | "playing";
}

export interface PlayerInfo {
  id: string;
  name: string;
  color: string;
}

export interface PlayerStateSnapshot {
  id: string;
  x: number;
  y: number;
  health: number;
  energy: number;
  ammo: number;
  armAngle: number;
  facing: "left" | "right";
  alive: boolean;
  reloading: boolean;
  kills: number;
}

export type PlayerSnapshot = PlayerInfo & PlayerStateSnapshot;

export interface BulletSnapshot {
  id: string;
  x: number;
  y: number;
  bounces: number;
}

export interface RockData {
  id: string;
  x: number;
  y: number;
  vertices: { x: number; y: number }[];
}

export interface CactusData {
  id: string;
  x: number;
  y: number;
  segments: boolean[]; // true = alive, index 0 = top, 5 segments
}

export interface ArenaConfig {
  arenaWidth: number;
  arenaHeight: number;
  armMax: number;
  armLength: number;
  cactusHalfWidth: number;
  cactusSegmentStride: number;
  cactusSegmentWidth: number;
  cactusSegmentHeight: number;
}

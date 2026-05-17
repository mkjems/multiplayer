import type {
  NetworkMetrics,
  TickDurationMetrics,
} from "../shared/diagnostics.ts";
import type { Player } from "./player.ts";

export interface Bullet {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  bounces: number;
}

export interface Rock {
  id: string;
  x: number;
  y: number;
  boundingRadius: number;
  vertices: { x: number; y: number }[];
}

export interface Cactus {
  id: string;
  x: number;
  y: number;
  segments: boolean[];
}

export interface Vector {
  x: number;
  y: number;
}

export interface CactusSegmentHit {
  cactus: Cactus;
  segmentIndex: number;
  t: number;
}

export interface RoomPerformanceMetrics {
  tickCount: number;
  tickDuration: TickDurationMetrics;
  network: NetworkMetrics;
}

export interface BroadcastResult {
  sentCount: number;
  skippedCount: number;
  maxBufferedBytes: number;
}

export interface GameRoom {
  id: string;
  name: string;
  maxPlayers: number;
  players: Map<string, Player>;
  sockets: Map<string, WebSocket>;
  bullets: Bullet[];
  rocks: Rock[];
  cacti: Cactus[];
  gameOver: boolean;
  interval: number | null;
  metrics: RoomPerformanceMetrics;
  handleSocketError(playerId: string): void;
}

export interface TickDurationMetrics {
  lastMilliseconds: number;
  averageMilliseconds: number;
  maxMilliseconds: number;
}

export interface NetworkMetrics {
  lastGameStateBytes: number;
  totalGameStateBytes: number;
  lastGameStateRecipientCount: number;
  skippedGameStateCount: number;
  lastMaxBufferedBytes: number;
  maxBufferedBytes: number;
}

export interface RoomDiagnostics {
  id: string;
  name: string;
  active: boolean;
  playerCount: number;
  socketCount: number;
  bulletCount: number;
  rockCount: number;
  cactusCount: number;
  tickCount: number;
  tickDurationMilliseconds: TickDurationMetrics;
  network: NetworkMetrics;
}

export interface DiagnosticsResponse {
  generatedAt: string;
  rooms: RoomDiagnostics[];
}

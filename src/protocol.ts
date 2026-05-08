export type ClientMessage =
  | { type: "join_lobby" }
  | { type: "join_game"; gameId: string; playerName: string }
  | { type: "leave_game" }
  | { type: "move"; dx: number; dy: number };

export type ServerMessage =
  | { type: "lobby_state"; games: GameInfo[] }
  | { type: "game_joined"; playerId: string; gameId: string }
  | { type: "game_state"; players: PlayerSnapshot[] }
  | { type: "error"; message: string };

export interface GameInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: "waiting" | "playing";
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

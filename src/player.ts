import type { PlayerSnapshot } from "./protocol.ts";

const COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12",
  "#9b59b6", "#1abc9c", "#e67e22", "#e91e63",
];

let colorIndex = 0;

export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  dx: number;
  dy: number;
}

export function createPlayer(id: string, name: string): Player {
  return {
    id,
    name,
    x: 100 + Math.random() * 600,
    y: 100 + Math.random() * 400,
    color: COLORS[colorIndex++ % COLORS.length],
    dx: 0,
    dy: 0,
  };
}

export function toSnapshot(player: Player): PlayerSnapshot {
  return { id: player.id, name: player.name, x: player.x, y: player.y, color: player.color };
}

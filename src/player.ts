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
  health: number;
  ammo: number;
  armAngle: number;
  facing: "left" | "right";
  lastShot: number;
  alive: boolean;
  reloading: boolean;
  reloadStart: number;
}

export function createPlayer(id: string, name: string): Player {
  return {
    id,
    name,
    x: 100 + Math.random() * 600,
    y: 100 + Math.random() * 300,
    color: COLORS[colorIndex++ % COLORS.length],
    dx: 0,
    dy: 0,
    health: 100,
    ammo: 6,
    armAngle: 0,
    facing: "right",
    lastShot: 0,
    alive: true,
    reloading: false,
    reloadStart: 0,
  };
}

export function toSnapshot(player: Player): PlayerSnapshot {
  return {
    id: player.id,
    name: player.name,
    x: player.x,
    y: player.y,
    color: player.color,
    health: player.health,
    ammo: player.ammo,
    armAngle: player.armAngle,
    facing: player.facing,
    alive: player.alive,
    reloading: player.reloading,
  };
}

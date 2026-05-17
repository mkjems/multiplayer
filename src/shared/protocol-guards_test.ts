import { parseClientMessage, parseServerMessage } from "./protocol-guards.ts";
import type { ServerMessage } from "./protocol.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

Deno.test("parseClientMessage accepts valid movement and action messages", () => {
  const move = parseClientMessage(JSON.stringify({
    type: "move",
    dx: 1,
    dy: -1,
  }));
  const shoot = parseClientMessage(JSON.stringify({ type: "shoot" }));

  assert(move?.type === "move", "move message should parse");
  if (move?.type !== "move") return;
  assert(move.dx === 1, "move dx should be preserved");
  assert(shoot?.type === "shoot", "shoot message should parse");
});

Deno.test("parseClientMessage rejects malformed client messages", () => {
  assert(
    parseClientMessage(JSON.stringify({ type: "move", dx: "1", dy: 0 })) ===
      null,
    "move with string dx should be rejected",
  );
  assert(
    parseClientMessage(
      JSON.stringify({ type: "join_game", gameId: "dots" }),
    ) ===
      null,
    "join_game without playerName should be rejected",
  );
  assert(
    parseClientMessage(
      JSON.stringify({ type: "arm_angle", angle: Infinity }),
    ) ===
      null,
    "non-finite arm angle should be rejected",
  );
});

Deno.test("parseServerMessage accepts a fully shaped game state", () => {
  const message = {
    type: "game_state",
    players: [
      {
        id: "player_1",
        x: 10,
        y: 20,
        health: 100,
        energy: 90,
        ammo: 6,
        armAngle: 0,
        facing: "right",
        alive: true,
        reloading: false,
        kills: 0,
      },
    ],
    bullets: [{ id: "bullet_1", x: 30, y: 40, bounces: 1 }],
  } satisfies ServerMessage;

  const parsed = parseServerMessage(JSON.stringify(message));

  assert(parsed?.type === "game_state", "game_state should parse");
  if (parsed?.type !== "game_state") return;
  assert(parsed.players[0].id === "player_1", "player id should be preserved");
  assert(parsed.bullets[0].bounces === 1, "bullet bounces should be preserved");
});

Deno.test("parseServerMessage rejects shallow malformed game states", () => {
  const parsed = parseServerMessage(JSON.stringify({
    type: "game_state",
    players: [{ id: "player_1" }],
    bullets: [{ id: "bullet_1", x: 0, y: 0, bounces: 0 }],
  }));

  assert(parsed === null, "player snapshots must include all required fields");
});

Deno.test("parseServerMessage validates arena object shapes", () => {
  const parsed = parseServerMessage(JSON.stringify({
    type: "arena",
    rocks: [{ id: "rock_1", x: 0, y: 0, vertices: [{ x: 1, y: 2 }] }],
    cacti: [{ id: "cactus_1", x: 0, y: 0, segments: [true] }],
    config: {
      arenaWidth: 2000,
      arenaHeight: 1500,
      armMax: 1,
      armLength: 20,
      cactusHalfWidth: 8,
      cactusSegmentStride: 14,
      cactusSegmentWidth: 16,
      cactusSegmentHeight: 14,
    },
  }));

  assert(parsed === null, "rocks need at least three vertices");
});

declare const Deno: {
  test(name: string, testFunction: () => void | Promise<void>): void;
};

import { appRoutes } from "./routes.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

Deno.test("appRoutes exposes stable route patterns", () => {
  assert(
    appRoutes.landing.pattern === "/",
    "landing route pattern should match",
  );
  assert(
    appRoutes.lobby.pattern === "/lobby",
    "lobby route pattern should match",
  );
  assert(
    appRoutes.game.pattern === "/game/:gameId",
    "game route pattern should include a typed game id param",
  );
  assert(
    appRoutes.diagnostics.pattern === "/diagnostics",
    "diagnostics route pattern should match",
  );
});

Deno.test("appRoutes encodes game route parameters", () => {
  assert(
    appRoutes.game.path("dots") === "/game/dots",
    "simple game ids should become route segments",
  );
  assert(
    appRoutes.game.path("room with spaces") === "/game/room%20with%20spaces",
    "game ids should be URL encoded",
  );
});

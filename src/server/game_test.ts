import {
  createRoom,
  getArenaConfig,
  getCactiData,
  getRockData,
  getRoom,
  getRoomDiagnostics,
  listRooms,
} from "./game.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertExists<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

Deno.test("createRoom registers a room with generated arena data", () => {
  const roomId = `test_${crypto.randomUUID()}`;
  const room = createRoom(roomId, "Test Room");

  assert(getRoom(roomId) === room, "created room should be retrievable by id");
  assert(room.players.size === 0, "new room should start without players");
  assert(room.bullets.length === 0, "new room should start without bullets");
  assert(room.interval === null, "new room should not tick until joined");
  assert(getRockData(room).length > 0, "room should have generated rocks");
  assert(getCactiData(room).length > 0, "room should have generated cacti");
});

Deno.test("arena data serialization keeps rock and cactus shapes usable", () => {
  const room = createRoom(`test_${crypto.randomUUID()}`, "Arena Shape Room");
  const config = getArenaConfig();
  const rocks = getRockData(room);
  const cacti = getCactiData(room);

  assert(config.arenaWidth > 0, "arena width should be positive");
  assert(config.arenaHeight > 0, "arena height should be positive");
  assert(config.cactusSegmentHeight > 0, "cactus segments should have height");

  for (const rock of rocks) {
    assert(rock.id.length > 0, "rock should have an id");
    assert(rock.vertices.length >= 3, "rock should be polygonal");
    for (const vertex of rock.vertices) {
      assert(Number.isFinite(vertex.x), "rock vertex x should be finite");
      assert(Number.isFinite(vertex.y), "rock vertex y should be finite");
    }
  }

  for (const cactus of cacti) {
    assert(cactus.id.length > 0, "cactus should have an id");
    assert(cactus.segments.length > 0, "cactus should have segments");
    assert(
      cactus.segments.every((segment) => segment === true),
      "new cactus segments should start intact",
    );
  }
});

Deno.test("room listings and diagnostics expose initial room state", () => {
  const roomId = `test_${crypto.randomUUID()}`;
  createRoom(roomId, "Diagnostics Room", 4);

  const listedRoom = assertExists(
    listRooms().find((room) => room.id === roomId),
    "created room should appear in listRooms",
  );
  assert(listedRoom.name === "Diagnostics Room", "room name should match");
  assert(listedRoom.playerCount === 0, "new room should list zero players");
  assert(listedRoom.maxPlayers === 4, "max player count should match");
  assert(listedRoom.status === "waiting", "empty room should be waiting");

  const diagnostics = assertExists(
    getRoomDiagnostics().find((room) => room.id === roomId),
    "created room should have diagnostics",
  );
  assert(diagnostics.active === false, "empty room should be inactive");
  assert(diagnostics.playerCount === 0, "diagnostics should show no players");
  assert(diagnostics.socketCount === 0, "diagnostics should show no sockets");
  assert(diagnostics.tickCount === 0, "new room should have no ticks");
  assert(diagnostics.rockCount > 0, "diagnostics should include rock count");
  assert(
    diagnostics.cactusCount > 0,
    "diagnostics should include cactus count",
  );
});

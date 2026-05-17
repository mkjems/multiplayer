# TODO



## Sprint 24
- Sprint goal: make protocol and diagnostics contracts strongly typed across client and server.
- Add a shared server-side protocol parser/guard for `ClientMessage`. `src/server/main.ts` currently uses raw `JSON.parse` for WebSocket payloads and then trusts `msg.type`, while the client has `parseServerMessage`. A typed `parseClientMessage` would make message handling safer and more IDE-navigable.
- Strengthen `src/client/protocol-guards.ts`. The current guard only shallow-checks several messages (`arena`, `game_state`) and accepts arrays without validating item shapes, so malformed protocol data can still enter typed client state.
- Share diagnostics response types instead of duplicating them. `TickDurationMetrics`, `NetworkMetrics`, and `RoomDiagnostics` are defined separately in `src/server/game.ts` and `src/client/diagnostics.ts`; put the contract in a shared module so rename/find-references works across the diagnostics boundary.
- Keep shared protocol APIs explicit and easy to navigate with Find All References / Go To Definition.

## Sprint 25
- Sprint goal: split server game code into clear modules without changing behavior.
- Split `src/server/game.ts` into explicit, strongly typed modules. It currently combines room lifecycle, arena generation, collision geometry, player movement/energy, bullet simulation, win-condition handling, broadcasting, and metrics. Suggested first split:
  - `server/arena.ts` for rock/cactus generation and arena config.
  - `server/room.ts` for room creation, lookup, join/leave, reset, and diagnostics.
  - `server/simulation.ts` for `tick`, movement, energy, reloads, bullets, hits, and win conditions.
  - `server/collision.ts` for geometry helpers and collision resolution.
  - `server/broadcast.ts` or `server/network.ts` for room broadcast helpers and socket backpressure metrics.
- Move server-side internal types out of `game.ts` once the modules are split. `Bullet`, `Rock`, `Cactus`, `GameRoom`, diagnostics metrics, and broadcast result types should live next to the code that owns them, with explicit exports where cross-module references are needed.
- Keep module boundaries explicit. Avoid dynamic registration or string-based wiring.
- Verify the split with tests from Sprint 23 plus `deno task check` and `deno task lint`.

## Sprint 26
- Sprint goal: simplify client game state flow.
- Revisit `src/client/game/state.ts` versus `src/client/game/index.ts`. `GameState.updateFromServerMessage` overlaps with the message handling in `game/index.ts`, but the entry point bypasses it for richer effects/sound behavior. Either remove the unused method or make message application a single explicit path.
- Keep side effects such as sounds, hit flashes, death times, and cactus effects easy to follow from the message handlers.
- Make sure local prediction state (`localArmAngle`, `localFacing`, bullet trails, previous health/bounces) remains explicit and strongly typed.

## Sprint 27
- Sprint goal: split rendering into smaller client modules.
- Break up `src/client/game/render.ts` after the server cleanup. At 530 lines it is still manageable, but it mixes camera control, viewport culling, world drawing, HUD, minimap, and disconnected state. Candidate modules: `camera.ts`, `world-renderer.ts`, `hud-renderer.ts`, and `minimap-renderer.ts`.
- Keep the public renderer API small and explicit.
- Preserve canvas behavior on desktop and mobile, including camera dead zone, minimap, HUD, and disconnected screen.

## Sprint 28
- Sprint goal: tidy DOM rendering and UI construction.
- Prefer DOM-building helpers over HTML string rendering in `src/client/lobby.ts`, `src/client/diagnostics.ts`, and parts of `src/client/game/touch-controls.ts`. Current template strings rely on manual escaping and `dataset.id!`; explicit elements/events would be safer and easier to refactor.
- Remove non-null assertions like `dataset.id!` where small typed helpers would make intent clearer.
- Keep user-visible behavior the same while improving static navigability.

## Backlog 
- Show the ammo under the character.
- Do we need a router for our server or is it more performant without one?
- When you get low energy (<20%) you should start to move more slowly and the speed should decrease as you loose more energy. But even if you have 0% you should still be able to move very slowly.
- Integrate chatGPT API to do experiments.
- Make the diagnostics graphs bigger and have lines and numbers on the y axis.   


## Boring Bugs
- Performance bug: Stale game_over timeout may fire after a room resets.
  - Store pending game_over timeout ids per room.
  - Cancel them when a room becomes empty or restarts.
  - Verify new players cannot receive an old winner message.

- Bug. When you have added the Progressive Web App to the home screen and you are playing a game. 
If the phone goes to sleep/energy saving mode ( black screen ) and you wakes up again, then  the server connection is not restored and the player can not move. only move the arm will move
- When all players are dead everyone should return to the lobby. (If a sole player shoot him or her self)
- Gun should also be part of collision geometry. Mussel should not poke through rock/cacti.
- In game. For some reason the sound for the first shot is lagging way more than the following shots

## Ideas / Maybes  
- Have a random Tank that passes through the arena and shoots like a crazy person 
- Health pills that can be found that restore player health
- Steroids pills that can be found that give more energy for a period of time.
- Make it easier to change the name of your character

- Switch to a sprite for the player character
- Make it possible to draw your own character. Allow upload of an image of a child's drawing, send the drawing to chatGPT and ask it to make a sprite sheet from it.
    post process the sprites to make sure it is transparent and the right size. Then use that sprite for the character.
    Created sprites should be saved for reuse.
- Make it possible to type messages to other players while playing. text should appear in small cartoon like bubbles above the character.
- Option to not shoot bullets but instead shoot hearts that heal those hit.  

- First sound is always a bit lagging. Can we fix that? Sound we have a short game intro melody?
- Cacti should have one or two arms and variation in height
- Use real sounds for effects 
- Make overlay where user can read about the controls of the game.
- Should we have a walking sound?
- When new players join character should be placed as far away for the other players as possible but 30px from the edge 
- Add some testing with playwright and a few canvas smoke tests.

# TODO

## Sprint 9 — TypeScript: Shared Protocol Types
- Import and use types from `server/protocol.ts` in client files (currently none are imported)
- Type the parsed WebSocket messages in `game/network.ts` and `lobby.ts` against `ServerMessage` / `ClientMessage`
- Type the message handlers in `game/index.ts` (`handleGameJoined`, `handleArena`, etc.)
- Remove any type definitions in client files that duplicate what `server/protocol.ts` already defines

## Sprint 10 — TypeScript: Type Annotations
- Add parameter and return types to all functions in `game/state.ts`
- Add parameter and return types to all functions in `game/network.ts`
- Add parameter and return types to all functions in `game/render.ts` (drawRock, drawPlayer, drawBullet, etc.)
- Add parameter and return types to all functions in `game/input.ts`
- Add parameter and return types to utility functions in `game/utils.ts` and `sounds.ts`
- Add types to `lobby.ts` (`renderGames`, `joinGame`, `escHtml`)

## Sprint 11 — TypeScript: Enable Strict Mode
- Set `"strict": true` in `client/tsconfig.json`
- Fix all `noImplicitAny` errors surfaced across client files
- Fix `strictNullChecks` issues (nullable values like `gameState.myId`)
- Verify clean build with `deno task client:clean && deno task build:client` and `deno task typecheck:client`


## Backlog
- Dead players should not be able to shoot.
- The number of people in the lobby does not get updated when new people arrive
- Should we have a walking sound?
- When a game is finished inside a room. The room should be regenerated. 
- When new players join the should be placed as far away for the other players as possible but 30px from the edge  
- Gun should also be part of collision geometry. Mussel should not poke through rock/cacti.
- Bullet to rock collision detection is not always reliable.
- Cacti should have one or two arms and variation in height
- Rocks should be larger
- Players should not be able to move through other players (collision detection)


## Ideas / Maybes
- Migrate client build from `tsc` to Vite for faster dev builds, HMR, and better bundling
- Lobby shows game type icons
- The game canvas should fill the users display, There should be nothing above or beneath the canvas
- the game should be a 2D world-space game where the player stays centered and the camera moves across the map.
- Implement a 2D camera system with a central dead zone.
- support phone play with A virtual D-pad (4 arrows) in the bottom-left and a fire button bottom-right would cover 90% of gameplay. Arm angle could be a swipe/drag on the right side. It's doable but would be a meaningful sprint on its own.
- Use real artwork for character animation. vector or sprites
- Use real sounds for effects 



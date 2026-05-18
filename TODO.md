# TODO

## Sprint 32
- Sprint goal: Mount the canvas game from a React Router game route
- Build a `GameRoute` that reads `gameId` from React Router params.
- Validate required route/session data before creating the game session.
- Mount the canvas with a React ref and pass it into `createGameSession(...)`.
- Start the game session in a React effect and dispose it on route exit.
- Keep the canvas full screen and preserve current desktop/mobile viewport behavior.
- Replace game-page redirects with React Router navigation.
- Add a route-level "Back to lobby" action that calls `leaveGame()` before navigating.
- Verify that entering and leaving games repeatedly does not leak WebSockets or input handlers.
- Verify that direct navigation to `/game/:gameId` behaves predictably.

## Sprint 33
- Sprint goal: Move low-frequency game UI from manual DOM/canvas coupling into React
- Define typed UI events emitted by the game session, for example:
  - connection status changed
  - player count changed
  - local player HUD changed
  - game over
  - disconnected
- Move the mute button out of `input.ts` and into React.
- Move the player count display into React.
- Move the game-over winner overlay and countdown into React.
- Keep world rendering, camera movement, bullets, players, rocks, cacti, effects, and minimap in canvas.
- Decide whether ammo and kills remain in canvas short term or move to React HUD.
- Throttle or de-duplicate UI events so React updates only when displayed values change.
- Avoid putting `players`, `bullets`, camera position, or per-frame data in React state.

## Sprint 34
- Sprint goal: Convert diagnostics and remove old multi-page app artifacts
- Convert diagnostics to a React Router route.
- Make diagnostics use typed hooks/components instead of standalone page scripts.
- Remove migrated HTML entry files once their routes are fully replaced.
- Remove old direct DOM client entry scripts that are no longer used.
- Update Vite config to reflect the final single-entry SPA structure.
- Update Deno tasks if needed so build, dev, check, and deploy still work with the SPA.
- Verify production build output is not committed.
- Verify Deno Deploy serves all SPA routes correctly.

## Sprint 35
- Sprint goal: Strengthen architecture, tests, and refactoring safety after the SPA migration
- Add focused tests for typed route helpers and session storage helpers.
- Add tests or smoke checks for game session lifecycle cleanup.
- Add browser smoke tests for:
  - landing to lobby
  - lobby to game
  - game back to lobby
  - direct route refresh
- Add a canvas smoke test that verifies the game canvas renders non-empty pixels.
- Run TypeScript checks across client, shared, and server code.
- Run lint and formatting checks.
- Review imports/exports to make sure symbols remain easy to find, rename, and navigate in the IDE.
- Remove obsolete TODO items related to moving to a true SPA once the migration is complete.


## Backlog 
- Show the ammo under the character.

- When you get low energy (<20%) you should start to move more slowly and the speed should decrease as you loose more energy. But even if you have 0% you should still be able to move very slowly.
- Integrate chatGPT API to do experiments.

- Switch to a sprite for the player character
- Move to a true SPA like React

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

- Make the diagnostics graphs bigger and have lines and numbers on the x and y axis.   

- Do we need a router for our server or is it more performant without one?

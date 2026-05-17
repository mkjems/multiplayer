# TODO

## Sprint 21
- Performance issue: Add rolling graphs to the diagnostics dashboard.
  - Store diagnostics history locally in the browser tab; no extra server persistence needed.
  - Keep a bounded one-hour rolling window by default, around 1800 samples at a 2 second polling interval.
  - Plot small per-room graphs for average tick time, game_state payload size, socket buffered bytes, skipped snapshots, player count, and bullet count.
  - Keep the current dashboard cards for current values and use graphs to show trends over time.

- Performance issue: Add client viewport culling for rendering.
  - Draw only rocks, cacti, bullets, and players that intersect the visible camera area.
  - Keep minimap rendering independent from viewport culling.
  - Measure canvas render time before and after.

- Performance spike: Cache static arena rendering.
  - Investigate rendering rocks and static cactus bases to an offscreen canvas or cached layer.
  - Redraw the cached layer each frame with camera offset instead of rebuilding all paths.
  - Confirm this helps on mobile before committing to the approach.

- Performance issue: Optimize bullet bookkeeping on the client.
  - Replace repeated msg.bullets.some(...) cleanup scans with a Set of live bullet ids.
  - Keep bullet trail and bounce tracking cleanup linear in bullet count.

## Sprint 22
- Performance spike: Design a smaller network protocol.
  - Define the smallest recurring game_state payload needed for responsive play.
  - Separate static arena data, frequently changing state, and one-off events.
  - Consider sequence numbers/server timestamps for interpolation and debugging.

- Performance issue: Split game_state into snapshots and events.
  - Keep players and bullets in recurring snapshots.
  - Move cactus hits, player joins/leaves, deaths, reload events, and game_over into event messages where practical.
  - Preserve strongly typed protocol unions in src/shared/protocol.ts.

- Performance spike: Investigate client interpolation.
  - Test whether lower-frequency server snapshots still feel good with interpolation.
  - Decide whether local player prediction is needed or whether remote interpolation is enough.
  - Document tradeoffs before implementation.

## Backlog 
- Plot the diagnostics data as graphs.   
- Do we need a router for our server or is it more performant without one?
- Show the ammo under the character.
- When you get low energy (<20%) you should start to move more slowly and the speed should decrease as you loose more energy. But even if you have 0% you should still be able to move very slowly.
- Integrate chatGPT to do experiments.


## Bugs
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
- Use real artwork for character animation. vector or sprites
- Use real sounds for effects 
- Make overlay where user can read about the controls of the game.
- Should we have a walking sound?
- When new players join character should be placed as far away for the other players as possible but 30px from the edge 


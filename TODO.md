# TODO

## Sprint 13 — World Expansion + Camera System with Dead Zone
- Expand the world: increase ARENA_W / ARENA_H in server/game.ts (e.g. 3000×2000), adjust spawn margin and object placement, broadcast world dimensions to clients
- Add camera state to the client: cameraX, cameraY, and dead-zone size constants (e.g. 40% of viewport per axis)
- Implement dead-zone camera logic: move camera only when the local player exits the centered dead-zone rectangle; clamp camera so it never reveals outside the world
- Apply camera transform to all draw calls: wrap world-space drawing in ctx.save() / ctx.translate(-cameraX, -cameraY) / ctx.restore(); draw HUD outside this transform
- Verify screen-shake effect still works: ensure the shake translate is applied inside the camera transform, not outside it

## Sprint 14

## Backlog
- Dead players should not be able to shoot.
- The number of people in the lobby does not get updated when new people arrive
- When a game is finished inside a room. The room should be regenerated. 
- When new players join the should be placed as far away for the other players as possible but 30px from the edge  
- Gun should also be part of collision geometry. Mussel should not poke through rock/cacti.
- Bullet to rock collision detection is not always reliable. Bullets sometimes fly through Rocks 
- Cacti should have one or two arms and variation in height
- Rocks should be larger
- Players should not be able to move through other players (collision detection)


## Ideas / Maybes
- Migrate client build from `tsc` to Vite for faster dev builds, HMR, and better bundling
- Lobby shows game type icons
- support phone play with A virtual D-pad (4 arrows) in the bottom-left and a fire button bottom-right would cover 90% of gameplay. Arm angle could be a swipe/drag on the right side. It's doable but would be a meaningful sprint on its own.
- Use real artwork for character animation. vector or sprites
- Use real sounds for effects 
- Make overlay where user can read about the controls of the game.
- Should we have a walking sound?



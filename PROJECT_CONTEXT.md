# Coding Standards

- No hardcoded colors or magic values — use descriptively named variables
- No abbreviations in variable names
- booleans should start with 'is' or in rare cases 'has', and should not contain a negation.
- TypeScript for all client and server code; all functions must be typed
- Scripts in HTML files belong in separate files
- Deno tasks must cover all steps needed to develop and run the project
- Do not touch TODO.md unless the human asks
- Use camelCase for JS variable names.
- Use kebab case for css classes
- Use camelCase for new filenames. Its ok to leave old kebab-case file names for now. 

# Architecture

- **Server**: Deno + TypeScript, entry point `src/server/main.ts`
- **Client**: React 19 + React Router + Vite, entry point `src/client/app/main.tsx`
- **Shared contracts**: Typed protocol and diagnostics models in `src/shared/`
- **Deployment**: Deno Deploy
- **Build output**: Vite builds to `public/`; do not commit generated build output

The server is authoritative for rooms, arena state, simulation, collisions, bullets, health, energy, reloads, kills, and win detection. Rooms tick only while occupied and broadcast authoritative `game_state` snapshots at 20 Hz.

The client is a SPA with routes for landing, lobby, game, diagnostics, and not-found. React owns page UI and low-frequency overlays. The canvas game is mounted from the React game route through the typed `GameSession` facade, which coordinates network, input, sounds, effects, mutable render state, and the renderer without exposing those internals to React.

Rendering is split by responsibility: `render.ts` owns the animation loop, camera, and canvas lifecycle; `world-renderer.ts`, `minimap-renderer.ts`, and `screen-effects-renderer.ts` draw focused parts of the frame. Clients animate at 60 Hz and send player intent; gameplay state is confirmed by server messages.

Server game code is split into explicit modules: `room.ts` manages room lifecycle, `arena.ts` creates static arena data and spawns, `simulation.ts` runs the tick, `collision.ts` handles geometry, `broadcast.ts` sends snapshots and records metrics, and `player.ts` owns player construction/snapshots.

Diagnostics are first-class: `/api/diagnostics/rooms` exposes typed room, tick, and network metrics; `/diagnostics` renders the React diagnostics dashboard.

Keep architecture explicit, strongly typed, modular, and easy to navigate with IDE refactoring tools. Prefer direct imports, named exports, and narrow typed APIs over dynamic wiring.

# Protocol Model

- Shared client/server message types live in `src/shared/protocol.ts`
- Runtime message parsing/validation lives in `src/shared/protocol-guards.ts`
- Keep protocol types explicit, strongly typed, and easy to navigate with IDE refactoring tools
- `arena` messages are for initial/static room data, such as rocks, cactus positions, cactus segments, and arena config
- `player_joined` / `player_left` messages carry low-frequency player identity changes
- `game_state` messages are for frequently changing state, such as players and bullets
- Prefer event or delta messages for one-off changes, such as cactus damage, game over, and join/leave events
- Avoid repeatedly sending static geometry or unchanged object state in every game tick
- The server remains authoritative; clients may render and animate locally, but gameplay state should be confirmed by server messages

# Game Overview

Pixel art retro cowboy shooting game. Players join rooms via a lobby and fight in a larger-than-viewport 2D arena with rocks and destructible cacti.

**Main routes:** Landing (enter name) → Lobby (choose room) → Game. Diagnostics is a developer route.

**World & camera:** The arena is larger than the viewport. The camera uses a central dead zone — the player moves freely within a centered rectangle without scrolling; the camera only moves when the player reaches the rectangle's edge.

**Controls:** Keyboard uses arrow keys to move, A/Z to aim arm (±60° from horizontal), X to fire, R to reload. Touch controls exist for mobile.

**Players:** Represented as a colored dot with name below. The arm is a line extending left or right (never up/down) — direction follows last horizontal movement. Bullets originate from the muzzle.

**Bullets:** 6 per player. Ricochet off rocks. Remove one cactus segment on hit. Reload takes 2 seconds.

**Health and energy:** Health starts at 100%. Hits reduce health. Energy is spent by movement and regenerates while idle. Dead players cannot move or shoot.

**Win condition:** When one player remains alive (with at least one dead), the game ends. After a winner celebration, all players return to the lobby.

**Spawn:** Players start in an empty area (no rocks, cacti, or opponents nearby).

**Collision:** Players cannot move through rocks, cacti, or other players.

# Platform

- Desktop: keyboard controls
- Mobile: virtual joystick and touch actions
- Canvas fills the full screen; all UI overlays the canvas


# User reception

So far the users who have tried this game have been moderately positive. Especially among the very young, playing with their parents.
Most people still find the game unappealing and un-engaging. 
The introduction of energy changes the dynamics of the game to the better.
I think we need to lift the visuals of the game to another level.

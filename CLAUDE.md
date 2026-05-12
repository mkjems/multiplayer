# Coding Standards

- No hardcoded colors or magic values — use descriptively named variables
- No abbreviations in variable names
- TypeScript for all client and server code; all functions must be typed
- Scripts in HTML files belong in separate files
- Deno tasks must cover all steps needed to develop and run the project
- Do not touch TODO.md unless the human asks

# Architecture

- **Server**: Deno + TypeScript, entry point `server/main.ts`, source in `server/`
- **Client**: TypeScript compiled with `tsc` from `client/` to `public/`
- **Deployment**: Deno Deploy
- Server holds source of truth for all games, broadcasts at 20 Hz
- Clients run their own animations at 60 Hz

# Game Overview

Pixel art retro cowboy shooting game. Players join rooms via a lobby and fight in a 2D arena with rocks and cacti.

**3 pages:** Landing (enter name) → Lobby (choose room) → Game

**World & camera:** The arena is larger than the viewport. The camera uses a central dead zone — the player moves freely within a centered rectangle without scrolling; the camera only moves when the player reaches the rectangle's edge.

**Controls (keyboard):** Arrow keys to move, A/Z to aim arm (±60° from horizontal), X to fire, R to reload.

**Players:** Represented as a colored dot with name below. The arm is a line extending left or right (never up/down) — direction follows last horizontal movement. Bullets originate from the muzzle.

**Bullets:** 6 per player. Ricochets off rocks. Removes a piece of cactus on hit. Reload takes 2 seconds (press R).

**Health:** Starts at 100%. Hits reduce health. At 0% the player dies — dot fades to grey, smaller size, dramatic sound. Dead players cannot move or shoot.

**Win condition:** When one player remains alive (with at least one dead), the game ends. After a winner celebration, all players return to the lobby.

**Spawn:** Players start in an empty area (no rocks, cacti, or opponents nearby).

**Collision:** Players cannot move through rocks, cacti, or other players.

# Platform

- Desktop: keyboard controls
- Mobile: virtual joystick (future sprint)
- Canvas fills the full screen; all UI overlays the canvas

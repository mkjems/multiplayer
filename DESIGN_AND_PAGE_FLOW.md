# Design and page flow

This is intended as input for Google Stitch or another visual design tool. The goal is to redesign the web UI around the existing game flow while preserving the current React route structure and the game mechanics described above.

The visual direction should support a retro pixel-art cowboy arena game that is welcoming to kids and parents, but still clear and usable for adults. The app should feel more playful, tactile, and game-like than a generic SaaS dashboard. Avoid a plain dark card UI as the final direction. Use the western arcade theme, the larger arena, cactus/rock scenery, bullets, player dots, health, energy, and lobby rooms as visual inspiration. UI should be fun and retro with bold, chunky design elements 

## Primary user flow

1. Landing page: choose a player name.
2. Lobby page: review controls and choose a game room.
3. Game page: play in a full-screen canvas arena.
4. Game over state: winner is shown, then players return to the lobby.

The flow should be fast and low-friction. A returning player may already have a stored name, so the landing page should allow them to continue quickly. If a player reaches the lobby or game without a stored name, the app redirects them back to the landing page.

## Landing page

**Route:** `/`

**Role:** First impression and player identity setup. The page should make the game feel inviting before the player enters the lobby.

**Current content:**

- App title: `Multiplayer`
- Subtitle: `Pick a name and jump into a game`
- Optional home-screen install suggestion on supported mobile devices
- Label: `Your name`
- Text input for the player name
- Primary action: `Enter Lobby`

**Design needs:**

- Center the name entry experience clearly on the page.
- Make the player name input and primary action feel large enough for children and touch devices.
- Show a huge parallax background with a desert wild west theme with clouds in the background , mountains an cacti in a playful  exaggerated pixel art   
- The page should communicate the cowboy arcade theme immediately, ideally with game-world visual elements rather than abstract decoration.
- The home-screen suggestion should be secondary and dismissible, not competing with the name entry action.
- The disabled state for `Enter Lobby` should be obvious when the input is empty or submission is in progress.

## Lobby page

**Route:** `/lobby`

**Role:** Waiting area and room selection. Players choose where to play and can see whether the lobby connection is live.

**Current content:**

- Header with app title: `Multiplayer`
- Live status badge: `LIVE`
- Lobby count, for example `2 in lobby`
- Current player identity, for example `Playing as Martin`
- Section title: `Choose a game`
- Desktop keyboard controls:
  - Move: arrow keys
  - Aim arm: `A` and `Z`
  - Fire: `X`
  - Reload: `R`
- List of game room cards
- Each game card includes:
  - Room name, for example `Dot Arena` or `Speed Race`
  - Room status: `Waiting for players`, `In progress`, or `Full`
  - Player count, for example `3 / 8`
- Empty and connection states:
  - `Connecting to lobby...`
  - `Lost connection to lobby. Refresh to reconnect.`
  - `No games available.`

**Design needs:**

- Room cards should be easy to scan and clearly clickable when joinable.
- Full rooms should look unavailable without disappearing.
- The keyboard controls should help first-time desktop players without dominating the page.
- Touch devices do not show the keyboard control panel, so the lobby must still feel complete without it.
- The lobby should feel like a staging area before a match, not a generic list page.

## Game page

**Route:** `/game/:gameId`

**Role:** Full-screen gameplay surface. The canvas is the main experience; React UI is only for overlays, navigation, and low-frequency status.

**Current content:**

- Full-screen canvas for the arena
- Top navigation overlay:
  - Current player count, for example `4 players`
  - Sound toggle button
  - `Back to lobby` button
- HUD overlay:
  - Connection state, including `Disconnected`
  - Ammo display with six bullet indicators
  - Reloading state: `Reloading`
  - Kill count
  - Joining state: `Joining`
- Game-over overlay:
  - Winner message, for example `Alex wins!`
  - Return countdown, for example `Returning to lobby in 3s...`

**Design needs:**

- The canvas must remain visually dominant and fill the screen.
- Overlays should be legible over a moving game background without covering important gameplay.
- HUD controls should be compact, glanceable, and touch-friendly.
- The ammo, reload, health, energy, and kill concepts can be more visual than text-heavy.
- The game-over state should feel celebratory and clear, while still explaining that the app will return to the lobby.
- Mobile must support touch controls over the canvas, so any page chrome should avoid the lower control areas.

## Diagnostics page

**Route:** `/diagnostics`

**Role:** Developer-only operational dashboard for room and server performance.

**Current content:**

- Eyebrow: `Developer diagnostics`
- Page title: `Room Performance`
- Connection status pill: `Connecting`, `Live`, or `Offline`
- Last updated timestamp
- Summary metrics for all rooms
- Rooms section with server sample timestamp
- Room cards with metrics and history graphs
- Empty and offline states:
  - `Loading diagnostics...`
  - `Diagnostics endpoint unavailable.`
  - `Waiting for server data`

**Design needs:**

- This page can be more utilitarian than the player-facing pages.
- It should still share enough visual language with the game to feel like part of the same product.
- Prioritize readability, dense metrics, clear status colors, and quick scanning over decorative detail.
- Offline and stale-data states should be visually distinct.

## Not found page

**Route:** any unknown route

**Role:** Simple recovery page when a route is not part of the app.

**Current content:**

- Title: `Not found`
- Message: `That route is not part of the app.`
- Link: `Back to landing`

**Design needs:**

- Keep it simple and friendly.
- Provide a clear route back into the game flow.
- It can reuse the landing page visual direction at a smaller scale.


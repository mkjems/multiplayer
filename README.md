# Multiplayer

A real-time multiplayer game foundation built with **Deno** and **WebSocket**. Designed as an exploration platform — easy to hack on and extend with new game ideas.

![Deno](https://img.shields.io/badge/Deno-2.x-black?logo=deno) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript) ![WebSocket](https://img.shields.io/badge/Transport-WebSocket-green)

---

## Getting started

**Prerequisites:** [Deno](https://deno.land/) installed.

```bash
git clone https://github.com/mkjems/repository.git
cd repository
deno task dev
```

Open [http://localhost:8000](http://localhost:8000) in your browser (try two tabs to see multiplayer in action).

| Task | Command |
|------|---------|
| Development (watch mode) | `deno task dev` |
| Production | `deno task start` |

---

## Project structure

```
├── server.ts           # HTTP server + WebSocket upgrade handler
├── deno.json           # Deno config and tasks
├── src/
│   ├── protocol.ts     # TypeScript message types (client ↔ server)
│   ├── player.ts       # Player model and color assignment
│   └── game.ts         # Game rooms, authoritative state, tick loop
└── public/
    ├── index.html      # Landing page — enter your name
    ├── lobby.html      # Game selection — live player counts
    └── game.html       # Canvas game client (WASD / arrow keys)
```

---

## How it works

1. **Landing page** — player enters a name, stored in `sessionStorage`
2. **Lobby** — connects to `/ws/lobby`, receives live `lobby_state` updates every 2 seconds showing available rooms and player counts
3. **Game** — connects to `/ws/game/:roomId`, sends `join_game`, then streams `move` inputs; server ticks at 20 Hz and broadcasts authoritative `game_state` to all players in the room

The server is the single source of truth. Clients send intent (direction), the server moves players and pushes state to everyone.

```
Client                        Server
  │── join_game ─────────────▶ │  assign ID, add to room
  │◀─ game_joined ─────────── │
  │── move {dx, dy} ─────────▶ │  queue input
  │                   [tick]   │  apply inputs, update positions
  │◀─ game_state [players] ── │  broadcast to all in room
```

---

## Adding a new game

1. Register a room in `server.ts`:
   ```ts
   createRoom("myGame", "My Game", 6);
   ```
2. The room appears in the lobby automatically.
3. Customise game logic in `src/game.ts` — `tick()` is where physics/rules live.
4. Update `public/game.html` to render your game-specific state.


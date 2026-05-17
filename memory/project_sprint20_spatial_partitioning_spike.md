# Sprint 20 Spatial Partitioning Spike

## Question

Should the server replace all-object collision scans with a spatial partition?

## Current Hot Paths

- Player movement checks every alive player against every rock and cactus every
  tick.
- Bullet movement checks every bullet against every rock, every cactus segment,
  and every player every tick.
- The current object counts are small enough for simple loops, but the cost
  grows with each new room, player, bullet, and arena object.

## Recommended Approach

Use a simple uniform grid before considering a quadtree.

The arena has fixed dimensions and mostly fixed-size objects, so a uniform grid
keeps the implementation explicit and easy for TypeScript/IDE navigation. It
also fits the project's preference for static discoverability better than a
generic spatial-index abstraction.

Suggested cell size: around 160 px.

Why 160 px:

- The largest rocks have a radius around 95 px.
- Players have a radius of 16 px.
- Bullets move 22 px per tick.
- A 160 px cell keeps nearby candidates small while avoiding too many cross-cell
  inserts.

## Candidate Design

- Add a small server module, for example `src/server/spatial-grid.ts`.
- Export explicit types such as `SpatialGrid<T>`, `GridBounds`, and
  `GridItem<T>`.
- Build static grids for rocks and cacti when the arena is generated.
- Query nearby rocks/cacti for player collision and bullet sweep checks.
- For players and bullets, either build a lightweight dynamic grid each tick or
  keep direct loops until player counts justify more complexity.

## Expected First Implementation

Start with static arena objects only:

- `findSafeSpawnPosition` queries nearby rocks/cacti.
- `resolvePlayerRockCollision` and `resolvePlayerCactusCollision` receive nearby
  candidates.
- `sweepBulletRock` and `sweepBulletCacti` receive nearby candidates along the
  bullet path.

This should reduce the biggest fixed cost without changing gameplay rules.

## Risks

- Bullet sweep queries must include every cell touched by the bullet segment,
  not just the bullet's final position.
- Rocks need insertion by bounding box, not only by center point.
- Cacti should be inserted using their full segment stack bounds.
- The implementation should avoid `any` and callback-heavy generic wiring that
  makes symbol navigation worse.

## Decision

Proceed with a uniform grid in a later sprint if metrics show collision checks
are meaningful. Do not introduce a quadtree yet.

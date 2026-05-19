# Sprint 36 Visual Strategy

## Sprint Goal

Make a practical plan for lifting the game's visual appeal with a pixel western art direction, tiled arena background, sprite-based characters, and a stronger landing-page first impression.

## Current Baseline

- The game world is `2000 x 1500` on the server.
- Players use a `PLAYER_RADIUS` of `16` for collision and are currently drawn as a `14px` circle.
- The weapon arm is a procedural line with `ARM_LENGTH` of `20` and an aim range of `+/- 60deg`.
- The renderer already uses canvas scaling for `devicePixelRatio`, but art assets need explicit pixel-art handling to stay crisp.

## Recommended Direction

Use a readable, chunky pixel-art scale where the player sprite is the main visual unit:

- Background tile source size: `16 x 16`.
- Rendered tile size in world units: `32 x 32`.
- Character source size: `32 x 32`.
- Character rendered size in world units: `32 x 32`.
- Player collision radius remains `16`, matching a `32px` character footprint.
- Keep the arena at `2000 x 1500` for the first art pass.

This keeps the current gameplay scale intact while making the art visibly pixelated and easy to author. A `32px` rendered tile also divides the current arena cleanly enough for predictable repetition: about `63 x 47` tiles.

## Tile Plan

Start with a small tile atlas, not a giant hand-authored map.

- Base sand tile.
- Two or three sand variation tiles.
- Pebble/detail tile.
- Dry grass/detail tile.
- Border or darker edge tile, if the arena needs stronger boundaries.

Draw tiles procedurally from deterministic world coordinates. This avoids sending tile maps over the network and preserves the server/client protocol split. The tile selection can use a typed helper such as `getArenaTileVariant(tileX, tileY): ArenaTileVariant`, where `ArenaTileVariant` is a TypeScript union.

## Character Sprite Plan

Use a compact sprite sheet:

- Directions: `left`, `right`.
- States: `idle`, `walk`, `dead`.
- Walk frames: `4` frames per direction.
- Idle frames: `1` frame per direction.
- Dead frame: `1` frame, can be shared or mirrored.

Minimum useful sheet:

- `2` idle frames.
- `8` walk frames.
- `1-2` dead frames.
- Total: `11-12` frames.

Optional later states:

- Reload.
- Hit flash.
- Victory.

Do not animate vertical-facing character directions yet. The game currently uses horizontal facing as a core mechanic, and keeping the cowboy left/right preserves that readability.

## Arm And Aiming Strategy

Keep the arm/gun procedural for gameplay clarity.

A sprite sheet should not try to cover every arm angle. The current arm has many possible positions and is tied directly to aiming. Instead:

- Draw the body as a sprite.
- Draw the arm/gun as a separate procedural overlay.
- Pixel-snap the arm endpoints before drawing.
- Use a chunky pixel-art arm style: rectangular segments or a low-resolution offscreen canvas, not a smooth anti-aliased line.
- Keep the arm color linked to the player color or add a small player-color accent so players remain identifiable.

This gives the game sprite personality without losing precise aiming feedback.

## Arena Size Recommendation

Keep `2000 x 1500` through the first visual sprint.

Reasons:

- It already matches current gameplay, spawn logic, object density, and camera behavior.
- Changing arena size while changing art makes playtest feedback harder to interpret.
- A tile pass can make the existing arena feel richer without increasing travel time.

Revisit arena size only after the new visuals are playable. If the arena feels too sparse once tiles and sprites are added, adjust object density first, then arena size.

## Crisp Pixel Rendering Rules

Canvas:

- Set `ctx.imageSmoothingEnabled = false` before drawing pixel art.
- Keep canvas backing size matched to `devicePixelRatio`, as the renderer already does.
- Draw sprites at integer world coordinates after camera translation where possible.
- Prefer whole-number rendered sizes, such as `32`, `48`, or `64`.

CSS:

- Use `image-rendering: pixelated` for pixel-art images in React UI.
- Use pixel-friendly assets at integer scale factors.
- Avoid CSS transforms that place pixel art on fractional pixels.

Assets:

- Author source art at small native sizes, such as `16 x 16` tiles and `32 x 32` characters.
- Scale up in rendering, not in the source files.
- Use transparent PNG sprite sheets for characters and props.
- Keep asset metadata strongly typed in TypeScript modules rather than stringly typed lookup tables.

## Landing Page Direction

Replace the current simple centered card with a first-impression western scene:

- Full-screen pixel western mountain sunset background.
- Slow horizontal parallax layers.
- A chunky central name-entry popup.
- Keep the form workflow unchanged: name entry leads to lobby.

Suggested layer order:

- Sky gradient or sky image.
- Sun.
- Distant mountains.
- Closer mesas.
- Ground silhouettes.
- Foreground dust or sparse cactus silhouettes.

This can be built as CSS layers first, then replaced with generated or hand-authored pixel bitmap layers later.

## Implementation Sequence

1. Add typed asset modules and renderer constants.
2. Add background tile rendering behind rocks, cacti, bullets, and players.
3. Add pixel-art image loading with `imageSmoothingEnabled = false`.
4. Replace vector player body with sprite body while preserving procedural arm, bars, name, and effects.
5. Add simple walk animation derived from player movement.
6. Redesign landing page with parallax western background and chunky popup.
7. Playtest on desktop and mobile.

## TypeScript Navigation Rules

- Store sprite and tile metadata in typed modules.
- Use named exports for sprite sheet constants and frame definitions.
- Use union types for animation states and facing directions.
- Avoid dynamic asset names such as `${state}_${direction}_${frame}` as public APIs.
- Keep protocol changes unnecessary for this sprint unless the server must send new visual-only state.

## Sprint 36 Checklist

- [x] Decide background tile size: source `16 x 16`, rendered `32 x 32`.
- [x] Decide character sprite size: source `32 x 32`, rendered `32 x 32`.
- [x] Decide initial sprite positions: left/right idle, left/right walk, dead.
- [x] Decide arm solution: procedural pixel-style overlay on top of sprite body.
- [x] Decide initial arena size: keep `2000 x 1500`.
- [x] Define pixelated look approach: authored low-resolution assets scaled up.
- [x] Define crisp rendering approach: disable smoothing, integer coordinates, integer scale factors.
- [x] Define landing-page visual direction: pixel western sunset with parallax and central chunky popup.

## Next Sprint Candidate

Sprint 37 should be an implementation sprint: add the tile renderer and the first sprite-based player body while preserving the current gameplay and protocol.

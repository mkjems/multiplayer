# Sprint 21 Static Arena Cache Spike

## Question

Should the client cache static arena rendering in an offscreen canvas?

## Current Situation

Sprint 21 added viewport culling before drawing rocks, cacti, bullets, and
players. This is the best first step because it avoids drawing offscreen objects
without adding a second rendering path.

Rocks are static after the arena is sent. Cacti positions are static, but their
segments can be destroyed during play. That means a fully static arena layer
would either need to exclude cacti or be invalidated when cacti are damaged.

## Recommendation

Do not implement static arena caching yet. Measure after viewport culling first.

If rendering still shows up as a bottleneck, implement a conservative cache:

- Cache rocks only in an offscreen canvas.
- Keep cacti in the normal render path because their segment state changes.
- Rebuild the rock cache only when a new arena message arrives.
- Draw the cached rock layer with the camera offset before dynamic objects.

## Why Rocks First

- Rock geometry is path-heavy compared with cacti rectangles.
- Rocks do not change during a room.
- A rock-only cache avoids invalidation complexity.
- The implementation stays simple and easy to inspect.

## Risks

- A full-world offscreen canvas grows with arena size and device pixel ratio.
- Very large arenas may need tiled caching instead of one full canvas.
- Caching can make rendering bugs harder to reason about if it duplicates draw
  logic.

## Decision

Keep static caching as a follow-up optimization, not a Sprint 21 implementation.
Viewport culling should be measured first using the diagnostics dashboard and
manual play.

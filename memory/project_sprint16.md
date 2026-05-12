---
name: Sprint 16 complete
description: Mobile touch controls + PWA full-screen shipped and tested on real iPhone
type: project
---

Sprint 16 shipped and verified on iPhone Safari.

**What was built:**
- 360° analog joystick (bottom-left) — normalized vector drives `move {dx, dy}` messages; server physics already accepted fractional values so no server changes were needed
- Vertical arm-angle slider (bottom-right) — drag up/down maps to ±60°
- FIRE and RELOAD buttons (bottom-right)
- Rotate-to-landscape prompt — full-screen overlay auto-shown in portrait, auto-hidden in landscape
- PWA manifest (`display: standalone`, `orientation: landscape`) + apple meta tags on all 3 HTML pages — game now runs full-screen when added to Home Screen from Safari

**Why:** Server `applyInput(dx, dy)` already used `dx * MAX_SPEED` with acceleration physics, so analog joystick values like `{dx: 0.7, dy: -0.3}` worked without any server changes.

**How to apply:** When adding future mobile features, remember controls live in `client/game/touch-controls.ts` and styles in `public/touch-controls.css`. Touch detection gate is `navigator.maxTouchPoints > 0` in `client/game/index.ts`.
</content>
</invoke>
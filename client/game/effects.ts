// ═════════════════════════════════════════════════════════════════════════════
// Visual Effects
// ═════════════════════════════════════════════════════════════════════════════

import type * as ConstantsModule from "./constants.js";

export interface Effects {
  shakeUntil: number;
  vignetteUntil: number;
  trigger(): void;
  getShakeOffset(): { x: number; y: number };
  getVignetteAlpha(): number;
  reset(): void;
}

/**
 * Factory function to create visual effects manager.
 * Handles screen shake and vignette animations.
 */
export function createEffects(constants: typeof ConstantsModule): Effects {
  return {
    shakeUntil: 0,
    vignetteUntil: 0,

    // Trigger shake and vignette effects
    trigger(): void {
      const now = Date.now();
      this.shakeUntil = now + constants.SHAKE_DURATION;
      this.vignetteUntil = now + constants.VIGNETTE_DURATION;
    },

    // Get current frame shake offset
    getShakeOffset(): { x: number; y: number } {
      const now = Date.now();
      if (now >= this.shakeUntil) {
        return { x: 0, y: 0 };
      }
      const progress = (this.shakeUntil - now) / constants.SHAKE_DURATION;
      const magnitude = constants.SHAKE_MAGNITUDE * progress;
      return {
        x: (Math.random() * 2 - 1) * magnitude,
        y: (Math.random() * 2 - 1) * magnitude,
      };
    },

    // Get current vignette alpha
    getVignetteAlpha(): number {
      const now = Date.now();
      if (now >= this.vignetteUntil) {
        return 0;
      }
      const elapsed = now - (this.vignetteUntil - constants.VIGNETTE_DURATION);
      return (1 - elapsed / constants.VIGNETTE_DURATION) * 0.55;
    },

    // Reset effects state
    reset(): void {
      this.shakeUntil = 0;
      this.vignetteUntil = 0;
    },
  };
}

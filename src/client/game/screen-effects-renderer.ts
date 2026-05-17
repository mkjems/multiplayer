import type { Effects } from "./effects.ts";
import type * as ConstantsModule from "./constants.ts";
import type { ViewportSize } from "./render-types.ts";

export function drawVignette(
  ctx: CanvasRenderingContext2D,
  effects: Effects,
  constants: typeof ConstantsModule,
  viewport: ViewportSize,
): void {
  const alpha = effects.getVignetteAlpha();
  if (alpha <= 0) return;

  const gradient = ctx.createRadialGradient(
    viewport.width / 2,
    viewport.height / 2,
    viewport.height * 0.25,
    viewport.width / 2,
    viewport.height / 2,
    viewport.height * 0.85,
  );
  gradient.addColorStop(0, `rgba(${constants.COLOR_VIGNETTE},0)`);
  gradient.addColorStop(1, `rgba(${constants.COLOR_VIGNETTE},${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
}

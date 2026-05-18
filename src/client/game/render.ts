// ═════════════════════════════════════════════════════════════════════════════
// Rendering
// ═════════════════════════════════════════════════════════════════════════════

import type { GameState } from "./state.ts";
import type { Effects } from "./effects.ts";
import type * as ConstantsModule from "./constants.ts";
import { createCamera } from "./camera.ts";
import { drawWorld } from "./world-renderer.ts";
import { drawHud } from "./hud-renderer.ts";
import { drawMinimap } from "./minimap-renderer.ts";
import { drawVignette } from "./screen-effects-renderer.ts";
import type { InputProcessor, ViewportSize } from "./render-types.ts";

export interface Renderer {
  start(inputProcessor: InputProcessor): void;
  dispose(): void;
  drawDisconnected(): void;
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  gameState: GameState,
  effects: Effects,
  constants: typeof ConstantsModule,
): Renderer {
  const ctxOrNull = canvas.getContext("2d");
  if (!ctxOrNull) {
    throw new Error("Canvas 2D context is not available");
  }
  const ctx = ctxOrNull;
  const camera = createCamera(gameState, constants);
  let animationFrameId: number | null = null;
  let isDisposed = false;

  function getViewport(): ViewportSize {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  function renderFrame(inputProcessor: InputProcessor): void {
    if (isDisposed) return;

    inputProcessor.processInput();

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const viewport = getViewport();
    const cameraPosition = camera.update(viewport);

    ctx.save();
    const shake = effects.getShakeOffset();
    if (shake.x !== 0 || shake.y !== 0) {
      ctx.translate(shake.x, shake.y);
    }

    ctx.fillStyle = constants.COLOR_GROUND;
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    ctx.save();
    ctx.translate(-cameraPosition.x, -cameraPosition.y);
    drawWorld(ctx, gameState, constants, camera.getWorldViewport(viewport));
    ctx.restore();

    drawHud(ctx, gameState, constants);
    drawMinimap(ctx, gameState, constants, viewport);
    ctx.restore();

    drawVignette(ctx, effects, constants, viewport);

    animationFrameId = requestAnimationFrame(() => renderFrame(inputProcessor));
  }

  return {
    start(inputProcessor: InputProcessor): void {
      if (animationFrameId !== null) return;
      isDisposed = false;
      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = null;
        renderFrame(inputProcessor);
      });
    },

    dispose(): void {
      isDisposed = true;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    },

    drawDisconnected(): void {
      if (isDisposed) return;
      const viewport = getViewport();
      ctx.fillStyle = constants.COLOR_DISCONNECT_BG;
      ctx.fillRect(0, 0, viewport.width, viewport.height);
      ctx.fillStyle = constants.COLOR_DISCONNECT_TEXT;
      ctx.font = "16px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(
        "Disconnected — go back to lobby",
        viewport.width / 2,
        viewport.height / 2,
      );
    },
  };
}

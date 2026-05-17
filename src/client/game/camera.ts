import type { GameState } from "./state.ts";
import type * as ConstantsModule from "./constants.ts";
import type { Bounds, CameraPosition, ViewportSize } from "./render-types.ts";

export interface Camera {
  update(viewport: ViewportSize): CameraPosition;
  getWorldViewport(viewport: ViewportSize): Bounds;
}

export function createCamera(
  gameState: GameState,
  constants: typeof ConstantsModule,
): Camera {
  let cameraX = 0;
  let cameraY = 0;
  let cameraInitialized = false;

  function clampCamera(viewport: ViewportSize): void {
    const worldWidth = gameState.arenaConfig.arenaWidth;
    const worldHeight = gameState.arenaConfig.arenaHeight;
    cameraX = Math.max(0, Math.min(worldWidth - viewport.width, cameraX));
    cameraY = Math.max(0, Math.min(worldHeight - viewport.height, cameraY));
  }

  function centerOnLocalPlayer(viewport: ViewportSize): void {
    const localPlayer = gameState.getLocalPlayer();
    if (!localPlayer) return;

    cameraX = localPlayer.x - viewport.width / 2;
    cameraY = localPlayer.y - viewport.height / 2;
    clampCamera(viewport);
    cameraInitialized = true;
  }

  function followLocalPlayer(viewport: ViewportSize): void {
    const localPlayer = gameState.getLocalPlayer();
    if (!localPlayer || !localPlayer.alive) return;

    const deadZoneWidth = viewport.width * constants.CAMERA_DEAD_ZONE_FRACTION;
    const deadZoneHeight = viewport.height *
      constants.CAMERA_DEAD_ZONE_FRACTION;
    const deadZoneLeft = (viewport.width - deadZoneWidth) / 2;
    const deadZoneRight = deadZoneLeft + deadZoneWidth;
    const deadZoneTop = (viewport.height - deadZoneHeight) / 2;
    const deadZoneBottom = deadZoneTop + deadZoneHeight;

    const screenX = localPlayer.x - cameraX;
    const screenY = localPlayer.y - cameraY;

    if (screenX < deadZoneLeft) cameraX = localPlayer.x - deadZoneLeft;
    if (screenX > deadZoneRight) cameraX = localPlayer.x - deadZoneRight;
    if (screenY < deadZoneTop) cameraY = localPlayer.y - deadZoneTop;
    if (screenY > deadZoneBottom) cameraY = localPlayer.y - deadZoneBottom;

    clampCamera(viewport);
  }

  return {
    update(viewport: ViewportSize): CameraPosition {
      if (!cameraInitialized) {
        centerOnLocalPlayer(viewport);
      }

      followLocalPlayer(viewport);
      return { x: cameraX, y: cameraY };
    },

    getWorldViewport(viewport: ViewportSize): Bounds {
      return {
        left: cameraX,
        top: cameraY,
        right: cameraX + viewport.width,
        bottom: cameraY + viewport.height,
      };
    },
  };
}

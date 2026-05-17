import type { GameState } from "./state.ts";
import type * as ConstantsModule from "./constants.ts";
import type { ViewportSize } from "./render-types.ts";

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  gameState: GameState,
  constants: typeof ConstantsModule,
  viewport: ViewportSize,
): void {
  const worldWidth = gameState.arenaConfig.arenaWidth;
  const worldHeight = gameState.arenaConfig.arenaHeight;

  const isMobile = viewport.width < constants.MINIMAP_MOBILE_BREAKPOINT;
  const minimapWidth = isMobile
    ? constants.MINIMAP_WIDTH_MOBILE
    : constants.MINIMAP_WIDTH_DESKTOP;
  const minimapHeight = minimapWidth * (worldHeight / worldWidth);
  const minimapX = viewport.width - minimapWidth - constants.MINIMAP_MARGIN;
  const minimapY = constants.MINIMAP_NAVBAR_HEIGHT + constants.MINIMAP_MARGIN;
  const scaleX = minimapWidth / worldWidth;
  const scaleY = minimapHeight / worldHeight;

  ctx.save();

  ctx.globalAlpha = constants.MINIMAP_BACKGROUND_OPACITY;
  ctx.fillStyle = constants.COLOR_MINIMAP_BG;
  ctx.beginPath();
  ctx.roundRect(
    minimapX,
    minimapY,
    minimapWidth,
    minimapHeight,
    constants.MINIMAP_BORDER_RADIUS,
  );
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.strokeStyle = constants.COLOR_MINIMAP_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(
    minimapX,
    minimapY,
    minimapWidth,
    minimapHeight,
    constants.MINIMAP_BORDER_RADIUS,
  );
  ctx.stroke();

  for (const player of gameState.players) {
    const dotX = minimapX + player.x * scaleX;
    const dotY = minimapY + player.y * scaleY;
    const isLocalPlayer = player.id === gameState.myId;
    const radius = isLocalPlayer
      ? constants.MINIMAP_LOCAL_DOT_RADIUS
      : constants.MINIMAP_OTHER_DOT_RADIUS;

    if (isLocalPlayer) {
      ctx.fillStyle = constants.COLOR_MINIMAP_LOCAL_PLAYER;
    } else if (player.alive) {
      ctx.fillStyle = constants.COLOR_MINIMAP_OTHER_PLAYER_ALIVE;
    } else {
      ctx.fillStyle = constants.COLOR_MINIMAP_OTHER_PLAYER_DEAD;
    }

    ctx.beginPath();
    ctx.arc(dotX, dotY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

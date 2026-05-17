import type { GameState } from "./state.ts";
import type * as ConstantsModule from "./constants.ts";

export function drawHud(
  ctx: CanvasRenderingContext2D,
  gameState: GameState,
  constants: typeof ConstantsModule,
): void {
  const me = gameState.getLocalPlayer();
  if (!me || !me.alive) return;

  const size = 8;
  const gap = 4;
  const x = 14;
  const y = 24;
  const killsX = x + 6 * (size + gap) + 18;
  ctx.font = "bold 10px system-ui";
  ctx.textAlign = "left";

  if (me.reloading) {
    ctx.fillStyle = constants.COLOR_RELOAD_TEXT;
    ctx.fillText("RELOADING…", x, y + 8);
  } else {
    ctx.fillStyle = constants.COLOR_HUD_LABEL;
    ctx.fillText("AMMO", x, y - 2);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(
        x + i * (size + gap) + size / 2,
        y + size / 2,
        size / 2,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = i < me.ammo
        ? constants.COLOR_AMMO_FULL
        : constants.COLOR_AMMO_EMPTY;
      ctx.fill();
    }
  }

  ctx.textAlign = "left";
  ctx.fillStyle = constants.COLOR_HUD_LABEL;
  ctx.font = "bold 10px system-ui";
  ctx.fillText("KILLS", killsX, y - 2);
  ctx.fillStyle = me.kills > 0
    ? constants.COLOR_KILLS_ACTIVE
    : constants.COLOR_KILLS_ZERO;
  ctx.font = "bold 18px system-ui";
  ctx.fillText(String(me.kills), killsX, y + 10);
}

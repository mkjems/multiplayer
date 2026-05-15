// ═════════════════════════════════════════════════════════════════════════════
// Rendering
// ═════════════════════════════════════════════════════════════════════════════

import { lerpColor } from "./utils.ts";
import type {
  BulletSnapshot,
  CactusData,
  PlayerSnapshot,
  RockData,
} from "../../shared/protocol";
import type { GameState } from "./state";
import type { Effects } from "./effects";
import type * as ConstantsModule from "./constants";

interface InputProcessor {
  processInput(): void;
}

export interface Renderer {
  render(inputProcessor: InputProcessor): void;
  drawDisconnected(): void;
}

/**
 * Factory function to create renderer.
 *
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {object} gameState - Game state object
 * @param {object} effects - Effects manager
 * @param {object} constants - Game constants
 * @returns {object} Renderer with render() and drawDisconnected() methods
 */
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

  let cameraX = 0;
  let cameraY = 0;
  let cameraInitialized = false;

  // Draw a rock
  function drawRock(rock: RockData): void {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(rock.vertices[0].x, rock.vertices[0].y);
    for (let i = 1; i < rock.vertices.length; i++) {
      ctx.lineTo(rock.vertices[i].x, rock.vertices[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = constants.COLOR_ROCK_FILL;
    ctx.fill();
    ctx.strokeStyle = constants.COLOR_ROCK_STROKE;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  // Draw a cactus
  function drawCactus(cactus: CactusData): void {
    const {
      cactusHalfWidth,
      cactusSegmentStride,
      cactusSegmentWidth,
      cactusSegmentHeight,
    } = gameState.arenaConfig;
    for (let i = 0; i < cactus.segments.length; i++) {
      if (!cactus.segments[i]) continue;
      const sx = cactus.x - cactusHalfWidth;
      const sy = cactus.y + i * cactusSegmentStride;
      ctx.fillStyle = constants.COLOR_CACTUS_FILL;
      ctx.fillRect(sx, sy, cactusSegmentWidth, cactusSegmentHeight);
      ctx.strokeStyle = constants.COLOR_CACTUS_STROKE;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, cactusSegmentWidth, cactusSegmentHeight);
    }
  }

  // Draw a player
  function drawPlayer(p: PlayerSnapshot): void {
    if (!p.alive) {
      const deathTime = gameState.deathTimes.get(p.id) ?? Date.now();
      const t = Math.min(1, (Date.now() - deathTime) / 1500);
      const radius = 14 - t * 6;
      const color = lerpColor(p.color, constants.COLOR_PLAYER_DEAD, t);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.font = "bold 11px system-ui";
      ctx.textAlign = "center";
      ctx.globalAlpha = 0.4 + 0.6 * (1 - t * 0.5);
      ctx.fillStyle = constants.COLOR_PLAYER_DEAD_NAME;
      ctx.fillText(p.name, p.x, p.y + 20);
      ctx.globalAlpha = 1;
      return;
    }

    const isMe = p.id === gameState.myId;
    const angle = isMe ? gameState.localArmAngle : p.armAngle;
    const facing = isMe ? gameState.localFacing : p.facing;
    const dir = facing === "right" ? 1 : -1;
    const { armLength } = gameState.arenaConfig;

    if (isMe) {
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 14;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    if (isMe) ctx.restore();

    // Hit flash overlay
    const hitTime = gameState.hitTimes.get(p.id);
    if (hitTime) {
      const flashT = (Date.now() - hitTime) / constants.HIT_FLASH_DURATION;
      if (flashT < 1) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = constants.COLOR_HIT_FLASH;
        ctx.globalAlpha = (1 - flashT) * 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Arm
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(
      p.x + dir * armLength * Math.cos(angle),
      p.y - armLength * Math.sin(angle),
    );
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.stroke();

    // Health bar
    const barW = 36, barH = 4, bx = p.x - 18, by = p.y - 26;
    ctx.fillStyle = constants.COLOR_HEALTH_BG;
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = p.health > 60
      ? constants.COLOR_HEALTH_HIGH
      : p.health > 30
      ? constants.COLOR_HEALTH_MID
      : constants.COLOR_HEALTH_LOW;
    ctx.fillRect(bx, by, barW * (p.health / 100), barH);

    // Name + kills
    ctx.fillStyle = constants.COLOR_PLAYER_NAME;
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(p.name, p.x, p.y + 26);
    if (p.kills > 0) {
      ctx.fillStyle = constants.COLOR_PLAYER_KILLS;
      ctx.font = "9px system-ui";
      ctx.fillText(`★ ${p.kills}`, p.x, p.y + 37);
    }
  }

  // Draw bullet trail
  function drawBulletTrail(b: BulletSnapshot): void {
    const trail = gameState.bulletTrails.get(b.id);
    if (!trail || trail.length < 2) return;

    const segmentCount = trail.length - 1;
    for (let i = 0; i < segmentCount; i++) {
      const from = trail[i];
      const to = trail[i + 1];
      const progress = (i + 1) / segmentCount;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.lineCap = "round";
      ctx.lineWidth = 7 * progress;
      ctx.strokeStyle = `rgba(249, 202, 36, ${0.15 * progress})`;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.lineCap = "round";
      ctx.lineWidth = 2.5 * progress;
      ctx.strokeStyle = `rgba(240, 147, 43, ${0.7 * progress})`;
      ctx.stroke();
    }
  }

  // Draw a bullet
  function drawBullet(b: BulletSnapshot): void {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = constants.COLOR_BULLET_FILL;
    ctx.fill();
    ctx.strokeStyle = constants.COLOR_BULLET_STROKE;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw minimap
  function drawMinimap(): void {
    const worldWidth = gameState.arenaConfig.arenaWidth;
    const worldHeight = gameState.arenaConfig.arenaHeight;
    const viewportWidth = window.innerWidth;

    const isMobile = viewportWidth < constants.MINIMAP_MOBILE_BREAKPOINT;
    const minimapWidth = isMobile
      ? constants.MINIMAP_WIDTH_MOBILE
      : constants.MINIMAP_WIDTH_DESKTOP;
    const minimapHeight = minimapWidth * (worldHeight / worldWidth);
    const minimapX = viewportWidth - minimapWidth - constants.MINIMAP_MARGIN;
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

  // Draw HUD (ammo, kills)
  function drawHUD(): void {
    const me = gameState.getLocalPlayer();
    if (!me || !me.alive) return;

    const size = 8, gap = 4, px = 14, py = window.innerHeight - 20;
    ctx.font = "bold 10px system-ui";
    ctx.textAlign = "left";

    if (me.reloading) {
      ctx.fillStyle = constants.COLOR_RELOAD_TEXT;
      ctx.fillText("RELOADING…", px, py + 8);
    } else {
      ctx.fillStyle = constants.COLOR_HUD_LABEL;
      ctx.fillText("AMMO", px, py - 2);
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(
          px + i * (size + gap) + size / 2,
          py + size / 2,
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

    // Kill counter
    ctx.textAlign = "right";
    ctx.fillStyle = constants.COLOR_HUD_LABEL;
    ctx.font = "bold 10px system-ui";
    ctx.fillText("KILLS", window.innerWidth - 14, py - 2);
    ctx.fillStyle = me.kills > 0
      ? constants.COLOR_KILLS_ACTIVE
      : constants.COLOR_KILLS_ZERO;
    ctx.font = "bold 18px system-ui";
    ctx.fillText(String(me.kills), window.innerWidth - 14, py + 10);
  }

  // Draw vignette effect
  function drawVignette(): void {
    const alpha = effects.getVignetteAlpha();
    if (alpha <= 0) return;

    const gradient = ctx.createRadialGradient(
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight * 0.25,
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight * 0.85,
    );
    gradient.addColorStop(0, `rgba(${constants.COLOR_VIGNETTE},0)`);
    gradient.addColorStop(1, `rgba(${constants.COLOR_VIGNETTE},${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  return {
    render(inputProcessor: InputProcessor): void {
      inputProcessor.processInput();

      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const worldWidth = gameState.arenaConfig.arenaWidth;
      const worldHeight = gameState.arenaConfig.arenaHeight;

      // Initialize camera centered on local player on first appearance
      if (!cameraInitialized) {
        const localPlayer = gameState.getLocalPlayer();
        if (localPlayer) {
          cameraX = localPlayer.x - viewportWidth / 2;
          cameraY = localPlayer.y - viewportHeight / 2;
          cameraX = Math.max(0, Math.min(worldWidth - viewportWidth, cameraX));
          cameraY = Math.max(
            0,
            Math.min(worldHeight - viewportHeight, cameraY),
          );
          cameraInitialized = true;
        }
      }

      // Dead-zone camera: only scroll when the local player exits the centered rectangle
      const localPlayer = gameState.getLocalPlayer();
      if (localPlayer && localPlayer.alive) {
        const deadZoneWidth = viewportWidth *
          constants.CAMERA_DEAD_ZONE_FRACTION;
        const deadZoneHeight = viewportHeight *
          constants.CAMERA_DEAD_ZONE_FRACTION;
        const deadZoneLeft = (viewportWidth - deadZoneWidth) / 2;
        const deadZoneRight = deadZoneLeft + deadZoneWidth;
        const deadZoneTop = (viewportHeight - deadZoneHeight) / 2;
        const deadZoneBottom = deadZoneTop + deadZoneHeight;

        const screenX = localPlayer.x - cameraX;
        const screenY = localPlayer.y - cameraY;

        if (screenX < deadZoneLeft) cameraX = localPlayer.x - deadZoneLeft;
        if (screenX > deadZoneRight) cameraX = localPlayer.x - deadZoneRight;
        if (screenY < deadZoneTop) cameraY = localPlayer.y - deadZoneTop;
        if (screenY > deadZoneBottom) cameraY = localPlayer.y - deadZoneBottom;

        cameraX = Math.max(0, Math.min(worldWidth - viewportWidth, cameraX));
        cameraY = Math.max(0, Math.min(worldHeight - viewportHeight, cameraY));
      }

      // Screen shake is applied outside camera transform so the whole viewport shakes
      ctx.save();
      const shake = effects.getShakeOffset();
      if (shake.x !== 0 || shake.y !== 0) {
        ctx.translate(shake.x, shake.y);
      }

      ctx.fillStyle = constants.COLOR_GROUND;
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);

      // Camera transform: shift world coordinates to screen space
      ctx.save();
      ctx.translate(-cameraX, -cameraY);
      for (const rock of gameState.rocks) drawRock(rock);
      for (const cactus of gameState.cacti) drawCactus(cactus);
      for (const b of gameState.bullets) drawBulletTrail(b);
      for (const b of gameState.bullets) drawBullet(b);
      for (const p of gameState.players) drawPlayer(p);
      ctx.restore();

      drawHUD();
      drawMinimap();
      ctx.restore();

      drawVignette();

      requestAnimationFrame(() => this.render(inputProcessor));
    },

    drawDisconnected(): void {
      ctx.fillStyle = constants.COLOR_DISCONNECT_BG;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.fillStyle = constants.COLOR_DISCONNECT_TEXT;
      ctx.font = "16px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(
        "Disconnected — go back to lobby",
        window.innerWidth / 2,
        window.innerHeight / 2,
      );
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Rendering
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Factory function to create renderer.
 *
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {object} gameState - Game state object
 * @param {object} effects - Effects manager
 * @param {object} sounds - Sound manager
 * @param {object} constants - Game constants
 * @returns {object} Renderer with render() and drawDisconnected() methods
 */
export function createRenderer(canvas, gameState, effects, constants) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is not available");
  }

  // Helper: interpolate between two colors
  function lerpColor(c1, c2, t) {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r},${g},${b})`;
  }

  // Draw a rock
  function drawRock(rock) {
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
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Draw a cactus
  function drawCactus(cactus) {
    for (let i = 0; i < cactus.segments.length; i++) {
      if (!cactus.segments[i]) continue;
      const sx = cactus.x - constants.CACTUS_HALF_WIDTH;
      const sy = cactus.y + i * constants.CACTUS_SEGMENT_STRIDE;
      ctx.fillStyle = constants.COLOR_CACTUS_FILL;
      ctx.fillRect(sx, sy, constants.CACTUS_SEGMENT_WIDTH, constants.CACTUS_SEGMENT_HEIGHT);
      ctx.strokeStyle = constants.COLOR_CACTUS_STROKE;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, constants.CACTUS_SEGMENT_WIDTH, constants.CACTUS_SEGMENT_HEIGHT);
    }
  }

  // Draw a player
  function drawPlayer(p) {
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
      p.x + dir * constants.ARM_LENGTH * Math.cos(angle),
      p.y - constants.ARM_LENGTH * Math.sin(angle),
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
  function drawBulletTrail(b) {
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
  function drawBullet(b) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = constants.COLOR_BULLET_FILL;
    ctx.fill();
    ctx.strokeStyle = constants.COLOR_BULLET_STROKE;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw HUD (ammo, kills)
  function drawHUD() {
    const me = gameState.getLocalPlayer();
    if (!me || !me.alive) return;

    const size = 8, gap = 4, px = 14, py = canvas.height - 20;
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
        ctx.fillStyle = i < me.ammo ? constants.COLOR_AMMO_FULL : constants.COLOR_AMMO_EMPTY;
        ctx.fill();
      }
    }

    // Kill counter
    ctx.textAlign = "right";
    ctx.fillStyle = constants.COLOR_HUD_LABEL;
    ctx.font = "bold 10px system-ui";
    ctx.fillText("KILLS", canvas.width - 14, py - 2);
    ctx.fillStyle = me.kills > 0 ? constants.COLOR_KILLS_ACTIVE : constants.COLOR_KILLS_ZERO;
    ctx.font = "bold 18px system-ui";
    ctx.fillText(String(me.kills), canvas.width - 14, py + 10);
  }

  // Draw vignette effect
  function drawVignette() {
    const alpha = effects.getVignetteAlpha();
    if (alpha <= 0) return;

    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      canvas.height * 0.25,
      canvas.width / 2,
      canvas.height / 2,
      canvas.height * 0.85,
    );
    gradient.addColorStop(0, `rgba(${constants.COLOR_VIGNETTE},0)`);
    gradient.addColorStop(1, `rgba(${constants.COLOR_VIGNETTE},${alpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  return {
    render(inputProcessor) {
      inputProcessor.processInput();

      ctx.save();
      const shake = effects.getShakeOffset();
      if (shake.x !== 0 || shake.y !== 0) {
        ctx.translate(shake.x, shake.y);
      }

      ctx.fillStyle = constants.COLOR_GROUND;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const rock of gameState.rocks) drawRock(rock);
      for (const cactus of gameState.cacti) drawCactus(cactus);
      for (const b of gameState.bullets) drawBulletTrail(b);
      for (const b of gameState.bullets) drawBullet(b);
      for (const p of gameState.players) drawPlayer(p);

      drawHUD();
      ctx.restore();

      drawVignette();

      requestAnimationFrame(() => this.render(inputProcessor));
    },

    drawDisconnected() {
      ctx.fillStyle = constants.COLOR_DISCONNECT_BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = constants.COLOR_DISCONNECT_TEXT;
      ctx.font = "16px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(
        "Disconnected — go back to lobby",
        canvas.width / 2,
        canvas.height / 2,
      );
    },
  };
}

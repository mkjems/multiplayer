import { createSounds } from "./sounds.js";

// Color palette — canvas/JS colors (CSS equivalents live in game.html :root)
const COLOR_GROUND = "#232121";
const COLOR_ROCK_FILL = "#4a4a5a";
const COLOR_ROCK_STROKE = "#6a6a7a";
const COLOR_CACTUS_FILL = "#2d7a2d";
const COLOR_CACTUS_STROKE = "#1a5c1a";
const COLOR_HEALTH_BG = "#333";
const COLOR_HEALTH_HIGH = "#2ecc71";
const COLOR_HEALTH_MID = "#f39c12";
const COLOR_HEALTH_LOW = "#e74c3c";
const COLOR_BULLET_FILL = "#f9ca24";
const COLOR_BULLET_STROKE = "#f0932b";
const COLOR_AMMO_FULL = "#f9ca24";
const COLOR_AMMO_EMPTY = "#333";
const COLOR_HUD_LABEL = "#888";
const COLOR_RELOAD_TEXT = "#f39c12";
const COLOR_KILLS_ACTIVE = "#f9ca24";
const COLOR_KILLS_ZERO = "#555";
const COLOR_PLAYER_NAME = "#fff";
const COLOR_PLAYER_KILLS = "#f9ca24";
const COLOR_PLAYER_DEAD = "#555555";
const COLOR_PLAYER_DEAD_NAME = "#777";
const COLOR_DISCONNECT_BG = "#0f0f1a"; // matches --color-bg-page
const COLOR_DISCONNECT_TEXT = "#888"; // matches --color-text-secondary
const COLOR_HIT_FLASH = "#ffffff";
const COLOR_VIGNETTE = "220,50,50";

// Cactus segment geometry — must match server constants in src/game.ts
const CACTUS_HALF_WIDTH = 8;
const CACTUS_SEGMENT_STRIDE = 14;
const CACTUS_SEGMENT_WIDTH = 16;
const CACTUS_SEGMENT_HEIGHT = 12;
const ARM_LENGTH = 28; // must match src/game.ts
const HIT_FLASH_DURATION = 300; // ms
const SHAKE_DURATION = 400; // ms
const SHAKE_MAGNITUDE = 5; // max pixel offset
const VIGNETTE_DURATION = 600; // ms
const TRAIL_MAX_POSITIONS = 8; // positions per bullet (at 20 Hz ≈ 400 ms of history)

const playerName = sessionStorage.getItem("playerName");
const gameId = sessionStorage.getItem("gameId");
if (!playerName || !gameId) globalThis.location.href = "/";

const sounds = createSounds();

document.getElementById("game-title").textContent =
  gameId.charAt(0).toUpperCase() + gameId.slice(1);

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const countEl = document.getElementById("player-count");
const overlay = document.getElementById("overlay");
const winnerText = document.getElementById("winner-text");
const countdownText = document.getElementById("countdown-text");

// Game state
let myId = null;
let players = [];
let bullets = [];
let rocks = [];
let cacti = [];
let gameOverAt = null;
const deathTimes = new Map(); // playerId → timestamp when alive went false
const hitTimes = new Map(); // playerId → timestamp of last hit
const previousHealth = new Map(); // playerId → last known health
const previousBounces = new Map(); // bulletId → last known bounce count
const bulletTrails = new Map(); // bulletId → [{x, y}, …] (oldest first)
const previousCactiSegments = new Map(); // cactusId → segments boolean[]

// Shake/vignette state (local player hit only)
let shakeUntil = 0;
let vignetteUntil = 0;

function triggerShake() {
  shakeUntil = Date.now() + SHAKE_DURATION;
  vignetteUntil = Date.now() + VIGNETTE_DURATION;
}

// Local arm angle tracking (predicted, for responsive rendering)
let localArmAngle = 0;
let localFacing = "right";
const ARM_MAX = Math.PI / 3;
const ARM_STEP = (2 * Math.PI) / 180; // 2° per frame

// WebSocket
const protocol = location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(`${protocol}://${location.host}/ws/game/${gameId}`);

ws.onopen = () => {
  ws.send(JSON.stringify({ type: "join_game", gameId, playerName }));
};

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "game_joined") {
    myId = msg.playerId;
  } else if (msg.type === "arena") {
    rocks = msg.rocks;
    cacti = msg.cacti;
  } else if (msg.type === "game_state") {
    const now = Date.now();
    for (const p of msg.players) {
      if (!p.alive && !deathTimes.has(p.id)) {
        deathTimes.set(p.id, now);
        sounds.playDeath();
      }
      const prev = previousHealth.get(p.id) ?? p.health;
      if (p.health < prev) {
        hitTimes.set(p.id, now);
        if (p.id === myId) {
          triggerShake();
          sounds.playHit(true);
        } else sounds.playHit(false);
      }
      previousHealth.set(p.id, p.health);
    }
    players = msg.players;
    bullets = msg.bullets;
    for (const b of msg.bullets) {
      const prev = previousBounces.get(b.id) ?? 0;
      if (b.bounces > prev) sounds.playRicochet();
      previousBounces.set(b.id, b.bounces);
    }
    for (const id of previousBounces.keys()) {
      if (!msg.bullets.some((b) => b.id === id)) previousBounces.delete(id);
    }
    for (const b of msg.bullets) {
      const prevBounces = previousBounces.get(b.id) ?? 0;
      const trail = bulletTrails.get(b.id) ?? [];
      if (b.bounces > prevBounces) {
        bulletTrails.set(b.id, [{ x: b.x, y: b.y }]);
      } else {
        trail.push({ x: b.x, y: b.y });
        if (trail.length > TRAIL_MAX_POSITIONS) trail.shift();
        bulletTrails.set(b.id, trail);
      }
    }
    for (const id of bulletTrails.keys()) {
      if (!msg.bullets.some((b) => b.id === id)) bulletTrails.delete(id);
    }
    for (const cactus of msg.cacti) {
      const prev = previousCactiSegments.get(cactus.id);
      if (prev) {
        for (let i = 0; i < cactus.segments.length; i++) {
          if (prev[i] && !cactus.segments[i]) {
            sounds.playCactusHit();
            break;
          }
        }
      }
      previousCactiSegments.set(cactus.id, [...cactus.segments]);
    }
    cacti = msg.cacti;
    countEl.textContent = `${players.length} player${
      players.length !== 1 ? "s" : ""
    }`;
    const me = players.find((p) => p.id === myId);
    if (me) localFacing = me.facing;
  } else if (msg.type === "game_over") {
    gameOverAt = Date.now();
    winnerText.textContent = `🏆 ${msg.winnerName} wins!`;
    overlay.classList.add("visible");
    // Redirect to lobby after 5 seconds
    let remaining = 5;
    countdownText.textContent = `Returning to lobby in ${remaining}s…`;
    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        globalThis.location.href = "/lobby.html";
      } else {
        countdownText.textContent = `Returning to lobby in ${remaining}s…`;
      }
    }, 1000);
  }
};

ws.onclose = () => {
  if (gameOverAt) return; // Already handled by game_over overlay
  ctx.fillStyle = COLOR_DISCONNECT_BG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = COLOR_DISCONNECT_TEXT;
  ctx.font = "16px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(
    "Disconnected — go back to lobby",
    canvas.width / 2,
    canvas.height / 2,
  );
};

// Input
const keys = new Set();
document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  keys.add(k);
  if (k === "x") {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "shoot" }));
    }
    const me = players.find((p) => p.id === myId);
    if (me && me.ammo <= 0) sounds.playReload();
    else sounds.playShoot();
  }
  if (k === "r") {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "reload" }));
    }
    sounds.playReload();
  }
});
document.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

const muteBtn = document.getElementById("mute-btn");
muteBtn.addEventListener("click", () => {
  muteBtn.textContent = sounds.toggleMute() ? "🔇" : "🔊";
});

let lastMove = { dx: 0, dy: 0 };
let lastAngleSent = 0;

function sendInput() {
  const dx = (keys.has("arrowright") ? 1 : 0) - (keys.has("arrowleft") ? 1 : 0);
  const dy = (keys.has("arrowdown") ? 1 : 0) - (keys.has("arrowup") ? 1 : 0);

  if (dx !== lastMove.dx || dy !== lastMove.dy) {
    lastMove = { dx, dy };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "move", dx, dy }));
    }
  }

  if (dx > 0) localFacing = "right";
  else if (dx < 0) localFacing = "left";

  let changed = false;
  if (keys.has("a")) {
    localArmAngle = Math.min(ARM_MAX, localArmAngle + ARM_STEP);
    changed = true;
  }
  if (keys.has("z")) {
    localArmAngle = Math.max(-ARM_MAX, localArmAngle - ARM_STEP);
    changed = true;
  }

  if (changed && Date.now() - lastAngleSent > 40) {
    lastAngleSent = Date.now();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "arm_angle", angle: localArmAngle }));
    }
  }
}

// Rendering
function drawRock(rock) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(rock.vertices[0].x, rock.vertices[0].y);
  for (let i = 1; i < rock.vertices.length; i++) {
    ctx.lineTo(rock.vertices[i].x, rock.vertices[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = COLOR_ROCK_FILL;
  ctx.fill();
  ctx.strokeStyle = COLOR_ROCK_STROKE;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawCactus(cactus) {
  for (let i = 0; i < cactus.segments.length; i++) {
    if (!cactus.segments[i]) continue;
    const sx = cactus.x - CACTUS_HALF_WIDTH,
      sy = cactus.y + i * CACTUS_SEGMENT_STRIDE;
    ctx.fillStyle = COLOR_CACTUS_FILL;
    ctx.fillRect(sx, sy, CACTUS_SEGMENT_WIDTH, CACTUS_SEGMENT_HEIGHT);
    ctx.strokeStyle = COLOR_CACTUS_STROKE;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, CACTUS_SEGMENT_WIDTH, CACTUS_SEGMENT_HEIGHT);
  }
}

function lerpColor(c1, c2, t) {
  const r1 = parseInt(c1.slice(1, 3), 16),
    g1 = parseInt(c1.slice(3, 5), 16),
    b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16),
    g2 = parseInt(c2.slice(3, 5), 16),
    b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t),
    g = Math.round(g1 + (g2 - g1) * t),
    b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

function drawPlayer(p) {
  if (!p.alive) {
    const deathTime = deathTimes.get(p.id) ?? Date.now();
    const t = Math.min(1, (Date.now() - deathTime) / 1500);
    const radius = 14 - t * 6;
    const color = lerpColor(p.color, COLOR_PLAYER_DEAD, t);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.4 + 0.6 * (1 - t * 0.5);
    ctx.fillStyle = COLOR_PLAYER_DEAD_NAME;
    ctx.fillText(p.name, p.x, p.y + 20);
    ctx.globalAlpha = 1;
    return;
  }

  const isMe = p.id === myId;
  const angle = isMe ? localArmAngle : p.armAngle;
  const facing = isMe ? localFacing : p.facing;
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
  const hitTime = hitTimes.get(p.id);
  if (hitTime) {
    const flashT = (Date.now() - hitTime) / HIT_FLASH_DURATION;
    if (flashT < 1) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = COLOR_HIT_FLASH;
      ctx.globalAlpha = (1 - flashT) * 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Arm
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(
    p.x + dir * ARM_LENGTH * Math.cos(angle),
    p.y - ARM_LENGTH * Math.sin(angle),
  );
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.stroke();

  // Health bar
  const barW = 36, barH = 4, bx = p.x - 18, by = p.y - 26;
  ctx.fillStyle = COLOR_HEALTH_BG;
  ctx.fillRect(bx, by, barW, barH);
  ctx.fillStyle = p.health > 60
    ? COLOR_HEALTH_HIGH
    : p.health > 30
    ? COLOR_HEALTH_MID
    : COLOR_HEALTH_LOW;
  ctx.fillRect(bx, by, barW * (p.health / 100), barH);

  // Name + kills
  ctx.fillStyle = COLOR_PLAYER_NAME;
  ctx.font = "bold 11px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(p.name, p.x, p.y + 26);
  if (p.kills > 0) {
    ctx.fillStyle = COLOR_PLAYER_KILLS;
    ctx.font = "9px system-ui";
    ctx.fillText(`★ ${p.kills}`, p.x, p.y + 37);
  }
}

function drawBulletTrail(b) {
  const trail = bulletTrails.get(b.id);
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

function drawBullet(b) {
  ctx.beginPath();
  ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_BULLET_FILL;
  ctx.fill();
  ctx.strokeStyle = COLOR_BULLET_STROKE;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawHUD() {
  const me = players.find((p) => p.id === myId);
  if (!me || !me.alive) return;

  const size = 8, gap = 4, px = 14, py = canvas.height - 20;
  ctx.font = "bold 10px system-ui";
  ctx.textAlign = "left";

  if (me.reloading) {
    ctx.fillStyle = COLOR_RELOAD_TEXT;
    ctx.fillText("RELOADING…", px, py + 8);
  } else {
    ctx.fillStyle = COLOR_HUD_LABEL;
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
      ctx.fillStyle = i < me.ammo ? COLOR_AMMO_FULL : COLOR_AMMO_EMPTY;
      ctx.fill();
    }
  }

  // Kill counter
  ctx.textAlign = "right";
  ctx.fillStyle = COLOR_HUD_LABEL;
  ctx.font = "bold 10px system-ui";
  ctx.fillText("KILLS", canvas.width - 14, py - 2);
  ctx.fillStyle = me.kills > 0 ? COLOR_KILLS_ACTIVE : COLOR_KILLS_ZERO;
  ctx.font = "bold 18px system-ui";
  ctx.fillText(String(me.kills), canvas.width - 14, py + 10);
}

function drawVignette() {
  const now = Date.now();
  if (now >= vignetteUntil) return;
  const alpha =
    (1 - (now - (vignetteUntil - VIGNETTE_DURATION)) / VIGNETTE_DURATION) *
    0.55;
  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    canvas.height * 0.25,
    canvas.width / 2,
    canvas.height / 2,
    canvas.height * 0.85,
  );
  gradient.addColorStop(0, `rgba(${COLOR_VIGNETTE},0)`);
  gradient.addColorStop(1, `rgba(${COLOR_VIGNETTE},${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function render() {
  sendInput();

  const now = Date.now();
  ctx.save();
  if (now < shakeUntil) {
    const progress = (shakeUntil - now) / SHAKE_DURATION;
    const magnitude = SHAKE_MAGNITUDE * progress;
    ctx.translate(
      (Math.random() * 2 - 1) * magnitude,
      (Math.random() * 2 - 1) * magnitude,
    );
  }

  ctx.fillStyle = COLOR_GROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const rock of rocks) drawRock(rock);
  for (const cactus of cacti) drawCactus(cactus);
  for (const b of bullets) drawBulletTrail(b);
  for (const b of bullets) drawBullet(b);
  for (const p of players) drawPlayer(p);

  drawHUD();
  ctx.restore();

  drawVignette();

  requestAnimationFrame(render);
}

requestAnimationFrame(render);

globalThis.addEventListener("beforeunload", () => {
  ws.send(JSON.stringify({ type: "leave_game" }));
});

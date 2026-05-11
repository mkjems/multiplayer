// ═════════════════════════════════════════════════════════════════════════════
// Input Handling
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Sets up keyboard input handlers and sends player commands to server.
 *
 * @param {object} network - Network manager
 * @param {object} sounds - Sound manager
 * @param {object} gameState - Game state object
 * @param {object} constants - Game constants
 */
export function setupInputHandler(network, sounds, gameState, constants) {
  const keys = new Set();
  let lastMove = { dx: 0, dy: 0 };
  let lastAngleSent = 0;

  // Handle key presses
  document.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    keys.add(k);

    if (k === "x") {
      // Shoot
      network.send({ type: "shoot" });
      const me = gameState.getLocalPlayer();
      if (me && me.ammo <= 0) {
        sounds.playReload();
      } else {
        sounds.playShoot();
      }
    }

    if (k === "r") {
      // Reload
      network.send({ type: "reload" });
      sounds.playReload();
    }
  });

  document.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });

  // Mute button
  const muteBtn = document.getElementById("mute-btn");
  muteBtn.addEventListener("click", () => {
    muteBtn.textContent = sounds.toggleMute() ? "🔇" : "🔊";
  });

  // Called once per frame to process input and send to server
  function processInput() {
    const dx = (keys.has("arrowright") ? 1 : 0) - (keys.has("arrowleft") ? 1 : 0);
    const dy = (keys.has("arrowdown") ? 1 : 0) - (keys.has("arrowup") ? 1 : 0);

    // Send movement if changed
    if (dx !== lastMove.dx || dy !== lastMove.dy) {
      lastMove = { dx, dy };
      network.send({ type: "move", dx, dy });
    }

    // Update local facing based on horizontal movement
    if (dx > 0) gameState.localFacing = "right";
    else if (dx < 0) gameState.localFacing = "left";

    // Handle arm angle adjustment (A/Z keys)
    let angleChanged = false;
    if (keys.has("a")) {
      gameState.localArmAngle = Math.min(
        constants.ARM_MAX,
        gameState.localArmAngle + constants.ARM_STEP,
      );
      angleChanged = true;
    }
    if (keys.has("z")) {
      gameState.localArmAngle = Math.max(
        -constants.ARM_MAX,
        gameState.localArmAngle - constants.ARM_STEP,
      );
      angleChanged = true;
    }

    // Send arm angle if changed (throttled to ~40ms)
    if (angleChanged && Date.now() - lastAngleSent > 40) {
      lastAngleSent = Date.now();
      network.send({ type: "arm_angle", angle: gameState.localArmAngle });
    }
  }

  return { processInput };
}

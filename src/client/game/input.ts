// ═════════════════════════════════════════════════════════════════════════════
// Input Handling
// ═════════════════════════════════════════════════════════════════════════════

import type { ClientMessage } from "../../shared/protocol";
import type { GameState } from "./state.ts";
import type { Sounds } from "../sounds.ts";
import type * as ConstantsModule from "./constants.ts";
import { requireElement } from "./utils.ts";

export interface InputHandler {
  processInput(): void;
  dispose(): void;
  setTouchMove(dx: number, dy: number): void;
  clearTouchMove(): void;
  setTouchArmAngle(angle: number): void;
  fireTouchShoot(): void;
  fireTouchReload(): void;
}

/**
 * Sets up keyboard input handlers and sends player commands to server.
 */
export function setupInputHandler(
  network: { send: (msg: ClientMessage) => void },
  sounds: Sounds,
  gameState: GameState,
  constants: typeof ConstantsModule,
): InputHandler {
  const keys = new Set<string>();
  let lastMove = { dx: 0, dy: 0 };
  let lastAngleSent = 0;
  let lastShootSent = 0;
  let touchMoveActive = false;
  const muteBtn = requireElement("mute-btn");

  function tryShoot(): void {
    const me = gameState.getLocalPlayer();
    const now = Date.now();
    if (
      !me || !me.alive || me.reloading ||
      now - lastShootSent < constants.SHOOT_COOL_DOWN_MS
    ) {
      return;
    }

    network.send({ type: "shoot" });
    lastShootSent = now;
    if (me.ammo <= 0) {
      sounds.playReload();
    } else {
      sounds.playShoot();
    }
  }

  // Handle key presses
  const onKeyDown = (e: KeyboardEvent): void => {
    const k = e.key.toLowerCase();
    keys.add(k);

    if (k === "x") {
      tryShoot();
    }

    if (k === "r") {
      // Reload
      network.send({ type: "reload" });
      sounds.playReload();
    }
  };

  const onKeyUp = (e: KeyboardEvent): void => {
    keys.delete(e.key.toLowerCase());
  };

  // Mute button
  const onMuteClick = (): void => {
    muteBtn.textContent = sounds.toggleMute() ? "🔇" : "🔊";
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  muteBtn.addEventListener("click", onMuteClick);

  // Called once per frame to process input and send to server
  function processInput(): void {
    if (!touchMoveActive) {
      const dx = (keys.has("arrowright") ? 1 : 0) -
        (keys.has("arrowleft") ? 1 : 0);
      const dy = (keys.has("arrowdown") ? 1 : 0) -
        (keys.has("arrowup") ? 1 : 0);

      if (dx !== lastMove.dx || dy !== lastMove.dy) {
        lastMove = { dx, dy };
        network.send({ type: "move", dx, dy });
      }

      if (dx > 0) gameState.localFacing = "right";
      else if (dx < 0) gameState.localFacing = "left";
    }

    // Handle arm angle adjustment (A/Z keys)
    const { armMax } = gameState.arenaConfig;
    let angleChanged = false;
    if (keys.has("a")) {
      gameState.localArmAngle = Math.min(
        armMax,
        gameState.localArmAngle + constants.ARM_STEP,
      );
      angleChanged = true;
    }
    if (keys.has("z")) {
      gameState.localArmAngle = Math.max(
        -armMax,
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

  function dispose(): void {
    keys.clear();
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
    muteBtn.removeEventListener("click", onMuteClick);
  }

  function setTouchMove(dx: number, dy: number): void {
    touchMoveActive = true;
    if (dx > 0) gameState.localFacing = "right";
    else if (dx < 0) gameState.localFacing = "left";
    if (dx !== lastMove.dx || dy !== lastMove.dy) {
      lastMove = { dx, dy };
      network.send({ type: "move", dx, dy });
    }
  }

  function clearTouchMove(): void {
    touchMoveActive = false;
    if (lastMove.dx !== 0 || lastMove.dy !== 0) {
      lastMove = { dx: 0, dy: 0 };
      network.send({ type: "move", dx: 0, dy: 0 });
    }
  }

  function setTouchArmAngle(angle: number): void {
    const { armMax } = gameState.arenaConfig;
    gameState.localArmAngle = Math.max(-armMax, Math.min(armMax, angle));
    if (Date.now() - lastAngleSent > 40) {
      lastAngleSent = Date.now();
      network.send({ type: "arm_angle", angle: gameState.localArmAngle });
    }
  }

  function fireTouchShoot(): void {
    tryShoot();
  }

  function fireTouchReload(): void {
    network.send({ type: "reload" });
    sounds.playReload();
  }

  return {
    processInput,
    dispose,
    setTouchMove,
    clearTouchMove,
    setTouchArmAngle,
    fireTouchShoot,
    fireTouchReload,
  };
}

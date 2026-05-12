// ═════════════════════════════════════════════════════════════════════════════
// Touch Controls Overlay
// ═════════════════════════════════════════════════════════════════════════════

import type { InputHandler } from "./input.js";
import type { GameState } from "./state.js";

export function setupTouchControls(
  inputHandler: InputHandler,
  gameState: GameState,
): () => void {
  const overlay = document.createElement("div");
  overlay.id = "touch-overlay";
  document.body.appendChild(overlay);

  // ── Left joystick ──────────────────────────────────────────────────────────
  const joystickBase = document.createElement("div");
  joystickBase.className = "touch-joystick-base";
  const joystickThumb = document.createElement("div");
  joystickThumb.className = "touch-joystick-thumb";
  joystickBase.appendChild(joystickThumb);
  overlay.appendChild(joystickBase);

  const joystickMaxOffset = 40;
  let joystickTouchId: number | null = null;
  let joystickCenterX = 0;
  let joystickCenterY = 0;

  function updateJoystick(clientX: number, clientY: number): void {
    const rawDx = clientX - joystickCenterX;
    const rawDy = clientY - joystickCenterY;
    const distance = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

    let normalizedDx: number;
    let normalizedDy: number;
    let thumbOffsetX: number;
    let thumbOffsetY: number;

    if (distance === 0) {
      normalizedDx = 0;
      normalizedDy = 0;
      thumbOffsetX = 0;
      thumbOffsetY = 0;
    } else if (distance <= joystickMaxOffset) {
      normalizedDx = rawDx / joystickMaxOffset;
      normalizedDy = rawDy / joystickMaxOffset;
      thumbOffsetX = rawDx;
      thumbOffsetY = rawDy;
    } else {
      normalizedDx = rawDx / distance;
      normalizedDy = rawDy / distance;
      thumbOffsetX = normalizedDx * joystickMaxOffset;
      thumbOffsetY = normalizedDy * joystickMaxOffset;
    }

    joystickThumb.style.transform =
      `translate(calc(-50% + ${thumbOffsetX}px), calc(-50% + ${thumbOffsetY}px))`;
    inputHandler.setTouchMove(normalizedDx, normalizedDy);
  }

  const onJoystickStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (joystickTouchId !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchId = touch.identifier;
    const rect = joystickBase.getBoundingClientRect();
    joystickCenterX = rect.left + rect.width / 2;
    joystickCenterY = rect.top + rect.height / 2;
    updateJoystick(touch.clientX, touch.clientY);
  };
  joystickBase.addEventListener("touchstart", onJoystickStart, {
    passive: false,
  });

  // ── Arm angle slider ───────────────────────────────────────────────────────
  const sliderContainer = document.createElement("div");
  sliderContainer.className = "touch-slider-container";
  const sliderTrack = document.createElement("div");
  sliderTrack.className = "touch-slider-track";
  const sliderThumb = document.createElement("div");
  sliderThumb.className = "touch-slider-thumb";
  sliderTrack.appendChild(sliderThumb);
  sliderContainer.appendChild(sliderTrack);
  overlay.appendChild(sliderContainer);

  let sliderTouchId: number | null = null;

  function updateSlider(clientY: number): void {
    const rect = sliderTrack.getBoundingClientRect();
    const clampedY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const normalizedPosition = clampedY / rect.height;
    const armMax = gameState.arenaConfig.armMax;
    // Top of slider = armMax (arm up), bottom = -armMax (arm down)
    const angle = armMax * (1 - normalizedPosition * 2);
    sliderThumb.style.top = `${normalizedPosition * 100}%`;
    inputHandler.setTouchArmAngle(angle);
  }

  const onSliderStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (sliderTouchId !== null) return;
    const touch = e.changedTouches[0];
    sliderTouchId = touch.identifier;
    updateSlider(touch.clientY);
  };
  sliderTrack.addEventListener("touchstart", onSliderStart, { passive: false });

  // ── Fire button ────────────────────────────────────────────────────────────
  const fireButton = document.createElement("button");
  fireButton.className = "touch-fire-btn";
  fireButton.textContent = "FIRE";
  overlay.appendChild(fireButton);

  const onFireStart = (e: TouchEvent): void => {
    e.preventDefault();
    inputHandler.fireTouchShoot();
  };
  fireButton.addEventListener("touchstart", onFireStart, { passive: false });

  // ── Reload button ──────────────────────────────────────────────────────────
  const reloadButton = document.createElement("button");
  reloadButton.className = "touch-reload-btn";
  reloadButton.textContent = "R";
  overlay.appendChild(reloadButton);

  const onReloadStart = (e: TouchEvent): void => {
    e.preventDefault();
    inputHandler.fireTouchReload();
  };
  reloadButton.addEventListener("touchstart", onReloadStart, {
    passive: false,
  });

  // ── Document-level tracking (multi-touch joystick + slider) ───────────────
  const onTouchMove = (e: TouchEvent): void => {
    if (joystickTouchId === null && sliderTouchId === null) return;
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier === joystickTouchId) {
        updateJoystick(touch.clientX, touch.clientY);
      } else if (touch.identifier === sliderTouchId) {
        updateSlider(touch.clientY);
      }
    }
  };

  const onTouchEnd = (e: TouchEvent): void => {
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier === joystickTouchId) {
        joystickTouchId = null;
        joystickThumb.style.transform = "";
        inputHandler.clearTouchMove();
      } else if (touch.identifier === sliderTouchId) {
        sliderTouchId = null;
      }
    }
  };

  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("touchend", onTouchEnd);
  document.addEventListener("touchcancel", onTouchEnd);

  return function dispose(): void {
    joystickBase.removeEventListener("touchstart", onJoystickStart);
    sliderTrack.removeEventListener("touchstart", onSliderStart);
    fireButton.removeEventListener("touchstart", onFireStart);
    reloadButton.removeEventListener("touchstart", onReloadStart);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
    document.removeEventListener("touchcancel", onTouchEnd);
    overlay.remove();
  };
}

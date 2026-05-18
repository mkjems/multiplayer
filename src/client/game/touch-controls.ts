// ═════════════════════════════════════════════════════════════════════════════
// Touch Controls Overlay
// ═════════════════════════════════════════════════════════════════════════════

import type { InputHandler } from "./input.ts";
import type { GameState } from "./state.ts";

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

  // ── Rotate-to-landscape prompt ─────────────────────────────────────────────
  const rotatePrompt = document.createElement("div");
  rotatePrompt.id = "touch-rotate-prompt";
  rotatePrompt.innerHTML = `
    <svg class="rotate-phone-svg" viewBox="0 0 140 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="4" width="32" height="54" rx="5" stroke="rgba(255,255,255,0.85)" stroke-width="3"/>
      <rect x="14" y="50" width="16" height="3" rx="1.5" fill="rgba(255,255,255,0.6)"/>
      <path d="M 44 32 Q 60 8 86 10 Q 112 12 126 34" stroke="rgba(255,255,255,0.75)" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M 120 42 L 128 33 L 134 43" stroke="rgba(255,255,255,0.75)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <rect x="88" y="56" width="46" height="28" rx="5" stroke="rgba(255,255,255,0.85)" stroke-width="3"/>
      <rect x="129" y="64" width="3" height="12" rx="1.5" fill="rgba(255,255,255,0.6)"/>
    </svg>
    <p>Rotate your device for the best experience</p>
  `;
  document.body.appendChild(rotatePrompt);

  function onOrientationChange(): void {
    const isPortrait = window.innerHeight > window.innerWidth;
    rotatePrompt.classList.toggle("visible", isPortrait);
  }
  window.addEventListener("resize", onOrientationChange);
  onOrientationChange();

  // ── Add-to-Home-Screen tip ─────────────────────────────────────────────────
  const isStandalone = (navigator as unknown as { standalone?: boolean })
    .standalone === true;
  const tipDismissed = sessionStorage.getItem("homeScreenTipDismissed");
  let homeScreenTip: HTMLDivElement | null = null;
  if (!isStandalone && !tipDismissed) {
    homeScreenTip = document.createElement("div");
    homeScreenTip.id = "touch-homeScreen-tip";
    homeScreenTip.innerHTML = `
      <span>Add to Home Screen for full-screen play</span>
      <button id="touch-homeScreen-dismiss" aria-label="Dismiss">✕</button>
    `;
    document.body.appendChild(homeScreenTip);
    document
      .getElementById("touch-homeScreen-dismiss")
      ?.addEventListener("click", () => {
        sessionStorage.setItem("homeScreenTipDismissed", "1");
        homeScreenTip?.remove();
      });
  }

  return function dispose(): void {
    joystickBase.removeEventListener("touchstart", onJoystickStart);
    sliderTrack.removeEventListener("touchstart", onSliderStart);
    fireButton.removeEventListener("touchstart", onFireStart);
    reloadButton.removeEventListener("touchstart", onReloadStart);
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
    document.removeEventListener("touchcancel", onTouchEnd);
    window.removeEventListener("resize", onOrientationChange);
    overlay.remove();
    rotatePrompt.remove();
    homeScreenTip?.remove();
  };
}

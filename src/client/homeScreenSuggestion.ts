interface StandaloneNavigator extends Navigator {
  readonly standalone?: boolean;
}

const homeScreenSuggestion = document.getElementById("homeScreenSuggestion");
const dismissHomeScreenSuggestion = document.getElementById(
  "dismissHomeScreenSuggestion",
);
const homeScreenInstructions = document.getElementById(
  "homeScreenInstructions",
);

if (!(homeScreenSuggestion instanceof HTMLElement)) {
  throw new Error("Missing required element: #homeScreenSuggestion");
}
if (!(dismissHomeScreenSuggestion instanceof HTMLButtonElement)) {
  throw new Error(
    "Missing required button element: #dismissHomeScreenSuggestion",
  );
}
if (!(homeScreenInstructions instanceof HTMLParagraphElement)) {
  throw new Error(
    "Missing required paragraph element: #homeScreenInstructions",
  );
}

const installSuggestion = homeScreenSuggestion;
const dismissInstallSuggestionButton = dismissHomeScreenSuggestion;
const installInstructions = homeScreenInstructions;

let isInstallSuggestionDismissed = false;

function isIosDevice(): boolean {
  const platform = navigator.platform.toLowerCase();
  const hasIosPlatform = /iphone|ipod/.test(platform);
  const hasModernIpadSignal = platform === "macintel" &&
    navigator.maxTouchPoints > 1;

  return hasIosPlatform || hasModernIpadSignal;
}

function isStandaloneDisplay(): boolean {
  const standaloneNavigator = navigator as StandaloneNavigator;

  return globalThis.matchMedia("(display-mode: standalone)").matches ||
    standaloneNavigator.standalone === true;
}

function isLikelyPhone(): boolean {
  const hasTouch = navigator.maxTouchPoints > 0 ||
    globalThis.matchMedia("(pointer: coarse)").matches;
  const hasPhoneViewport = globalThis.matchMedia(
    "(max-width: 767px), (max-height: 480px)",
  ).matches;

  return hasTouch && hasPhoneViewport;
}

function updateInstallSuggestion(): void {
  const shouldShowSuggestion = isLikelyPhone() && !isStandaloneDisplay() &&
    !isInstallSuggestionDismissed;
  installSuggestion.hidden = !shouldShowSuggestion;

  if (!shouldShowSuggestion) return;

  installInstructions.textContent = isIosDevice()
    ? "Tap Share, then Add to Home Screen for the best fullscreen experience."
    : "Open your browser menu, then tap Add to Home screen for the best fullscreen experience.";
}

export function initializeHomeScreenSuggestion(): void {
  updateInstallSuggestion();
  globalThis.addEventListener("resize", updateInstallSuggestion);
  globalThis.matchMedia("(display-mode: standalone)").addEventListener(
    "change",
    updateInstallSuggestion,
  );

  dismissInstallSuggestionButton.addEventListener("click", () => {
    isInstallSuggestionDismissed = true;
    installSuggestion.hidden = true;
  });
}

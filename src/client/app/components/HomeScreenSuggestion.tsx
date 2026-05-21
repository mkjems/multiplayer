import { useEffect, useState } from "react";
import styles from "./HomeScreenSuggestion.module.css";

interface StandaloneNavigator extends Navigator {
  readonly standalone?: boolean;
}

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

function getInstallInstructions(): string {
  return isIosDevice()
    ? "Tap Share, then Add to Home Screen for the best fullscreen experience."
    : "Open your browser menu, then tap Add to Home screen for the best fullscreen experience.";
}

function shouldShowHomeScreenSuggestion(isDismissed: boolean): boolean {
  return isLikelyPhone() && !isStandaloneDisplay() && !isDismissed;
}

export function HomeScreenSuggestion(): React.JSX.Element | null {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [instructions, setInstructions] = useState(getInstallInstructions);

  useEffect(() => {
    const standaloneMediaQuery = globalThis.matchMedia(
      "(display-mode: standalone)",
    );

    function updateSuggestion(): void {
      const nextIsVisible = shouldShowHomeScreenSuggestion(isDismissed);
      setIsVisible(nextIsVisible);
      if (nextIsVisible) {
        setInstructions(getInstallInstructions());
      }
    }

    updateSuggestion();
    globalThis.addEventListener("resize", updateSuggestion);
    standaloneMediaQuery.addEventListener("change", updateSuggestion);

    return () => {
      globalThis.removeEventListener("resize", updateSuggestion);
      standaloneMediaQuery.removeEventListener("change", updateSuggestion);
    };
  }, [isDismissed]);

  if (!isVisible) return null;

  return (
    <aside className={styles.homeScreenSuggestion} aria-live="polite">
      <button
        className={styles.dismissSuggestion}
        type="button"
        aria-label="Dismiss home screen suggestion"
        onClick={() => setIsDismissed(true)}
      >
        x
      </button>
      <strong>Add Cowboys to your Home Screen</strong>
      <p>{instructions}</p>
    </aside>
  );
}

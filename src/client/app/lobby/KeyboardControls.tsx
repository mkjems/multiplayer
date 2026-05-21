import styles from "./KeyboardControls.module.css";

function isTouchDevice(): boolean {
  return navigator.maxTouchPoints > 0;
}

export function KeyboardControls(): React.JSX.Element | null {
  if (isTouchDevice()) return null;

  return (
    <section
      className={styles.keyboardControls}
      aria-labelledby="keyboard-controls-title"
    >
      <h2 id="keyboard-controls-title">Keyboard controls</h2>
      <ul className={styles.controlList}>
        <li>
          <span>Move</span>
          <span className={styles.controlKeys}>
            <kbd className={styles.key}>↑</kbd>
            <kbd className={styles.key}>←</kbd>
            <kbd className={styles.key}>↓</kbd>
            <kbd className={styles.key}>→</kbd>
          </span>
        </li>
        <li>
          <span>Aim arm</span>
          <span className={styles.controlKeys}>
            <kbd className={styles.key}>A</kbd>
            <kbd className={styles.key}>Z</kbd>
          </span>
        </li>
        <li>
          <span>Fire</span>
          <span className={styles.controlKeys}>
            <kbd className={styles.key}>X</kbd>
          </span>
        </li>
        <li>
          <span>Reload</span>
          <span className={styles.controlKeys}>
            <kbd className={styles.key}>R</kbd>
          </span>
        </li>
      </ul>
    </section>
  );
}

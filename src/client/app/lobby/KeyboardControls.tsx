function isTouchDevice(): boolean {
  return navigator.maxTouchPoints > 0;
}

export function KeyboardControls(): React.JSX.Element | null {
  if (isTouchDevice()) return null;

  return (
    <section
      className="keyboard-controls"
      aria-labelledby="keyboard-controls-title"
    >
      <h2 id="keyboard-controls-title">Keyboard controls</h2>
      <ul className="control-list">
        <li>
          <span>Move</span>
          <span className="control-keys">
            <kbd>↑</kbd>
            <kbd>←</kbd>
            <kbd>↓</kbd>
            <kbd>→</kbd>
          </span>
        </li>
        <li>
          <span>Aim arm</span>
          <span className="control-keys">
            <kbd>A</kbd>
            <kbd>Z</kbd>
          </span>
        </li>
        <li>
          <span>Fire</span>
          <span className="control-keys">
            <kbd>X</kbd>
          </span>
        </li>
        <li>
          <span>Reload</span>
          <span className="control-keys">
            <kbd>R</kbd>
          </span>
        </li>
      </ul>
    </section>
  );
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(Math.round(value));
}

export function formatMilliseconds(value: number): string {
  return `${value.toFixed(2)} ms`;
}

export function formatBytes(value: number): string {
  if (value < 1024) return `${formatNumber(value)} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export function percentOf(value: number, reference: number): number {
  return Math.max(0, Math.min(100, (value / reference) * 100));
}

export function getBarColor(percent: number): string {
  if (percent >= 80) return "var(--diagnostics-color-bad)";
  if (percent >= 55) return "var(--diagnostics-color-warn)";
  return "var(--diagnostics-color-good)";
}

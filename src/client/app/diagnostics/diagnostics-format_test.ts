declare const Deno: {
  test(name: string, testFunction: () => void | Promise<void>): void;
};

import {
  formatBytes,
  formatMilliseconds,
  formatNumber,
  getBarColor,
  percentOf,
} from "./diagnostics-format.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

Deno.test("diagnostics formatters produce compact display values", () => {
  assert(formatNumber(1200.4) === "1,200", "numbers should be rounded");
  assert(formatMilliseconds(1.234) === "1.23 ms", "milliseconds should format");
  assert(formatBytes(900) === "900 B", "bytes should format as bytes");
  assert(formatBytes(2048) === "2.0 KB", "kilobytes should format");
});

Deno.test("diagnostics percentages are bounded", () => {
  assert(percentOf(-10, 100) === 0, "negative percentages should clamp to 0");
  assert(percentOf(50, 100) === 50, "normal percentages should pass through");
  assert(percentOf(200, 100) === 100, "large percentages should clamp to 100");
});

Deno.test("diagnostics bar colors follow threshold ranges", () => {
  assert(
    getBarColor(20) === "var(--diagnostics-color-good)",
    "low values should be good",
  );
  assert(
    getBarColor(60) === "var(--diagnostics-color-warn)",
    "middle values should warn",
  );
  assert(
    getBarColor(90) === "var(--diagnostics-color-bad)",
    "high values should be bad",
  );
});

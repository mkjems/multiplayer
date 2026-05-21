import { percentOf } from "./diagnostics-format.ts";
import styles from "./SparkLine.module.css";

const sparkLineWidth = 220;
const sparkLineHeight = 52;

interface SparkLineProps {
  label: string;
  values: number[];
  referenceValue: number;
}

function createSparkLinePoints(
  values: number[],
  referenceValue: number,
): string {
  if (values.length === 0) return "";
  if (values.length === 1) {
    const y = sparkLineHeight -
      percentOf(values[0], referenceValue) / 100 * sparkLineHeight;
    return `0,${y.toFixed(2)} ${sparkLineWidth},${y.toFixed(2)}`;
  }

  return values.map((value, index) => {
    const x = (index / (values.length - 1)) * sparkLineWidth;
    const y = sparkLineHeight -
      percentOf(value, referenceValue) / 100 * sparkLineHeight;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

export function SparkLine(
  { label, values, referenceValue }: SparkLineProps,
): React.JSX.Element {
  return (
    <svg
      className={styles.sparkLine}
      viewBox={`0 0 ${sparkLineWidth} ${sparkLineHeight}`}
      role="img"
      aria-label={`${label} trend`}
      preserveAspectRatio="none"
    >
      <line
        x1="0"
        y1={sparkLineHeight - 1}
        x2={sparkLineWidth}
        y2={sparkLineHeight - 1}
        className={styles.sparkLineBaseline}
      >
      </line>
      <polyline
        points={createSparkLinePoints(values, referenceValue)}
        className={styles.sparkLineLine}
      >
      </polyline>
    </svg>
  );
}

import type { RoomDiagnostics } from "../../../shared/diagnostics.ts";
import { formatNumber } from "./diagnostics-format.ts";
import styles from "./DiagnosticsSummary.module.css";

interface DiagnosticsSummaryProps {
  rooms: RoomDiagnostics[];
}

export function DiagnosticsSummary(
  { rooms }: DiagnosticsSummaryProps,
): React.JSX.Element {
  const activeRooms = rooms.filter((room) => room.active).length;
  const playerCount = rooms.reduce((sum, room) => sum + room.playerCount, 0);
  const skippedSnapshots = rooms.reduce(
    (sum, room) => sum + room.network.skippedGameStateCount,
    0,
  );

  return (
    <section className={styles.summaryGrid} aria-label="Server summary">
      <SummaryTile label="Rooms" value={rooms.length} />
      <SummaryTile label="Active" value={activeRooms} />
      <SummaryTile label="Players" value={playerCount} />
      <SummaryTile label="Skipped snapshots" value={skippedSnapshots} />
    </section>
  );
}

interface SummaryTileProps {
  label: string;
  value: number;
}

function SummaryTile({ label, value }: SummaryTileProps): React.JSX.Element {
  return (
    <div className={styles.summaryTile}>
      <span className={styles.summaryLabel}>{label}</span>
      <strong>{formatNumber(value)}</strong>
    </div>
  );
}

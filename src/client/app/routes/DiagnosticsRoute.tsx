import { DiagnosticsRoomCard } from "../diagnostics/DiagnosticsRoomCard.tsx";
import { DiagnosticsSummary } from "../diagnostics/DiagnosticsSummary.tsx";
import { useDiagnostics } from "../diagnostics/use-diagnostics.ts";
import { useDocumentTitle } from "../use-document-title.ts";
import styles from "./DiagnosticsRoute.module.css";

export function DiagnosticsRoute(): React.JSX.Element {
  const diagnostics = useDiagnostics();
  const rooms = diagnostics.data?.rooms ?? [];
  useDocumentTitle("Diagnostics - Multiplayer");

  const statePillClassName = `${styles.diagnosticsStatePill}${
    diagnostics.status === "live" ? ` ${styles.live}` : ""
  }${diagnostics.status === "offline" ? ` ${styles.offline}` : ""}`;

  return (
    <div className={styles.diagnosticsPage}>
      <header className={styles.diagnosticsPageHeader}>
        <div>
          <p className={styles.diagnosticsEyebrow}>Developer diagnostics</p>
          <h1>Room Performance</h1>
        </div>
        <div className={styles.diagnosticsRefreshStatus}>
          <span className={statePillClassName}>
            {getConnectionStatusLabel(diagnostics.status)}
          </span>
          <span>
            {diagnostics.lastUpdatedAt
              ? `Updated ${diagnostics.lastUpdatedAt.toLocaleTimeString()}`
              : "Never updated"}
          </span>
        </div>
      </header>

      <main className={styles.diagnosticsMain}>
        <DiagnosticsSummary rooms={rooms} />

        <section aria-labelledby="rooms-title">
          <div className={styles.diagnosticsSectionHeading}>
            <h2 id="rooms-title">Rooms</h2>
            <p>
              {diagnostics.data
                ? `Server sample: ${
                  new Date(diagnostics.data.generatedAt).toLocaleTimeString()
                }`
                : getGeneratedAtPlaceholder(diagnostics.status)}
            </p>
          </div>

          {rooms.length > 0
            ? (
              <div className={styles.diagnosticsRoomGrid}>
                {rooms.map((room) => (
                  <DiagnosticsRoomCard
                    room={room}
                    history={diagnostics.historyByRoomId.get(room.id) ?? []}
                    key={room.id}
                  />
                ))}
              </div>
            )
            : (
              <div className={styles.diagnosticsEmptyState}>
                {diagnostics.status === "offline"
                  ? "Diagnostics endpoint unavailable."
                  : "Loading diagnostics..."}
              </div>
            )}
        </section>
      </main>
    </div>
  );
}

function getConnectionStatusLabel(
  status: "connecting" | "live" | "offline",
): string {
  if (status === "live") return "Live";
  if (status === "offline") return "Offline";
  return "Connecting";
}

function getGeneratedAtPlaceholder(
  status: "connecting" | "live" | "offline",
): string {
  if (status === "offline") return "Diagnostics endpoint unavailable";
  return "Waiting for server data";
}

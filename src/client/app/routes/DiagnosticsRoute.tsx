import { DiagnosticsRoomCard } from "../diagnostics/DiagnosticsRoomCard.tsx";
import { DiagnosticsSummary } from "../diagnostics/DiagnosticsSummary.tsx";
import { useDiagnostics } from "../diagnostics/use-diagnostics.ts";
import { useDocumentTitle } from "../use-document-title.ts";

export function DiagnosticsRoute(): React.JSX.Element {
  const diagnostics = useDiagnostics();
  const rooms = diagnostics.data?.rooms ?? [];
  useDocumentTitle("Diagnostics - Multiplayer");

  return (
    <div className="diagnostics-page">
      <header className="diagnostics-page-header">
        <div>
          <p className="diagnostics-eyebrow">Developer diagnostics</p>
          <h1>Room Performance</h1>
        </div>
        <div className="diagnostics-refresh-status">
          <span className={`diagnostics-state-pill ${diagnostics.status}`}>
            {getConnectionStatusLabel(diagnostics.status)}
          </span>
          <span>
            {diagnostics.lastUpdatedAt
              ? `Updated ${diagnostics.lastUpdatedAt.toLocaleTimeString()}`
              : "Never updated"}
          </span>
        </div>
      </header>

      <main className="diagnostics-main">
        <DiagnosticsSummary rooms={rooms} />

        <section
          className="diagnostics-room-section"
          aria-labelledby="rooms-title"
        >
          <div className="diagnostics-section-heading">
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
              <div className="diagnostics-room-grid">
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
              <div className="diagnostics-empty-state">
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

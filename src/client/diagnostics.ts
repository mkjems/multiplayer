interface TickDurationMetrics {
  lastMilliseconds: number;
  averageMilliseconds: number;
  maxMilliseconds: number;
}

interface NetworkMetrics {
  lastGameStateBytes: number;
  totalGameStateBytes: number;
  lastGameStateRecipientCount: number;
  skippedGameStateCount: number;
  lastMaxBufferedBytes: number;
  maxBufferedBytes: number;
}

interface RoomDiagnostics {
  id: string;
  name: string;
  active: boolean;
  playerCount: number;
  socketCount: number;
  bulletCount: number;
  rockCount: number;
  cactusCount: number;
  tickCount: number;
  tickDurationMilliseconds: TickDurationMetrics;
  network: NetworkMetrics;
}

interface DiagnosticsResponse {
  generatedAt: string;
  rooms: RoomDiagnostics[];
}

const REFRESH_INTERVAL_MILLISECONDS = 2000;
const TICK_BUDGET_MILLISECONDS = 50;
const PAYLOAD_REFERENCE_BYTES = 8000;
const BUFFER_REFERENCE_BYTES = 256 * 1024;
const SKIPPED_REFERENCE_COUNT = 25;

const roomsElement = requireElement("rooms");
const generatedAtElement = requireElement("generated-at");
const lastUpdatedElement = requireElement("last-updated");
const connectionStateElement = requireElement("connection-state");
const summaryRoomsElement = requireElement("summary-rooms");
const summaryActiveElement = requireElement("summary-active");
const summaryPlayersElement = requireElement("summary-players");
const summarySkippedElement = requireElement("summary-skipped");

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing required element: #${id}`);
  return element;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(Math.round(value));
}

function formatMilliseconds(value: number): string {
  return `${value.toFixed(2)} ms`;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${formatNumber(value)} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function percentOf(value: number, reference: number): number {
  return Math.max(0, Math.min(100, (value / reference) * 100));
}

function barColor(percent: number): string {
  if (percent >= 80) return "var(--color-bad)";
  if (percent >= 55) return "var(--color-warn)";
  return "var(--color-good)";
}

function setConnectionState(
  text: string,
  stateClass: "ok" | "error" | "",
): void {
  connectionStateElement.textContent = text;
  connectionStateElement.className = stateClass
    ? `state-pill ${stateClass}`
    : "state-pill";
}

async function fetchDiagnostics(): Promise<DiagnosticsResponse> {
  const response = await fetch("/api/diagnostics/rooms", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Diagnostics request failed: ${response.status}`);
  }
  return await response.json() as DiagnosticsResponse;
}

function renderSummary(rooms: RoomDiagnostics[]): void {
  const activeRooms = rooms.filter((room) => room.active).length;
  const playerCount = rooms.reduce((sum, room) => sum + room.playerCount, 0);
  const skippedSnapshots = rooms.reduce(
    (sum, room) => sum + room.network.skippedGameStateCount,
    0,
  );

  summaryRoomsElement.textContent = formatNumber(rooms.length);
  summaryActiveElement.textContent = formatNumber(activeRooms);
  summaryPlayersElement.textContent = formatNumber(playerCount);
  summarySkippedElement.textContent = formatNumber(skippedSnapshots);
}

function renderMetric(label: string, value: string): string {
  return `
    <div class="metric">
      <span class="metric-label">${label}</span>
      <span class="metric-value">${value}</span>
    </div>
  `;
}

function renderBar(label: string, value: string, percent: number): string {
  const boundedPercent = Math.round(percentOf(percent, 100));
  return `
    <div class="bar-row">
      <span>${label}</span>
      <div class="bar-track" aria-hidden="true">
        <div
          class="bar-fill"
          style="--bar-percent: ${boundedPercent}%; --bar-color: ${
    barColor(boundedPercent)
  }"
        ></div>
      </div>
      <strong>${value}</strong>
    </div>
  `;
}

function renderRoom(room: RoomDiagnostics): string {
  const averageTickMilliseconds =
    room.tickDurationMilliseconds.averageMilliseconds;
  const tickPercent = percentOf(averageTickMilliseconds, TICK_BUDGET_MILLISECONDS);
  const payloadPercent = percentOf(
    room.network.lastGameStateBytes,
    PAYLOAD_REFERENCE_BYTES,
  );
  const bufferedPercent = percentOf(
    room.network.lastMaxBufferedBytes,
    BUFFER_REFERENCE_BYTES,
  );
  const skippedPercent = percentOf(
    room.network.skippedGameStateCount,
    SKIPPED_REFERENCE_COUNT,
  );
  const activeClass = room.active ? "active" : "";
  const statusText = room.active ? "Active" : "Idle";

  return `
    <article class="room-card ${activeClass}">
      <div class="room-header">
        <div>
          <h3 class="room-name">${escapeHtml(room.name)}</h3>
          <p class="room-id">${escapeHtml(room.id)}</p>
        </div>
        <span class="room-status ${activeClass}">${statusText}</span>
      </div>
      <div class="metric-grid">
        ${renderMetric("Players", formatNumber(room.playerCount))}
        ${renderMetric("Sockets", formatNumber(room.socketCount))}
        ${renderMetric("Bullets", formatNumber(room.bulletCount))}
        ${renderMetric("Ticks", formatNumber(room.tickCount))}
        ${renderMetric("Rocks", formatNumber(room.rockCount))}
        ${renderMetric("Cacti", formatNumber(room.cactusCount))}
      </div>
      <div class="bar-list">
        ${
    renderBar(
      "Average tick",
      formatMilliseconds(averageTickMilliseconds),
      tickPercent,
    )
  }
        ${
    renderBar(
      "Payload",
      formatBytes(room.network.lastGameStateBytes),
      payloadPercent,
    )
  }
        ${
    renderBar(
      "Buffered",
      formatBytes(room.network.lastMaxBufferedBytes),
      bufferedPercent,
    )
  }
        ${
    renderBar(
      "Skipped",
      formatNumber(room.network.skippedGameStateCount),
      skippedPercent,
    )
  }
      </div>
    </article>
  `;
}

function renderDiagnostics(data: DiagnosticsResponse): void {
  renderSummary(data.rooms);
  generatedAtElement.textContent = `Server sample: ${
    new Date(data.generatedAt).toLocaleTimeString()
  }`;
  lastUpdatedElement.textContent = `Updated ${
    new Date().toLocaleTimeString()
  }`;

  if (data.rooms.length === 0) {
    roomsElement.innerHTML = '<div class="empty-state">No rooms found.</div>';
    return;
  }

  roomsElement.innerHTML = data.rooms.map(renderRoom).join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function refreshDiagnostics(): Promise<void> {
  try {
    const data = await fetchDiagnostics();
    renderDiagnostics(data);
    setConnectionState("Live", "ok");
  } catch {
    setConnectionState("Offline", "error");
    generatedAtElement.textContent = "Diagnostics endpoint unavailable";
  }
}

refreshDiagnostics();
setInterval(() => {
  void refreshDiagnostics();
}, REFRESH_INTERVAL_MILLISECONDS);

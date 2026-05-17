import type {
  DiagnosticsResponse,
  RoomDiagnostics,
} from "../shared/diagnostics";

interface RoomHistorySample {
  sampledAtMilliseconds: number;
  averageTickMilliseconds: number;
  payloadBytes: number;
  bufferedBytes: number;
  skippedSnapshots: number;
  playerCount: number;
  bulletCount: number;
}

interface GraphSeries {
  label: string;
  formattedValue: string;
  values: number[];
  referenceValue: number;
}

const REFRESH_INTERVAL_MILLISECONDS = 2000;
const HISTORY_WINDOW_MILLISECONDS = 60 * 60 * 1000;
const TICK_BUDGET_MILLISECONDS = 50;
const PAYLOAD_REFERENCE_BYTES = 8000;
const BUFFER_REFERENCE_BYTES = 256 * 1024;
const SKIPPED_REFERENCE_COUNT = 25;
const ENTITY_REFERENCE_COUNT = 20;
const SPARKLINE_WIDTH = 220;
const SPARKLINE_HEIGHT = 52;

const roomsElement = requireElement("rooms");
const generatedAtElement = requireElement("generated-at");
const lastUpdatedElement = requireElement("last-updated");
const connectionStateElement = requireElement("connection-state");
const summaryRoomsElement = requireElement("summary-rooms");
const summaryActiveElement = requireElement("summary-active");
const summaryPlayersElement = requireElement("summary-players");
const summarySkippedElement = requireElement("summary-skipped");
const roomHistoryById = new Map<string, RoomHistorySample[]>();

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

function updateHistory(data: DiagnosticsResponse): void {
  const sampledAtMilliseconds = new Date(data.generatedAt).getTime();
  const minimumSampleTime = sampledAtMilliseconds - HISTORY_WINDOW_MILLISECONDS;
  const activeRoomIds = new Set(data.rooms.map((room) => room.id));

  for (const room of data.rooms) {
    const samples = roomHistoryById.get(room.id) ?? [];
    samples.push({
      sampledAtMilliseconds,
      averageTickMilliseconds:
        room.tickDurationMilliseconds.averageMilliseconds,
      payloadBytes: room.network.lastGameStateBytes,
      bufferedBytes: room.network.lastMaxBufferedBytes,
      skippedSnapshots: room.network.skippedGameStateCount,
      playerCount: room.playerCount,
      bulletCount: room.bulletCount,
    });
    while (
      samples.length > 0 &&
      samples[0].sampledAtMilliseconds < minimumSampleTime
    ) {
      samples.shift();
    }
    roomHistoryById.set(room.id, samples);
  }

  for (const roomId of roomHistoryById.keys()) {
    if (!activeRoomIds.has(roomId)) roomHistoryById.delete(roomId);
  }
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

function createSparklinePoints(values: number[], referenceValue: number): string {
  if (values.length === 0) return "";
  if (values.length === 1) {
    const y = SPARKLINE_HEIGHT -
      percentOf(values[0], referenceValue) / 100 * SPARKLINE_HEIGHT;
    return `0,${y.toFixed(2)} ${SPARKLINE_WIDTH},${y.toFixed(2)}`;
  }

  return values.map((value, index) => {
    const x = (index / (values.length - 1)) * SPARKLINE_WIDTH;
    const y = SPARKLINE_HEIGHT -
      percentOf(value, referenceValue) / 100 * SPARKLINE_HEIGHT;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function renderGraph(series: GraphSeries): string {
  const points = createSparklinePoints(series.values, series.referenceValue);
  return `
    <div class="graph-panel">
      <div class="graph-heading">
        <span>${series.label}</span>
        <strong>${series.formattedValue}</strong>
      </div>
      <svg
        class="sparkline"
        viewBox="0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}"
        role="img"
        aria-label="${series.label} trend"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1="${SPARKLINE_HEIGHT - 1}"
          x2="${SPARKLINE_WIDTH}"
          y2="${SPARKLINE_HEIGHT - 1}"
          class="sparkline-baseline"
        ></line>
        <polyline points="${points}" class="sparkline-line"></polyline>
      </svg>
    </div>
  `;
}

function getRoomGraphSeries(
  room: RoomDiagnostics,
  history: RoomHistorySample[],
): GraphSeries[] {
  return [
    {
      label: "Average tick",
      formattedValue: formatMilliseconds(
        room.tickDurationMilliseconds.averageMilliseconds,
      ),
      values: history.map((sample) => sample.averageTickMilliseconds),
      referenceValue: TICK_BUDGET_MILLISECONDS,
    },
    {
      label: "Payload",
      formattedValue: formatBytes(room.network.lastGameStateBytes),
      values: history.map((sample) => sample.payloadBytes),
      referenceValue: PAYLOAD_REFERENCE_BYTES,
    },
    {
      label: "Buffered",
      formattedValue: formatBytes(room.network.lastMaxBufferedBytes),
      values: history.map((sample) => sample.bufferedBytes),
      referenceValue: BUFFER_REFERENCE_BYTES,
    },
    {
      label: "Skipped",
      formattedValue: formatNumber(room.network.skippedGameStateCount),
      values: history.map((sample) => sample.skippedSnapshots),
      referenceValue: SKIPPED_REFERENCE_COUNT,
    },
    {
      label: "Players",
      formattedValue: formatNumber(room.playerCount),
      values: history.map((sample) => sample.playerCount),
      referenceValue: ENTITY_REFERENCE_COUNT,
    },
    {
      label: "Bullets",
      formattedValue: formatNumber(room.bulletCount),
      values: history.map((sample) => sample.bulletCount),
      referenceValue: ENTITY_REFERENCE_COUNT,
    },
  ];
}

function renderGraphs(room: RoomDiagnostics): string {
  const history = roomHistoryById.get(room.id) ?? [];
  const sampleText = history.length === 1 ? "1 sample" : `${history.length} samples`;
  return `
    <div class="graph-section">
      <div class="graph-section-heading">
        <span>One-hour local history</span>
        <span>${sampleText}</span>
      </div>
      <div class="graph-grid">
        ${
    getRoomGraphSeries(room, history)
      .map(renderGraph)
      .join("")
  }
      </div>
    </div>
  `;
}

function renderRoom(room: RoomDiagnostics): string {
  const averageTickMilliseconds =
    room.tickDurationMilliseconds.averageMilliseconds;
  const tickPercent = percentOf(
    averageTickMilliseconds,
    TICK_BUDGET_MILLISECONDS,
  );
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
      ${renderGraphs(room)}
    </article>
  `;
}

function renderDiagnostics(data: DiagnosticsResponse): void {
  updateHistory(data);
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

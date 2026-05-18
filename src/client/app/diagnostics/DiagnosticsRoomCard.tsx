import type { RoomDiagnostics } from "../../../shared/diagnostics.ts";
import {
  formatBytes,
  formatMilliseconds,
  formatNumber,
  getBarColor,
  percentOf,
} from "./diagnostics-format.ts";
import type { RoomHistorySample } from "./diagnostics-history.ts";
import { SparkLine } from "./SparkLine.tsx";

const tickBudgetMilliseconds = 50;
const payloadReferenceBytes = 8000;
const bufferReferenceBytes = 256 * 1024;
const skippedReferenceCount = 25;
const entityReferenceCount = 20;

interface DiagnosticsRoomCardProps {
  room: RoomDiagnostics;
  history: RoomHistorySample[];
}

interface MetricProps {
  label: string;
  value: string;
}

interface BarMetricProps {
  label: string;
  value: string;
  percent: number;
}

interface GraphSeries {
  label: string;
  formattedValue: string;
  values: number[];
  referenceValue: number;
}

export function DiagnosticsRoomCard(
  { room, history }: DiagnosticsRoomCardProps,
): React.JSX.Element {
  const averageTickMilliseconds =
    room.tickDurationMilliseconds.averageMilliseconds;
  const activeClassName = room.active
    ? "diagnostics-room-card active"
    : "diagnostics-room-card";
  const roomStatusClassName = room.active
    ? "diagnostics-room-status active"
    : "diagnostics-room-status";

  return (
    <article className={activeClassName}>
      <div className="diagnostics-room-header">
        <div>
          <h3 className="diagnostics-room-name">{room.name}</h3>
          <p className="diagnostics-room-id">{room.id}</p>
        </div>
        <span className={roomStatusClassName}>
          {room.active ? "Active" : "Idle"}
        </span>
      </div>

      <div className="diagnostics-metric-grid">
        <Metric label="Players" value={formatNumber(room.playerCount)} />
        <Metric label="Sockets" value={formatNumber(room.socketCount)} />
        <Metric label="Bullets" value={formatNumber(room.bulletCount)} />
        <Metric label="Ticks" value={formatNumber(room.tickCount)} />
        <Metric label="Rocks" value={formatNumber(room.rockCount)} />
        <Metric label="Cacti" value={formatNumber(room.cactusCount)} />
      </div>

      <div className="diagnostics-bar-list">
        <BarMetric
          label="Average tick"
          value={formatMilliseconds(averageTickMilliseconds)}
          percent={percentOf(averageTickMilliseconds, tickBudgetMilliseconds)}
        />
        <BarMetric
          label="Payload"
          value={formatBytes(room.network.lastGameStateBytes)}
          percent={percentOf(
            room.network.lastGameStateBytes,
            payloadReferenceBytes,
          )}
        />
        <BarMetric
          label="Buffered"
          value={formatBytes(room.network.lastMaxBufferedBytes)}
          percent={percentOf(
            room.network.lastMaxBufferedBytes,
            bufferReferenceBytes,
          )}
        />
        <BarMetric
          label="Skipped"
          value={formatNumber(room.network.skippedGameStateCount)}
          percent={percentOf(
            room.network.skippedGameStateCount,
            skippedReferenceCount,
          )}
        />
      </div>

      <Graphs room={room} history={history} />
    </article>
  );
}

function Metric({ label, value }: MetricProps): React.JSX.Element {
  return (
    <div className="diagnostics-metric">
      <span className="diagnostics-metric-label">{label}</span>
      <span className="diagnostics-metric-value">{value}</span>
    </div>
  );
}

function BarMetric(
  { label, value, percent }: BarMetricProps,
): React.JSX.Element {
  const boundedPercent = Math.round(percentOf(percent, 100));

  return (
    <div className="diagnostics-bar-row">
      <span>{label}</span>
      <div className="diagnostics-bar-track" aria-hidden="true">
        <div
          className="diagnostics-bar-fill"
          style={{
            "--bar-percent": `${boundedPercent}%`,
            "--bar-color": getBarColor(boundedPercent),
          } as React.CSSProperties}
        >
        </div>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function Graphs(
  { room, history }: DiagnosticsRoomCardProps,
): React.JSX.Element {
  const sampleText = history.length === 1
    ? "1 sample"
    : `${history.length} samples`;

  return (
    <div className="diagnostics-graph-section">
      <div className="diagnostics-graph-section-heading">
        <span>One-hour local history</span>
        <span>{sampleText}</span>
      </div>
      <div className="diagnostics-graph-grid">
        {getRoomGraphSeries(room, history).map((series) => (
          <GraphPanel series={series} key={series.label} />
        ))}
      </div>
    </div>
  );
}

function GraphPanel({ series }: { series: GraphSeries }): React.JSX.Element {
  return (
    <div className="diagnostics-graph-panel">
      <div className="diagnostics-graph-heading">
        <span>{series.label}</span>
        <strong>{series.formattedValue}</strong>
      </div>
      <SparkLine
        label={series.label}
        values={series.values}
        referenceValue={series.referenceValue}
      />
    </div>
  );
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
      referenceValue: tickBudgetMilliseconds,
    },
    {
      label: "Payload",
      formattedValue: formatBytes(room.network.lastGameStateBytes),
      values: history.map((sample) => sample.payloadBytes),
      referenceValue: payloadReferenceBytes,
    },
    {
      label: "Buffered",
      formattedValue: formatBytes(room.network.lastMaxBufferedBytes),
      values: history.map((sample) => sample.bufferedBytes),
      referenceValue: bufferReferenceBytes,
    },
    {
      label: "Skipped",
      formattedValue: formatNumber(room.network.skippedGameStateCount),
      values: history.map((sample) => sample.skippedSnapshots),
      referenceValue: skippedReferenceCount,
    },
    {
      label: "Players",
      formattedValue: formatNumber(room.playerCount),
      values: history.map((sample) => sample.playerCount),
      referenceValue: entityReferenceCount,
    },
    {
      label: "Bullets",
      formattedValue: formatNumber(room.bulletCount),
      values: history.map((sample) => sample.bulletCount),
      referenceValue: entityReferenceCount,
    },
  ];
}

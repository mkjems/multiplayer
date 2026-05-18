import { useEffect, useState } from "react";
import type { DiagnosticsResponse } from "../../../shared/diagnostics.ts";
import {
  type RoomHistoryById,
  updateDiagnosticsHistory,
} from "./diagnostics-history.ts";

const refreshIntervalMilliseconds = 2000;

export type DiagnosticsConnectionStatus =
  | "connecting"
  | "live"
  | "offline";

export interface DiagnosticsState {
  status: DiagnosticsConnectionStatus;
  data: DiagnosticsResponse | null;
  historyByRoomId: RoomHistoryById;
  lastUpdatedAt: Date | null;
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

export function useDiagnostics(): DiagnosticsState {
  const [diagnosticsState, setDiagnosticsState] = useState<DiagnosticsState>({
    status: "connecting",
    data: null,
    historyByRoomId: new Map(),
    lastUpdatedAt: null,
  });

  useEffect(() => {
    let isDisposed = false;

    async function refreshDiagnostics(): Promise<void> {
      try {
        const data = await fetchDiagnostics();
        if (isDisposed) return;

        setDiagnosticsState((currentState) => ({
          status: "live",
          data,
          historyByRoomId: updateDiagnosticsHistory(
            currentState.historyByRoomId,
            data,
          ),
          lastUpdatedAt: new Date(),
        }));
      } catch {
        if (isDisposed) return;

        setDiagnosticsState((currentState) => ({
          ...currentState,
          status: "offline",
        }));
      }
    }

    void refreshDiagnostics();
    const interval = globalThis.setInterval(() => {
      void refreshDiagnostics();
    }, refreshIntervalMilliseconds);

    return () => {
      isDisposed = true;
      globalThis.clearInterval(interval);
    };
  }, []);

  return diagnosticsState;
}

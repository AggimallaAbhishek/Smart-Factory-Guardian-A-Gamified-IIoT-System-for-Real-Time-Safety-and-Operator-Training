import { useEffect, useMemo, useRef, useState } from "react";
import type { AlertType, SourceType } from "@guardian/protocol";
import { DEFAULT_BRIDGE_PORT } from "../../lib/constants";
import {
  connectBridge,
  startMock,
  type HardwareController,
  type HardwareStatus
} from "../../features/hardware/hardwareService";

interface HardwarePanelProps {
  roomRunning: boolean;
  onAlert: (alertType: AlertType, source: "bridge" | "mock", timestampMs: number) => Promise<void>;
}

export function HardwarePanel({ roomRunning, onAlert }: HardwarePanelProps) {
  const [mode, setMode] = useState<"bridge" | "mock">("mock");
  const [bridgeToken, setBridgeToken] = useState("test-token");
  const [bridgePort, setBridgePort] = useState(DEFAULT_BRIDGE_PORT);
  const [bridgeSource, setBridgeSource] = useState<SourceType>("serial");
  const [serialPath, setSerialPath] = useState("");
  const [status, setStatus] = useState<HardwareStatus>({
    connected: false,
    message: "Hardware idle",
    mode: "mock"
  });

  const controllerRef = useRef<HardwareController | null>(null);

  useEffect(() => {
    if (roomRunning) {
      return;
    }

    controllerRef.current?.stop();
    controllerRef.current = null;
    setStatus((previous) => ({
      ...previous,
      connected: false,
      message: "Hardware paused while room is not running"
    }));
  }, [roomRunning]);

  useEffect(() => {
    return () => {
      controllerRef.current?.stop();
      controllerRef.current = null;
    };
  }, []);

  const running = Boolean(controllerRef.current && status.connected);

  const canStart = useMemo(() => {
    if (!roomRunning) {
      return false;
    }

    if (mode === "mock") {
      return true;
    }

    if (bridgeToken.trim().length < 8) {
      return false;
    }

    if (bridgeSource === "serial" && serialPath.trim().length === 0) {
      return false;
    }

    return true;
  }, [bridgeSource, bridgeToken, mode, roomRunning, serialPath]);

  const stopHardware = () => {
    controllerRef.current?.stop();
    controllerRef.current = null;
  };

  const startHardware = () => {
    stopHardware();

    if (mode === "mock") {
      controllerRef.current = startMock(
        {
          minIntervalMs: 2_000,
          maxIntervalMs: 3_000
        },
        {
          onAlert: (alertType, timestampMs) => {
            void onAlert(alertType, "mock", timestampMs);
          },
          onStatus: (nextStatus) => {
            setStatus(nextStatus);
          }
        }
      );
      return;
    }

    controllerRef.current = connectBridge(
      {
        token: bridgeToken.trim(),
        port: bridgePort,
        source: bridgeSource,
        serialPath: bridgeSource === "serial" ? serialPath.trim() : undefined
      },
      {
        onAlert: (alertType, timestampMs) => {
          void onAlert(alertType, "bridge", timestampMs);
        },
        onStatus: (nextStatus) => {
          setStatus(nextStatus);
        }
      }
    );
  };

  return (
    <section className="rounded-xl border border-factory-line bg-factory-panel p-4" data-testid="hardware-panel">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-factory-muted">Hardware Gateway</h2>
        <span className={status.connected ? "text-xs text-factory-neonGreen" : "text-xs text-factory-muted"}>
          {status.connected ? "Live" : "Idle"}
        </span>
      </header>

      <p className="mb-3 text-xs text-factory-muted" data-testid="hardware-status-message">
        {status.message}
      </p>

      <label className="mb-2 block text-xs text-factory-muted">
        Mode
        <select
          className="mt-1 w-full rounded-lg border border-factory-line bg-factory-panelSoft px-3 py-2 text-sm text-factory-text"
          value={mode}
          onChange={(event) => setMode(event.target.value as "bridge" | "mock")}
          data-testid="hardware-mode"
        >
          <option value="mock">Mock (2-3 sec)</option>
          <option value="bridge">Bridge (HC-05 via local WS)</option>
        </select>
      </label>

      {mode === "bridge" ? (
        <div className="space-y-2">
          <label className="block text-xs text-factory-muted">
            Bridge Token
            <input
              data-testid="hardware-token"
              className="mt-1 w-full rounded-lg border border-factory-line bg-factory-panelSoft px-3 py-2 text-sm text-factory-text"
              value={bridgeToken}
              onChange={(event) => setBridgeToken(event.target.value)}
              placeholder="Bridge token"
            />
          </label>

          <label className="block text-xs text-factory-muted">
            Bridge Port
            <input
              data-testid="hardware-port"
              className="mt-1 w-full rounded-lg border border-factory-line bg-factory-panelSoft px-3 py-2 text-sm text-factory-text"
              type="number"
              value={bridgePort}
              onChange={(event) => setBridgePort(Number(event.target.value) || DEFAULT_BRIDGE_PORT)}
            />
          </label>

          <label className="block text-xs text-factory-muted">
            Bridge Source
            <select
              data-testid="hardware-bridge-source"
              className="mt-1 w-full rounded-lg border border-factory-line bg-factory-panelSoft px-3 py-2 text-sm text-factory-text"
              value={bridgeSource}
              onChange={(event) => setBridgeSource(event.target.value as SourceType)}
            >
              <option value="serial">Serial (HC-05)</option>
              <option value="simulator">Bridge Simulator</option>
            </select>
          </label>

          {bridgeSource === "serial" ? (
            <label className="block text-xs text-factory-muted">
              Serial Path
              <input
                data-testid="hardware-serial-path"
                className="mt-1 w-full rounded-lg border border-factory-line bg-factory-panelSoft px-3 py-2 text-sm text-factory-text"
                value={serialPath}
                onChange={(event) => setSerialPath(event.target.value)}
                placeholder="/dev/tty.HC-05-DevB"
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="rounded-lg border border-factory-neonCyan/70 bg-factory-neonCyan/15 px-3 py-2 text-sm font-semibold text-factory-neonCyan disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canStart || running}
          onClick={startHardware}
          data-testid="hardware-start"
        >
          Start Source
        </button>

        <button
          type="button"
          className="rounded-lg border border-factory-line bg-factory-panelSoft px-3 py-2 text-sm font-semibold text-factory-text disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!running}
          onClick={stopHardware}
          data-testid="hardware-stop"
        >
          Stop Source
        </button>
      </div>
    </section>
  );
}

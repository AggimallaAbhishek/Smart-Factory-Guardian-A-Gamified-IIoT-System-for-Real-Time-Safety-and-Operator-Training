import { useEffect, useRef, useState } from "react";
import type { AlertType } from "@guardian/protocol";
import { startMock, type HardwareController, type HardwareStatus } from "../../features/hardware/hardwareService";
import { logger } from "../../lib/logger";
import { TechActionButton } from "../ui/TechActionButton";
import { TechPanel } from "../ui/TechPanel";

interface HardwarePanelProps {
  roomRunning: boolean;
  onAlert: (alertType: AlertType, source: "bridge" | "mock", timestampMs: number) => Promise<void>;
}

export function HardwarePanel({ roomRunning, onAlert }: HardwarePanelProps) {
  const [status, setStatus] = useState<HardwareStatus>({
    connected: false,
    message: "Mock signal source idle",
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
      message: "Source paused while room is not running"
    }));
  }, [roomRunning]);

  useEffect(() => {
    return () => {
      controllerRef.current?.stop();
      controllerRef.current = null;
    };
  }, []);

  const running = Boolean(controllerRef.current && status.connected);

  const stopHardware = () => {
    logger.info("Stopping mock signal source");
    controllerRef.current?.stop();
    controllerRef.current = null;
  };

  const startHardware = () => {
    stopHardware();
    logger.info("Starting mock signal source", {
      minIntervalMs: 2_000,
      maxIntervalMs: 3_000
    });

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
  };

  return (
    <TechPanel data-testid="hardware-panel">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-white/55">Signal Source</h2>
        <span className={status.connected ? "font-mono text-xs text-tech-green" : "font-mono text-xs text-white/60"}>
          {status.connected ? "Live" : "Idle"}
        </span>
      </header>

      <p className="text-xs text-white/70" data-testid="hardware-status-message">
        {status.message}
      </p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
        Mock cadence: random every 2-3 sec. Alert lasts 6 sec before auto-miss.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <TechActionButton
          tone="blue"
          disabled={!roomRunning || running}
          onClick={startHardware}
          data-testid="hardware-start"
        >
          Start Mock Source
        </TechActionButton>

        <TechActionButton tone="neutral" disabled={!running} onClick={stopHardware} data-testid="hardware-stop">
          Stop Source
        </TechActionButton>
      </div>
    </TechPanel>
  );
}

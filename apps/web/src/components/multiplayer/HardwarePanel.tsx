import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { AlertType } from "@guardian/protocol";
import { connectBridge, startMock, type HardwareController, type HardwareStatus } from "../../features/hardware/hardwareService";
import { logger } from "../../lib/logger";
import { TechActionButton } from "../ui/TechActionButton";
import { TechPanel } from "../ui/TechPanel";

interface HardwarePanelProps {
  roomRunning: boolean;
  onAlert: (alertType: AlertType, source: "bridge" | "mock", timestampMs: number) => Promise<void>;
}

export interface HardwarePanelRef {
  triggerAlert: (alertType: AlertType) => void;
}

export const HardwarePanel = forwardRef<HardwarePanelRef, HardwarePanelProps>(
  ({ roomRunning, onAlert }, ref) => {
  const [status, setStatus] = useState<HardwareStatus>({
    connected: false,
    message: "Hardware source idle",
    mode: "mock"
  });

  const [mode, setMode] = useState<"mock" | "arduino">("mock");
  const controllerRef = useRef<HardwareController | null>(null);

  useImperativeHandle(ref, () => ({
    triggerAlert: (alertType: AlertType) => {
      if (controllerRef.current) {
        controllerRef.current.triggerAlert(alertType);
      } else {
        logger.warn("Cannot trigger alert - no hardware controller active", { alertType });
      }
    }
  }), []);

  // Start hardware when room starts, stop when it ends
  useEffect(() => {
    if (roomRunning) {
      startHardwareInternal();
    } else {
      controllerRef.current?.stop();
      controllerRef.current = null;
      setStatus((previous) => ({
        ...previous,
        connected: false,
        message: "Source paused while room is not running"
      }));
    }
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

  const startHardwareInternal = () => {
    if (controllerRef.current) {
      controllerRef.current.stop();
    }
    
    if (mode === "arduino") {
      logger.info("Starting Arduino bridge connection");
      controllerRef.current = connectBridge(
        {
          token: "arduino-bridge",
          port: 8787,
          source: "serial"
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
    } else {
      // Arduino-matching intervals: 1200-2500ms gap between alerts
      logger.info("Starting mock signal source (Arduino-style)", {
        minIntervalMs: 1_200,
        maxIntervalMs: 2_500
      });

      controllerRef.current = startMock(
        {
          minIntervalMs: 1_200,
          maxIntervalMs: 2_500
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
    }
  };

  const startHardware = () => {
    stopHardware();
    startHardwareInternal();
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
        {mode === "arduino" ? "Real Arduino Hardware (via Bridge Service)" : "Arduino-style: Gas 40%, Temp 40%, Maint 20%. Interval 1.2-2.5s."}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setMode("mock")}
          className={`px-3 py-1 text-xs font-mono rounded ${
            mode === "mock" 
              ? "bg-tech-blue text-white" 
              : "bg-white/10 text-white/60 hover:text-white"
          }`}
          disabled={running}
        >
          Mock
        </button>
        <button
          onClick={() => setMode("arduino")}
          className={`px-3 py-1 text-xs font-mono rounded ${
            mode === "arduino" 
              ? "bg-tech-blue text-white" 
              : "bg-white/10 text-white/60 hover:text-white"
          }`}
          disabled={running}
        >
          Arduino
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <TechActionButton
          tone="blue"
          disabled={!roomRunning || running}
          onClick={startHardware}
          data-testid="hardware-start"
        >
          Start {mode === "arduino" ? "Arduino" : "Mock Source"}
        </TechActionButton>

        <TechActionButton tone="neutral" disabled={!running} onClick={stopHardware} data-testid="hardware-stop">
          Stop Source
        </TechActionButton>
      </div>

      {status.lastError && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded">
          <p className="text-xs text-red-300">{status.lastError}</p>
        </div>
      )}
    </TechPanel>
  );
});

HardwarePanel.displayName = "HardwarePanel";

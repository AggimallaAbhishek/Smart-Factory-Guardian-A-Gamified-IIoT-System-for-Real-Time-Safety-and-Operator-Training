import { TechActionButton } from "../ui/TechActionButton";
import { TechPanel } from "../ui/TechPanel";

interface HostControlsProps {
  roomStatus: "lobby" | "running" | "ended";
  disabled?: boolean;
  onStart: () => void;
  onForceNext: () => void;
  onEnd: () => void;
}

export function HostControls({ roomStatus, disabled, onStart, onForceNext, onEnd }: HostControlsProps) {
  return (
    <TechPanel data-testid="host-controls">
      <h2 className="mb-3 text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-white/55">Host Controls</h2>
      <div className="flex flex-wrap gap-2">
        <TechActionButton
          tone="green"
          disabled={disabled || roomStatus !== "lobby"}
          onClick={onStart}
          data-testid="host-start"
        >
          Start Room
        </TechActionButton>
        <TechActionButton
          tone="orange"
          disabled={disabled || roomStatus !== "running"}
          onClick={onForceNext}
          data-testid="host-force-next"
        >
          Force Next
        </TechActionButton>
        <TechActionButton
          tone="red"
          disabled={disabled || roomStatus === "ended"}
          onClick={onEnd}
          data-testid="host-end"
        >
          End Room
        </TechActionButton>
      </div>
    </TechPanel>
  );
}

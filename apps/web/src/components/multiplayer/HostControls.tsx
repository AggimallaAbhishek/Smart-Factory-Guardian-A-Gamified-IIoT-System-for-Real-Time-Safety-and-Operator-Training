interface HostControlsProps {
  roomStatus: "lobby" | "running" | "ended";
  disabled?: boolean;
  onStart: () => void;
  onForceNext: () => void;
  onEnd: () => void;
}

function ControlButton(props: {
  label: string;
  testId: string;
  disabled?: boolean;
  onClick: () => void;
  tone?: "primary" | "danger" | "neutral";
}) {
  const toneClass =
    props.tone === "danger"
      ? "border-red-500/70 bg-red-500/15 text-red-200"
      : props.tone === "neutral"
        ? "border-factory-line bg-factory-panelSoft text-factory-text"
        : "border-factory-neonCyan/70 bg-factory-neonCyan/15 text-factory-neonCyan";

  return (
    <button
      type="button"
      className={
        "rounded-lg border px-3 py-2 text-sm font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 " +
        toneClass
      }
      data-testid={props.testId}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}

export function HostControls({ roomStatus, disabled, onStart, onForceNext, onEnd }: HostControlsProps) {
  return (
    <section className="rounded-xl border border-factory-line bg-factory-panel p-4" data-testid="host-controls">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-factory-muted">Host Controls</h2>
      <div className="flex flex-wrap gap-2">
        <ControlButton
          label="Start Room"
          testId="host-start"
          disabled={disabled || roomStatus !== "lobby"}
          onClick={onStart}
          tone="primary"
        />
        <ControlButton
          label="Force Next"
          testId="host-force-next"
          disabled={disabled || roomStatus !== "running"}
          onClick={onForceNext}
          tone="neutral"
        />
        <ControlButton
          label="End Room"
          testId="host-end"
          disabled={disabled || roomStatus === "ended"}
          onClick={onEnd}
          tone="danger"
        />
      </div>
    </section>
  );
}

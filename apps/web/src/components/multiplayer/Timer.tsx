import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { TechPanel } from "../ui/TechPanel";

interface TimerProps {
  turnEndsAtMs: number | null;
}

export function Timer({ turnEndsAtMs }: TimerProps) {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 120);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const remainingMs = useMemo(() => {
    if (!turnEndsAtMs) {
      return 0;
    }

    return Math.max(0, turnEndsAtMs - nowMs);
  }, [turnEndsAtMs, nowMs]);

  const remainingSec = Math.ceil(remainingMs / 1000);
  const urgent = remainingSec <= 10;

  return (
    <TechPanel
      aria-label="Turn timer"
      data-testid="timer-panel"
      className={urgent ? "border-tech-red/75 bg-tech-red/10" : undefined}
    >
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/55">Turn Timer</p>
      <p
        data-testid="timer-value"
        className={clsx(
          "mt-1 font-mono text-4xl font-bold tabular-nums tracking-[0.08em]",
          urgent ? "animate-timerUrgent" : "text-white"
        )}
      >
        {String(Math.floor(remainingSec / 60)).padStart(2, "0")}:{String(remainingSec % 60).padStart(2, "0")}
      </p>
    </TechPanel>
  );
}

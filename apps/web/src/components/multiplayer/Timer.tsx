import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";

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
    <section
      className="rounded-xl border border-factory-line bg-factory-panelSoft p-4"
      aria-label="Turn timer"
      data-testid="timer-panel"
    >
      <p className="text-xs uppercase tracking-[0.18em] text-factory-muted">Turn Timer</p>
      <p
        data-testid="timer-value"
        className={clsx("mt-1 text-3xl font-bold tabular-nums sm:text-4xl", urgent ? "animate-timerUrgent" : "text-factory-text")}
      >
        {String(Math.floor(remainingSec / 60)).padStart(2, "0")}:{String(remainingSec % 60).padStart(2, "0")}
      </p>
    </section>
  );
}

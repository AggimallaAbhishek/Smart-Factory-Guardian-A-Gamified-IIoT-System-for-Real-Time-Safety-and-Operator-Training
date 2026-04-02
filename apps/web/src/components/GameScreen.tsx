import type { AlertType } from "@guardian/protocol";
import { formatDurationSec } from "../lib/format";

interface GameScreenProps {
  score: number;
  remainingSec: number;
  activeAlert: AlertType | null;
  onRespond: (alertType: AlertType) => void;
  onStop: () => void;
}

const ALERTS: Array<{ key: AlertType; label: string }> = [
  { key: "gas", label: "Gas Leak" },
  { key: "temperature", label: "Temperature" },
  { key: "maintenance", label: "Maintenance" }
];

export function GameScreen(props: GameScreenProps) {
  return (
    <section className="card card-game">
      <header className="game-header">
        <div>
          <p className="label">Timer</p>
          <p className="value" data-testid="timer-value">
            {formatDurationSec(props.remainingSec)}
          </p>
        </div>

        <div>
          <p className="label">Score</p>
          <p className="value" data-testid="score-value">
            {props.score}
          </p>
        </div>
      </header>

      <div className="alert-panel" data-testid="active-alert-panel">
        <p className="label">Current Alert</p>
        <p className="value">
          {props.activeAlert ? props.activeAlert.toUpperCase() : "Waiting for signal"}
        </p>
      </div>

      <div className="alert-grid">
        {ALERTS.map((item) => (
          <button
            key={item.key}
            className={props.activeAlert === item.key ? "alert-button active" : "alert-button"}
            data-testid={`alert-${item.key}`}
            onClick={() => props.onRespond(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <button className="secondary" onClick={props.onStop}>
        Stop Session
      </button>
    </section>
  );
}

import type { PlayerSession } from "@guardian/protocol";
import { formatDate, formatMsAsSeconds } from "../lib/format";

interface ResultScreenProps {
  current: PlayerSession;
  history: PlayerSession[];
  onPlayAgain: () => void;
  onExportCsv: () => void;
}

export function ResultScreen(props: ResultScreenProps) {
  return (
    <section className="card card-results">
      <h2>Session Result</h2>

      <div className="result-grid">
        <article>
          <p className="label">Total Score</p>
          <p className="value" data-testid="result-score">
            {props.current.score}
          </p>
        </article>

        <article>
          <p className="label">Accuracy</p>
          <p className="value" data-testid="result-accuracy">
            {props.current.accuracy.toFixed(2)}%
          </p>
        </article>

        <article>
          <p className="label">Average Response</p>
          <p className="value" data-testid="result-avg-response">
            {formatMsAsSeconds(props.current.avgResponseMs)}
          </p>
        </article>
      </div>

      <p className="muted">Session ended: {formatDate(props.current.endedAtMs)}</p>

      <div className="actions-row">
        <button className="primary" onClick={props.onPlayAgain}>
          Play Again
        </button>
        <button className="secondary" data-testid="export-csv" onClick={props.onExportCsv}>
          Export CSV
        </button>
      </div>

      <h3>Recent Sessions</h3>
      <div className="history-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Score</th>
              <th>Accuracy</th>
              <th>Avg Response</th>
              <th>Ended At</th>
            </tr>
          </thead>
          <tbody>
            {props.history.map((session) => (
              <tr key={session.id}>
                <td>{session.name}</td>
                <td>{session.score}</td>
                <td>{session.accuracy.toFixed(2)}%</td>
                <td>{formatMsAsSeconds(session.avgResponseMs)}</td>
                <td>{formatDate(session.endedAtMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

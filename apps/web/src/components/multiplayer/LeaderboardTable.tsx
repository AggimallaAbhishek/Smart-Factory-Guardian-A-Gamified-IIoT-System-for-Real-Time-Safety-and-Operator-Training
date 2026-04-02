import type { LeaderboardEntry } from "../../features/rooms/types";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

function formatMs(value: number) {
  if (value <= 0) {
    return "-";
  }

  return (value / 1000).toFixed(3) + " sec";
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-factory-line bg-factory-panel" data-testid="leaderboard-table">
      <header className="border-b border-factory-line px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-factory-muted">Leaderboard</h2>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-factory-muted">
            <tr>
              <th className="px-4 py-2">Rank</th>
              <th className="px-4 py-2">Player</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">Avg Response</th>
              <th className="px-4 py-2">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr className="border-t border-factory-line" key={entry.uid}>
                <td className="px-4 py-2 font-semibold text-factory-neonCyan">#{entry.rank}</td>
                <td className="px-4 py-2 text-factory-text">{entry.displayName}</td>
                <td className="px-4 py-2 text-factory-neonGreen">{entry.totalScore}</td>
                <td className="px-4 py-2 text-factory-neonOrange">{formatMs(entry.avgResponseMs)}</td>
                <td className="px-4 py-2 text-factory-text">{entry.accuracy.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

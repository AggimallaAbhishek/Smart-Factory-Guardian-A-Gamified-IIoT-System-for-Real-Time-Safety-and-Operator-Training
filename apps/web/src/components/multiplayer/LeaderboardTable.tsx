import type { LeaderboardEntry } from "../../features/rooms/types";
import { TechPanel } from "../ui/TechPanel";

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
    <TechPanel className="overflow-hidden p-0" data-testid="leaderboard-table">
      <header className="border-b border-white/10 px-4 py-3">
        <h2 className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-white/55">Leaderboard</h2>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/50">
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
              <tr className="border-t border-white/10" key={entry.uid}>
                <td className="px-4 py-2 font-semibold text-tech-blue">#{entry.rank}</td>
                <td className="px-4 py-2 text-white">{entry.displayName}</td>
                <td className="px-4 py-2 text-tech-green">{entry.totalScore}</td>
                <td className="px-4 py-2 text-tech-orange">{formatMs(entry.avgResponseMs)}</td>
                <td className="px-4 py-2 text-white">{entry.accuracy.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TechPanel>
  );
}

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LeaderboardTable } from "../components/multiplayer/LeaderboardTable";
import { useRoomContext } from "../features/rooms/RoomContext";

function formatMs(value: number) {
  if (value <= 0) {
    return "-";
  }

  return (value / 1000).toFixed(3) + " sec";
}

export function ResultPage() {
  const room = useRoomContext();

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="grid gap-3"
    >
      <section className="rounded-xl border border-factory-line bg-factory-panel p-4">
        <h1 className="text-xl font-bold text-factory-text">Room Ended</h1>
        <p className="mt-1 text-sm text-factory-muted">Final cumulative room performance.</p>

        {room.myPlayer ? (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <article className="rounded-lg border border-factory-line bg-factory-panelSoft p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-factory-muted">Score</p>
              <p className="mt-1 text-2xl font-semibold text-factory-neonGreen">{room.myPlayer.totalScore}</p>
            </article>
            <article className="rounded-lg border border-factory-line bg-factory-panelSoft p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-factory-muted">Accuracy</p>
              <p className="mt-1 text-2xl font-semibold text-factory-neonCyan">{room.myPlayer.accuracy.toFixed(1)}%</p>
            </article>
            <article className="rounded-lg border border-factory-line bg-factory-panelSoft p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-factory-muted">Avg Response</p>
              <p className="mt-1 text-lg font-semibold text-factory-neonOrange">{formatMs(room.myPlayer.avgResponseMs)}</p>
            </article>
            <article className="rounded-lg border border-factory-line bg-factory-panelSoft p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-factory-muted">Turns</p>
              <p className="mt-1 text-2xl font-semibold text-factory-text">{room.myPlayer.turnsPlayed}</p>
            </article>
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <Link
            to="/"
            className="rounded-lg border border-factory-neonCyan/70 bg-factory-neonCyan/15 px-4 py-2 text-sm font-semibold text-factory-neonCyan"
          >
            Back Home
          </Link>
        </div>
      </section>

      <LeaderboardTable entries={room.leaderboard} />
    </motion.section>
  );
}

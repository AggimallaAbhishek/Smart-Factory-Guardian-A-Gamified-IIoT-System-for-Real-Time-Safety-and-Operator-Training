import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LeaderboardTable } from "../components/multiplayer/LeaderboardTable";
import { TechActionButton } from "../components/ui/TechActionButton";
import { TechPanel } from "../components/ui/TechPanel";
import { TechStatCard } from "../components/ui/TechStatCard";
import { useRoomContext } from "../features/rooms/RoomContext";

function formatMs(value: number) {
  if (value <= 0) {
    return "-";
  }

  return (value / 1000).toFixed(3) + "s";
}

export function ResultPage() {
  const room = useRoomContext();

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="grid gap-3"
    >
      <TechPanel>
        <h1 className="text-3xl font-bold uppercase tracking-[0.2em] text-white">Result</h1>
        <p className="mt-1 text-sm text-white/75">Final room leaderboard and operator performance stats.</p>

        {room.myPlayer ? (
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            <TechStatCard label="Score" value={room.myPlayer.totalScore} color="green" />
            <TechStatCard label="Accuracy" value={`${room.myPlayer.accuracy.toFixed(1)}%`} color="blue" />
            <TechStatCard label="Avg Response" value={formatMs(room.myPlayer.avgResponseMs)} color="orange" />
            <TechStatCard label="Turns Played" value={room.myPlayer.turnsPlayed} color="white" />
          </div>
        ) : null}

        <div className="mt-4">
          <Link to="/">
            <TechActionButton tone="blue" className="w-full sm:w-auto">
              Return Home
            </TechActionButton>
          </Link>
        </div>
      </TechPanel>

      <LeaderboardTable entries={room.leaderboard} />
    </motion.section>
  );
}
